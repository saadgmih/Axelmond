import express from "express";
import { Prisma, type LiveSession } from "@prisma/client";
import { RoomServiceClient } from "livekit-server-sdk";
import { Course, DEFAULT_STUDENT_LABEL } from "../types";
import { UserRole, canAccessAcademicProfile, normalizeRole } from "../rbac";
import { verifyAuthToken } from "../auth-token";
import { buildLiveKitRoomName } from "../livekit";
import {
  EMAIL_VERIFICATION_TTL_MINUTES,
  generateEmailVerificationCode,
  hashEmailVerificationCode,
  buildEmailVerificationExpiry,
  isDevVerificationCodeLogEnabled,
  maskEmailForDevLog,
} from "../email-verification";
import { sendVerificationEmail, getEmailErrorDetails, getSmtpPublicConfig } from "../email";
import { prisma } from "../db";
import { decodeStoredText, decodeStoredValue } from "../text";
import { APP_USER_BILLING_INCLUDE, mergeUserInvoices } from "../course-payments";
import { resolveCourseModules } from "../course-syllabus-modules";
import { LIVE_ACCESS_ERRORS } from "../public-api-errors";
import { logEmail, logLiveKit } from "./route-loggers";
import type { AppUser } from "./route-types";

// ─── Database-backed User Store ──────────────────────────────────────────────


export function toDomain(domain: any) {
  return {
    id: domain.id,
    name: domain.name,
    slug: domain.slug,
    iconName: domain.iconName,
    color: domain.color,
    description: domain.description,
    order: domain.order,
    courseCount: domain.courseCount,
    disciplines: Array.isArray(domain.disciplines) ? domain.disciplines.map(toDiscipline) : [],
  };
}

export function toDiscipline(discipline: any) {
  return {
    id: discipline.id,
    domainId: discipline.domainId,
    name: decodeStoredText(discipline.name),
    slug: discipline.slug,
    order: discipline.order,
    courseCount: discipline.courseCount,
    domain: discipline.domain
      ? {
          id: discipline.domain.id,
          name: decodeStoredText(discipline.domain.name),
          slug: discipline.domain.slug,
          iconName: discipline.domain.iconName,
          color: discipline.domain.color,
          description: decodeStoredText(discipline.domain.description),
          order: discipline.domain.order,
        }
      : undefined,
  };
}

export const activeLiveSessionInclude = {
  where: { isActive: true, endTime: null },
  orderBy: { startTime: "asc" },
  take: 1,
} as const;

export const courseResponseInclude = {
  discipline: { include: { domain: true } },
  liveSessions: activeLiveSessionInclude,
  courseModules: { orderBy: { sortOrder: "asc" as const } },
} as const;

export function getLiveStartedAt(course: any) {
  if (!course.isLiveNow) return null;
  const session = Array.isArray(course.liveSessions) ? course.liveSessions[0] : null;
  return session?.startTime ? new Date(session.startTime).toISOString() : null;
}

export function applyModuleProgressForStudent(course: Course, completedModuleIds: Set<number>): Course {
  if (completedModuleIds.size === 0) return course;
  const modules = course.modules.map((module) => ({
    ...module,
    completed: Boolean(module.completed || completedModuleIds.has(Number(module.id))),
  }));
  const totalCount = modules.length;
  const completedCount = modules.filter((module) => module.completed).length;
  return {
    ...course,
    modules,
    progress: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
  };
}

export function toCourse(course: any, completedModuleIds?: Set<number>): Course {
  const serialized: Course = {
    id: course.id,
    title: decodeStoredText(course.title),
    level: decodeStoredText(course.level),
    credits: course.credits,
    duration: decodeStoredText(course.duration),
    category: decodeStoredText(course.category),
    disciplineId: course.disciplineId,
    discipline: course.discipline ? toDiscipline(course.discipline) : undefined,
    price: course.price,
    iconName: course.iconName,
    color: course.color,
    instructor: decodeStoredText(course.instructor),
    description: decodeStoredText(course.description),
    progress: course.progress,
    isLiveNow: course.isLiveNow,
    liveSubject: course.liveSubject ? decodeStoredText(course.liveSubject) : undefined,
    liveStartedAt: getLiveStartedAt(course),
    modules: resolveCourseModules({
      modules: Array.isArray(course.modules) ? decodeStoredValue(course.modules) : course.modules,
      courseModules: course.courseModules,
    }),
    published: course.published,
    createdById: course.createdById || undefined,
  };
  return completedModuleIds ? applyModuleProgressForStudent(serialized, completedModuleIds) : serialized;
}

export async function getStudentCompletedModuleIds(userId: string, courseId: number): Promise<Set<number>> {
  const rows = await prisma.moduleProgress.findMany({
    where: { userId, courseId },
    select: { moduleId: true },
  });
  return new Set(rows.map((row) => row.moduleId));
}

export async function getStudentCompletedModuleIdsByCourseIds(
  userId: string,
  courseIds: number[],
): Promise<Map<number, Set<number>>> {
  const uniqueCourseIds = [...new Set(courseIds)];
  if (uniqueCourseIds.length === 0) return new Map();

  const rows = await prisma.moduleProgress.findMany({
    where: { userId, courseId: { in: uniqueCourseIds } },
    select: { courseId: true, moduleId: true },
  });

  const byCourse = new Map<number, Set<number>>();
  for (const courseId of uniqueCourseIds) {
    byCourse.set(courseId, new Set());
  }
  for (const row of rows) {
    byCourse.get(row.courseId)!.add(row.moduleId);
  }
  return byCourse;
}

export async function toCourseForUser(
  course: any,
  authUser: AppUser,
  completedModuleIds?: Set<number>,
): Promise<Course> {
  if (authUser.role !== "STUDENT") return toCourse(course);
  const moduleIds = completedModuleIds ?? (await getStudentCompletedModuleIds(authUser.id, course.id));
  return toCourse(course, moduleIds);
}

export function toAttachment(attachment: any) {
  return {
    id: attachment.id,
    type: attachment.type,
    fileName: attachment.fileName,
    fileKey: attachment.fileKey,
    url: attachment.url,
    mimeType: attachment.mimeType || undefined,
    size: attachment.size,
  };
}

export function toLessonContent(content: any) {
  return {
    id: content.id,
    courseId: content.courseId,
    sectionId: content.sectionId || undefined,
    type: content.type,
    title: content.title,
    body: content.body || undefined,
    published: content.published,
    attachments: Array.isArray(content.attachments) ? content.attachments.map(toAttachment) : [],
  };
}

export function buildContentTree(sections: any[]) {
  const nodes = sections.map((section) => ({
    id: section.id,
    courseId: section.courseId,
    chapterId: section.chapterId || undefined,
    parentId: section.parentId || undefined,
    title: section.title,
    description: section.description || undefined,
    order: section.order,
    published: section.published,
    contents: Array.isArray(section.contents) ? section.contents.map(toLessonContent) : [],
    children: [] as any[],
  }));
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const roots: any[] = [];

  nodes.forEach((node) => {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortNode = (node: any) => {
    node.children.sort((a: any, b: any) => a.order - b.order || a.title.localeCompare(b.title));
    node.contents.sort((a: any, b: any) => a.title.localeCompare(b.title));
    node.children.forEach(sortNode);
  };

  roots.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
  roots.forEach(sortNode);
  return roots;
}

export async function getCourseContentTree(courseId: number, includeDrafts: boolean) {
  const sections = await prisma.contentSection.findMany({
    where: {
      courseId,
      ...(includeDrafts ? {} : { published: true }),
    },
    include: {
      contents: {
        where: includeDrafts ? {} : { published: true },
        include: { attachments: true },
      },
    },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  return buildContentTree(sections);
}

export async function getOptionalAuthUser(req: express.Request) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const session = verifyAuthToken(token);
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: APP_USER_BILLING_INCLUDE,
  });
  const actualRole = normalizeRole(user?.role);
  if (!user || actualRole !== session.role) return null;
  if (!user.emailVerified) return null;
  return toAppUser(user);
}

export function collectDescendantSectionIds(
  rootId: string,
  sections: Array<{ id: string; parentId: string | null }>,
): string[] {
  const childrenByParent = new Map<string, string[]>();
  for (const section of sections) {
    if (!section.parentId) continue;
    const siblings = childrenByParent.get(section.parentId) ?? [];
    siblings.push(section.id);
    childrenByParent.set(section.parentId, siblings);
  }

  const ids = [rootId];
  const queue = [rootId];
  while (queue.length > 0) {
    const parentId = queue.shift()!;
    const children = childrenByParent.get(parentId) ?? [];
    ids.push(...children);
    queue.push(...children);
  }
  return ids;
}

export async function getSectionAndDescendantIds(client: typeof prisma = prisma, sectionId: string) {
  const root = await client.contentSection.findUnique({
    where: { id: sectionId },
    select: { id: true, courseId: true },
  });
  if (!root) return [sectionId];

  const sections = await client.contentSection.findMany({
    where: { courseId: root.courseId },
    select: { id: true, parentId: true },
  });
  return collectDescendantSectionIds(sectionId, sections);
}

export async function deleteContentSectionTree(tx: any, sectionId: string) {
  const sectionIds = await getSectionAndDescendantIds(tx, sectionId);
  const contents = await tx.lessonContent.findMany({
    where: { sectionId: { in: sectionIds } },
    select: { id: true },
  });
  const contentIds = contents.map((content: any) => content.id);

  let fileKeys: string[] = [];
  if (contentIds.length > 0) {
    const attachments = await tx.attachment.findMany({
      where: { contentId: { in: contentIds } },
      select: { fileKey: true },
    });
    fileKeys = attachments.map((a: any) => a.fileKey);
    await tx.attachment.deleteMany({ where: { contentId: { in: contentIds } } });
    await tx.lessonContent.deleteMany({ where: { id: { in: contentIds } } });
  }
  await tx.contentSection.deleteMany({ where: { id: { in: sectionIds } } });
  return { sectionCount: sectionIds.length, contentCount: contentIds.length, fileKeys };
}


export function toAppUser(user: any): AppUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    emailVerified: Boolean(user.emailVerified),
    levelOrTitle: user.levelOrTitle || (user.role === "STUDENT" ? DEFAULT_STUDENT_LABEL : "Enseignant Docteur"),
    filiere: user.filiere || undefined,
    avatarUrl: user.avatarUrl || undefined,
    enrolledCourses: Array.isArray(user.enrollments)
      ? user.enrollments.filter((enrollment: any) => enrollment.active).map((enrollment: any) => enrollment.courseId)
      : [],
    invoices: mergeUserInvoices(user),
  };
}

export async function ensureAcademicProfileForUser(
  client: any,
  user: { id: string; role: UserRole; levelOrTitle?: string | null },
) {
  if (!canAccessAcademicProfile(user.role)) return null;
  return client.academicProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      title: user.levelOrTitle || "Enseignant Chercheur",
      teachingDomains: [],
      researchDomains: [],
      links: {},
    },
  });
}

export function toAcademicProfile(profile: any) {
  return {
    id: profile.id,
    userId: profile.userId,
    title: profile.title || "",
    department: profile.department || "",
    lab: profile.lab || "",
    speciality: profile.speciality || "",
    teachingDomains: Array.isArray(profile.teachingDomains) ? profile.teachingDomains : [],
    researchDomains: Array.isArray(profile.researchDomains) ? profile.researchDomains : [],
    bio: profile.bio || "",
    avatarUrl: profile.avatarUrl || "",
    links: profile.links && typeof profile.links === "object" ? profile.links : {},
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

export async function getAcademicProfileResponse(authUser: AppUser) {
  const dbUser = await prisma.user.findUnique({
    where: { id: authUser.id },
    include: { academicProfile: true },
  });
  if (!dbUser) return null;
  const profile = dbUser.academicProfile || (await ensureAcademicProfileForUser(prisma, dbUser));
  const [courses, lives, publishedContentsCount] = await Promise.all([
    prisma.course.findMany({
      where: {
        OR: [{ createdById: authUser.id }, { instructor: dbUser.fullName }],
      },
      select: { id: true, title: true, published: true, liveSubject: true },
      orderBy: { id: "asc" },
    }),
    prisma.liveSession.findMany({
      where: { professorId: authUser.id },
      select: {
        id: true,
        roomName: true,
        courseId: true,
        isActive: true,
        startTime: true,
        endTime: true,
        course: { select: { title: true } },
      },
      orderBy: { startTime: "desc" },
      take: 12,
    }),
    prisma.lessonContent.count({
      where: { createdById: authUser.id, published: true },
    }),
  ]);
  return {
    user: {
      id: dbUser.id,
      fullName: dbUser.fullName,
      email: dbUser.email,
      role: dbUser.role,
    },
    profile: toAcademicProfile(profile),
    courses,
    lives: lives.map((live) => ({
      id: live.id,
      roomName: live.roomName,
      courseId: live.courseId,
      active: live.isActive,
      startedAt: live.startTime,
      endedAt: live.endTime,
      course: live.course,
    })),
    publishedContentsCount,
  };
}

export function getEmailDomain(email: string) {
  return email.includes("@") ? (email.split("@").pop() ?? "unknown") : "unknown";
}

export async function createEmailVerificationCode(
  client: any,
  userId: string,
  code: string,
  purpose: "EMAIL_VERIFY" | "PASSWORD_RESET" = "EMAIL_VERIFY",
) {
  await client.emailVerificationCode.updateMany({
    where: { userId, purpose, usedAt: null },
    data: { usedAt: new Date() },
  });
  return client.emailVerificationCode.create({
    data: {
      userId,
      codeHash: hashEmailVerificationCode(code),
      expiresAt: buildEmailVerificationExpiry(),
      purpose,
    },
  });
}

export async function recordEmailDeliveryLog(purpose: string, userId: string | null, recipient: string, delivery: any) {
  try {
    await prisma.emailDeliveryLog.create({
      data: {
        userId,
        purpose,
        recipientDomain: getEmailDomain(recipient),
        smtp: (delivery.smtp || getSmtpPublicConfig()) as Prisma.InputJsonValue,
        messageId: delivery.messageId,
        accepted: (delivery.accepted || []) as Prisma.InputJsonValue,
        rejected: (delivery.rejected || []) as Prisma.InputJsonValue,
        envelope: delivery.envelope as Prisma.InputJsonValue,
        response: delivery.response,
        providerStatus: delivery.providerStatus || "UNKNOWN",
      },
    });
  } catch (err) {
    logEmail("WARN", "Email delivery log persistence failed", {
      purpose,
      userId,
      recipientDomain: getEmailDomain(recipient),
      error: getEmailErrorDetails(err),
    });
  }
}

export function buildFailedEmailDelivery(recipient: string, response: unknown) {
  return {
    smtp: getSmtpPublicConfig(),
    messageId: null,
    accepted: [],
    rejected: [recipient],
    envelope: {
      from: process.env.SMTP_USER || null,
      to: [recipient],
    },
    response: typeof response === "string" ? response : JSON.stringify(response),
    providerStatus: "FAILED",
  };
}

export async function sendEmailVerificationCode(user: { id: string; email: string; fullName: string }) {
  const code = generateEmailVerificationCode();
  if (isDevVerificationCodeLogEnabled()) {
    console.log(`[DEV] Code de vérification envoyé à ${maskEmailForDevLog(user.email)} (userId=${user.id})`);
  }
  await createEmailVerificationCode(prisma, user.id, code);
  try {
    const delivery = await sendVerificationEmail({
      to: user.email,
      fullName: user.fullName,
      code,
      expiresInMinutes: EMAIL_VERIFICATION_TTL_MINUTES,
    });
    logEmail(
      delivery.sent ? "INFO" : "WARN",
      delivery.sent ? "Verification email sent" : "SMTP not configured for verification email",
      {
        userId: user.id,
        emailDomain: getEmailDomain(user.email),
        delivery: delivery.sent ? delivery.delivery : undefined,
      },
    );
    if (!delivery.sent) {
      await recordEmailDeliveryLog(
        "email_verification",
        user.id,
        user.email,
        buildFailedEmailDelivery(user.email, delivery.reason),
      );
    }
    if (delivery.sent) {
      await recordEmailDeliveryLog("email_verification", user.id, user.email, delivery.delivery);
    }
    return delivery;
  } catch (err) {
    logEmail("ERROR", "Verification email send failed", {
      userId: user.id,
      emailDomain: getEmailDomain(user.email),
      smtp: getSmtpPublicConfig(),
      error: getEmailErrorDetails(err),
    });
    await recordEmailDeliveryLog(
      "email_verification",
      user.id,
      user.email,
      buildFailedEmailDelivery(user.email, getEmailErrorDetails(err)),
    );
    return { sent: false, reason: "SMTP_SEND_FAILED" as const };
  }
}

export function professorInviteSnapshot(invite: any) {
  return {
    code: invite.code,
    createdAt: invite.createdAt?.toISOString?.() || invite.createdAt,
    usedBy: invite.usedBy?.email,
    usedAt: invite.usedAt?.toISOString?.() || invite.usedAt,
    revokedAt: invite.revokedAt?.toISOString?.() || invite.revokedAt,
  };
}

export function emailDeliveryLogSnapshot(log: any) {
  const envelope = log.envelope || {};
  return {
    id: log.id,
    purpose: log.purpose,
    to: Array.isArray(envelope.to) ? envelope.to : log.accepted,
    envelopeFrom: envelope.from || null,
    envelopeTo: envelope.to || null,
    messageId: log.messageId,
    accepted: log.accepted,
    rejected: log.rejected,
    response: log.response,
    providerStatus: log.providerStatus,
    createdAt: log.createdAt?.toISOString?.() || log.createdAt,
  };
}

export async function findCourse(courseId: number) {
  const course = await prisma.course.findUnique({ where: { id: courseId }, include: courseResponseInclude });
  return course ? toCourse(course) : null;
}

export function canPublishLiveMedia(role: AppUser["role"]): boolean {
  return role !== "STUDENT";
}

export type LiveSessionResolveResult =
  | { ok: true; session: LiveSession }
  | { ok: false; status: number; error: string };

export async function ensureLiveSession(course: Course, authUser: AppUser): Promise<LiveSessionResolveResult> {
  const roomName = buildLiveKitRoomName(course.id);

  if (!course.isLiveNow) {
    return { ok: false, status: 403, error: LIVE_ACCESS_ERRORS.sessionNotActive };
  }

  if (authUser.role === "STUDENT") {
    const session = await prisma.liveSession.findUnique({ where: { roomName } });
    if (!session?.isActive) {
      return { ok: false, status: 403, error: LIVE_ACCESS_ERRORS.sessionNotActive };
    }
    logLiveKit("INFO", "Live session joined", {
      courseId: course.id,
      roomName,
      userId: authUser.id,
      role: authUser.role,
    });
    return { ok: true, session };
  }

  const session = await prisma.liveSession.upsert({
    where: { roomName },
    update: {
      title: course.liveSubject || null,
      isActive: true,
      endTime: null,
      professorId: authUser.id,
    },
    create: {
      roomName,
      title: course.liveSubject || null,
      courseId: course.id,
      professorId: authUser.id,
    },
  });
  logLiveKit("INFO", "Live session ensured", {
    courseId: course.id,
    roomName,
    startedAt: session.startTime.toISOString(),
    isActive: session.isActive,
  });
  return { ok: true, session };
}

export function getLiveKitApiUrl(url: string) {
  return url
    .trim()
    .replace(/^wss:\/\//, "https://")
    .replace(/^ws:\/\//, "http://");
}

export function getLiveKitRoomService(config: { url: string; apiKey: string; apiSecret: string }) {
  return new RoomServiceClient(getLiveKitApiUrl(config.url), config.apiKey, config.apiSecret);
}

export async function recordLiveAction(params: {
  sessionId?: string | null;
  roomName: string;
  actor?: AppUser;
  action: string;
  targetIdentity?: string | null;
  targetName?: string | null;
  details?: Record<string, unknown>;
}) {
  await prisma.liveActionLog.create({
    data: {
      sessionId: params.sessionId || null,
      roomName: params.roomName,
      actorId: params.actor?.id || null,
      actorRole: params.actor?.role || null,
      action: params.action,
      targetIdentity: params.targetIdentity || null,
      targetName: params.targetName || null,
      details: (params.details || {}) as Prisma.InputJsonValue,
    },
  });
}

export async function recordLiveAttendanceJoin(session: { id: string; roomName: string }, authUser: AppUser) {
  const active = await prisma.liveAttendance.findFirst({
    where: { sessionId: session.id, userId: authUser.id, leftAt: null },
    orderBy: { joinedAt: "desc" },
  });
  if (active) {
    await prisma.liveAttendance.update({
      where: { id: active.id },
      data: { lastSeenAt: new Date(), role: authUser.role },
    });
    return active;
  }
  const attendance = await prisma.liveAttendance.create({
    data: {
      sessionId: session.id,
      roomName: session.roomName,
      userId: authUser.id,
      role: authUser.role,
    },
  });
  await recordLiveAction({ sessionId: session.id, roomName: session.roomName, actor: authUser, action: "JOIN" });
  logLiveKit("INFO", "Attendance join recorded", {
    roomName: session.roomName,
    userId: authUser.id,
    role: authUser.role,
  });
  return attendance;
}

export async function recordLiveAttendanceLeave(session: { id: string; roomName: string }, authUser: AppUser) {
  const active = await prisma.liveAttendance.findFirst({
    where: { sessionId: session.id, userId: authUser.id, leftAt: null },
    orderBy: { joinedAt: "desc" },
  });
  if (!active) return null;
  const leftAt = new Date();
  const durationSeconds = Math.max(0, Math.round((leftAt.getTime() - active.joinedAt.getTime()) / 1000));
  const updated = await prisma.liveAttendance.update({
    where: { id: active.id },
    data: { leftAt, lastSeenAt: leftAt, durationSeconds },
  });
  await recordLiveAction({
    sessionId: session.id,
    roomName: session.roomName,
    actor: authUser,
    action: "LEAVE",
    details: { durationSeconds },
  });
  logLiveKit("INFO", "Attendance leave recorded", { roomName: session.roomName, userId: authUser.id, durationSeconds });
  return updated;
}

export async function assertLiveAccess(authUser: AppUser, courseId: number) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, createdById: true },
  });
  if (!course) return { ok: false as const, status: 404, error: LIVE_ACCESS_ERRORS.notFound };
  if (authUser.role === "STUDENT" && !authUser.enrolledCourses.includes(course.id)) {
    return { ok: false as const, status: 403, error: LIVE_ACCESS_ERRORS.enrollmentRequired };
  }
  if ((authUser.role === "PROFESSOR" || authUser.role === "RESEARCHER") && course.createdById !== authUser.id) {
    logLiveKit("WARN", "Live access denied for foreign course", { userId: authUser.id, courseId });
    return { ok: false as const, status: 403, error: LIVE_ACCESS_ERRORS.accessDenied };
  }

  const fullCourse = await findCourse(courseId);
  if (!fullCourse) return { ok: false as const, status: 404, error: LIVE_ACCESS_ERRORS.notFound };
  return { ok: true as const, course: fullCourse };
}

export async function findQuizWithQuestions(courseId: number, moduleId: number) {
  return prisma.quiz.findFirst({
    where: { courseId, moduleId },
    include: { questions: { orderBy: { order: "asc" } } },
    orderBy: { createdAt: "asc" },
  });
}

export function canReadCourseGrades(authUser: AppUser, course: { id: number; createdById?: string | null }) {
  if (authUser.role === "ADMIN") return true;
  if (authUser.role === "STUDENT") return authUser.enrolledCourses.includes(course.id);
  // PROFESSOR/RESEARCHER : uniquement le propriétaire du module
  return course.createdById === authUser.id;
}


export async function persistUserAvatarUrl(authUser: AppUser, avatarUrl: string) {
  await prisma.user.update({
    where: { id: authUser.id },
    data: { avatarUrl },
  });

  if (canAccessAcademicProfile(authUser.role)) {
    await prisma.academicProfile.upsert({
      where: { userId: authUser.id },
      update: { avatarUrl },
      create: {
        userId: authUser.id,
        title: authUser.levelOrTitle,
        avatarUrl,
        teachingDomains: [],
        researchDomains: [],
        links: {},
      },
    });
  }
}

export const AUTH_MAX_ATTEMPTS = Number(process.env.AUTH_MAX_ATTEMPTS) || 20;
