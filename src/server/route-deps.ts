import express from "express";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import { Course, DEFAULT_MODULE_CLASSIFICATION, DEFAULT_STUDENT_LABEL } from "../types";
import { UserRole, canAccessAcademicProfile, canAccessApiRoute, normalizeRole } from "../rbac";
import { verifyAuthToken } from "../auth-token";
import { DEFAULT_LIVE_SUBJECT, buildLiveKitRoomName, getLiveKitConfig, getLiveKitParticipantIdentity } from "../livekit";
import { generateProfessorInviteCode, normalizeProfessorInviteCode, parseProfessorInviteCodes } from "../invitations";
import {
  EMAIL_VERIFICATION_TTL_MINUTES,
  generateEmailVerificationCode,
  hashEmailVerificationCode,
  buildEmailVerificationExpiry,
  canAttemptEmailVerification,
  isEmailVerificationExpired,
  normalizeEmailVerificationCode,
  EMAIL_VERIFICATION_MAX_ATTEMPTS,
} from "../email-verification";
import { sendVerificationEmail, getEmailErrorDetails, getSmtpPublicConfig } from "../email";
import { prisma } from "../db";
import { decodeStoredText, decodeStoredValue } from "../text";
import { logSecurity, logAudit } from "../security-logger";
import { cacheGet, cacheSet, cacheDel, cacheDelByPrefix } from "../cache";
import { deleteCloudFiles } from "../uploadthing";
import { notifyEnrolledStudentsForCourse } from "../notifications";
import { buildCourseGradeRows } from "../grades";
import { assertCourseLearningAccess } from "../course-access";
import { sanitizeAcademicProfileInput, sanitizeAvatarUrl, isAvatarUrlFieldInvalid } from "../academic-profile";
import { isAllowedAvatarUrl } from "../avatar-security";
import { CHAT_TUTOR_MAX_HISTORY_MESSAGES, CHAT_TUTOR_MAX_PROMPT_CHARS } from "../security-hardening";
import { APP_USER_BILLING_INCLUDE, buildCourseInvoiceId, mergeUserInvoices, persistCoursePaymentEnrollment } from "../course-payments";
import type { CoursePaymentEnrollmentInput } from "../course-payments";
import { LIVE_ACCESS_ERRORS } from "../public-api-errors";


export function logLiveKit(level: "INFO" | "WARN" | "ERROR", message: string, data?: unknown) {
  console.log(`[${new Date().toISOString()}] [${level}] [livekit] ${message}${data ? " " + JSON.stringify(data) : ""}`);
}

export function logInvitation(level: "INFO" | "WARN", message: string, data?: unknown) {
  console.log(`[${new Date().toISOString()}] [${level}] [invitation] ${message}${data ? " " + JSON.stringify(data) : ""}`);
}

export function logEmail(level: "INFO" | "WARN" | "ERROR", message: string, data?: unknown) {
  console.log(`[${new Date().toISOString()}] [${level}] [email] ${message}${data ? " " + JSON.stringify(data) : ""}`);
}

export function logDb(level: "INFO" | "WARN" | "ERROR", message: string, data?: unknown) {
  console.log(`[${new Date().toISOString()}] [${level}] [db] ${message}${data ? " " + JSON.stringify(data) : ""}`);
}

interface CachedUser {
  dbUser: any;
  expiresAt: number;
}
const authUserCache = new Map<string, CachedUser>();

export function invalidateAuthUserCache(userId: string) {
  if (authUserCache.delete(userId)) {
    logSecurity("INFO", "Auth user cache invalidated after enrollment update", { userId });
  }
}

export const requireAuth: express.RequestHandler = async (req, res, next) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const session = verifyAuthToken(token);
  if (!session) {
    logSecurity("WARN", "Missing or invalid token", { method: req.method, path: req.path });
    res.status(401).json({ error: "Authentification requise" });
    return;
  }

  const now = Date.now();
  let dbUser: any = null;
  const cached = authUserCache.get(session.userId);
  if (cached && cached.expiresAt > now) {
    dbUser = cached.dbUser;
  } else {
    try {
      dbUser = await prisma.user.findUnique({
        where: { id: session.userId },
        include: APP_USER_BILLING_INCLUDE,
      });
      if (dbUser) {
        authUserCache.set(session.userId, {
          dbUser,
          expiresAt: now + 15000, // cache for 15 seconds
        });
      }
    } catch (err) {
      logSecurity("WARN", "Auth database lookup failed", { userId: session.userId, error: String(err) });
      res.status(503).json({ error: "Base de données indisponible" });
      return;
    }
  }

  const actualRole = normalizeRole(dbUser?.role);
  if (!dbUser || actualRole !== session.role) {
    logSecurity("WARN", "Token user not found or role changed", { userId: session.userId, tokenRole: session.role, actualRole });
    res.status(401).json({ error: "Session invalide" });
    return;
  }
  if (!dbUser.emailVerified) {
    logSecurity("WARN", "Unverified email access denied", { userId: dbUser.id, method: req.method, path: req.path });
    res.status(403).json({ error: "Veuillez vérifier votre e-mail avant d'accéder à l'application", verificationRequired: true, email: dbUser.email });
    return;
  }

  (req as any).authUser = toAppUser(dbUser);
  next();
};

export const requireRbac: express.RequestHandler = (req, res, next) => {
  const user = (req as any).authUser as AppUser | undefined;
  if (!user || !canAccessApiRoute(user.role, req.method, req.path)) {
    logSecurity("WARN", "Access denied", { userId: user?.id, role: user?.role, method: req.method, path: req.path });
    res.status(403).json({ error: "Accès refusé pour ce rôle" });
    return;
  }

  logSecurity("INFO", "Access granted", { userId: user.id, role: user.role, method: req.method, path: req.path });
  next();
};

export const requireAdmin: express.RequestHandler = (req, res, next) => {
  const user = (req as any).authUser as AppUser | undefined;
  if (!user || user.role !== "ADMIN") {
    logSecurity("WARN", "Admin access denied", { userId: user?.id, role: user?.role, method: req.method, path: req.path });
    res.status(403).json({ error: "Accès administrateur requis" });
    return;
  }

  next();
};

// ─── Database-backed User Store ──────────────────────────────────────────────

export interface AppUser {
  id: string;
  email: string;
  password?: string;
  fullName: string;
  role: UserRole;
  emailVerified: boolean;
  levelOrTitle: string;
  filiere?: string;
  avatarUrl?: string;
  enrolledCourses: number[];
  invoices: { id: string; date: string; courseTitle: string; amount: number; status: string }[];
}

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
    domain: discipline.domain ? {
      id: discipline.domain.id,
      name: decodeStoredText(discipline.domain.name),
      slug: discipline.domain.slug,
      iconName: discipline.domain.iconName,
      color: discipline.domain.color,
      description: decodeStoredText(discipline.domain.description),
      order: discipline.domain.order,
    } : undefined,
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
    modules: Array.isArray(course.modules) ? decodeStoredValue(course.modules) : [],
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

export async function toCourseForUser(course: any, authUser: AppUser): Promise<Course> {
  if (authUser.role !== "STUDENT") return toCourse(course);
  const completedModuleIds = await getStudentCompletedModuleIds(authUser.id, course.id);
  return toCourse(course, completedModuleIds);
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

export async function getSectionAndDescendantIds(sectionId: string) {
  const ids = [sectionId];
  let queue = [sectionId];
  while (queue.length > 0) {
    const children = await prisma.contentSection.findMany({
      where: { parentId: { in: queue } },
      select: { id: true },
    });
    queue = children.map((child) => child.id);
    ids.push(...queue);
  }
  return ids;
}

export async function deleteContentSectionTree(tx: any, sectionId: string) {
  const sectionIds = await getSectionAndDescendantIds(sectionId);
  const contents = await tx.lessonContent.findMany({
    where: { sectionId: { in: sectionIds } },
    select: { id: true },
  });
  const contentIds = contents.map((content: any) => content.id);

  let fileKeys: string[] = [];
  if (contentIds.length > 0) {
    const attachments = await tx.attachment.findMany({
      where: { contentId: { in: contentIds } },
      select: { fileKey: true }
    });
    fileKeys = attachments.map((a: any) => a.fileKey);
    await tx.attachment.deleteMany({ where: { contentId: { in: contentIds } } });
    await tx.lessonContent.deleteMany({ where: { id: { in: contentIds } } });
  }
  await tx.contentSection.deleteMany({ where: { id: { in: sectionIds } } });
  return { sectionCount: sectionIds.length, contentCount: contentIds.length, fileKeys };
}

export function createDefaultStudentInvoices() {
  return [{
    id: buildCourseInvoiceId("REG"),
    date: new Date().toLocaleDateString("fr-FR"),
    courseTitle: "Algorithmique et Structures de Données",
    amount: 15.99,
    status: "Payé"
  }];
}

export async function persistCoursePaymentWithAudit(params: CoursePaymentEnrollmentInput) {
  return persistCoursePaymentEnrollment(params, {
    logAudit,
    invalidateAuthUserCache,
  });
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
    enrolledCourses: Array.isArray(user.enrollments) ? user.enrollments.filter((enrollment: any) => enrollment.active).map((enrollment: any) => enrollment.courseId) : [],
    invoices: mergeUserInvoices(user),
  };
}

export async function ensureAcademicProfileForUser(client: any, user: { id: string; role: UserRole; levelOrTitle?: string | null }) {
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
  const profile = dbUser.academicProfile || await ensureAcademicProfileForUser(prisma, dbUser);
  const [courses, lives, publishedContentsCount] = await Promise.all([
    prisma.course.findMany({
      where: {
        OR: [
          { createdById: authUser.id },
          { instructor: dbUser.fullName },
        ],
      },
      select: { id: true, title: true, published: true, liveSubject: true },
      orderBy: { id: "asc" },
    }),
    prisma.liveSession.findMany({
      where: { professorId: authUser.id },
      select: { id: true, roomName: true, courseId: true, isActive: true, startTime: true, endTime: true, course: { select: { title: true } } },
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
  return email.includes("@") ? email.split("@").pop() : "unknown";
}

export async function createEmailVerificationCode(client: any, userId: string, code: string) {
  await client.emailVerificationCode.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  });
  return client.emailVerificationCode.create({
    data: {
      userId,
      codeHash: hashEmailVerificationCode(code),
      expiresAt: buildEmailVerificationExpiry(),
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
  if (process.env.NODE_ENV !== "production") {
    console.log(`[DEV] Code de vérification pour ${user.email} : ${code}`);
  }
  await createEmailVerificationCode(prisma, user.id, code);
  try {
    const delivery = await sendVerificationEmail({
      to: user.email,
      fullName: user.fullName,
      code,
      expiresInMinutes: EMAIL_VERIFICATION_TTL_MINUTES,
    });
    logEmail(delivery.sent ? "INFO" : "WARN", delivery.sent ? "Verification email sent" : "SMTP not configured for verification email", {
      userId: user.id,
      emailDomain: getEmailDomain(user.email),
      delivery: delivery.sent ? delivery.delivery : undefined,
    });
    if (!delivery.sent) {
      await recordEmailDeliveryLog("email_verification", user.id, user.email, buildFailedEmailDelivery(user.email, delivery.reason));
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
    await recordEmailDeliveryLog("email_verification", user.id, user.email, buildFailedEmailDelivery(user.email, getEmailErrorDetails(err)));
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

export async function ensureLiveSession(course: Course, authUser: AppUser) {
  const roomName = buildLiveKitRoomName(course.id);
  const session = await prisma.liveSession.upsert({
    where: { roomName },
    update: {
      title: course.liveSubject || null,
      isActive: true,
      endTime: null,
      professorId: authUser.role === "STUDENT" ? undefined : authUser.id,
    },
    create: {
      roomName,
      title: course.liveSubject || null,
      courseId: course.id,
      professorId: authUser.role === "STUDENT" ? undefined : authUser.id,
    },
  });
  logLiveKit("INFO", "Live session ensured", { courseId: course.id, roomName, startedAt: session.startTime.toISOString(), isActive: session.isActive });
  return session;
}

export function getLiveKitApiUrl(url: string) {
  return url.trim().replace(/^wss:\/\//, "https://").replace(/^ws:\/\//, "http://");
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
  logLiveKit("INFO", "Attendance join recorded", { roomName: session.roomName, userId: authUser.id, role: authUser.role });
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
  await recordLiveAction({ sessionId: session.id, roomName: session.roomName, actor: authUser, action: "LEAVE", details: { durationSeconds } });
  logLiveKit("INFO", "Attendance leave recorded", { roomName: session.roomName, userId: authUser.id, durationSeconds });
  return updated;
}

export async function assertLiveAccess(authUser: AppUser, courseId: number) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, createdById: true }
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

// ─── Input Validation & Sanitization ─────────────────────────────────────────

export function sanitizeInputText(text: string): string {
  if (typeof text !== "string") return text;
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

export function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") return sanitizeInputText(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  if (typeof obj === "object") {
    const res: any = {};
    for (const key of Object.keys(obj)) {
      if (
        key === "password" ||
        key === "newPassword" ||
        key === "currentPassword" ||
        key === "answers" ||
        key === "token" ||
        key === "avatarUrl" ||
        key === "url"
      ) {
        res[key] = obj[key];
      } else {
        res[key] = sanitizeObject(obj[key]);
      }
    }
    return res;
  }
  return obj;
}

export function validateBody(schema: z.ZodType<any>) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    req.body = sanitizeObject(req.body);
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: "Données d'entrée invalides",
        details: result.error.issues.map(e => ({ field: e.path.join("."), message: e.message })),
        code: "VALIDATION_ERROR",
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

export const registerSchema = z.object({
  email: z.string().email("Adresse email invalide").trim().toLowerCase().max(255),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères").max(128),
  fullName: z.string().min(2, "Le nom complet doit contenir au moins 2 caractères").max(100).trim(),
  role: z.enum(["STUDENT", "PROFESSOR", "RESEARCHER", "ADMIN"]),
  levelOrTitle: z.string().max(100).trim().optional().nullable(),
  filiere: z.string().max(100).trim().optional().nullable(),
  professorInviteCode: z.string().max(50).trim().optional().nullable(),
});

export const loginSchema = z.object({
  email: z.string().email("Adresse email invalide").trim().toLowerCase(),
  password: z.string().min(1, "Mot de passe requis"),
  role: z.enum(["STUDENT", "PROFESSOR", "RESEARCHER", "ADMIN"]),
});

export const verifyEmailSchema = z.object({
  email: z.string().email("Adresse email invalide").trim().toLowerCase(),
  code: z.string().length(6, "Le code doit contenir 6 chiffres").regex(/^\d+$/, "Le code doit être numérique"),
});

export const resendEmailSchema = z.object({
  email: z.string().email("Adresse email invalide").trim().toLowerCase(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Adresse email invalide").trim().toLowerCase(),
});

export const resetPasswordSchema = z.object({
  email: z.string().email("Adresse email invalide").trim().toLowerCase(),
  code: z.string().length(6, "Le code doit contenir 6 chiffres").regex(/^\d+$/, "Le code doit être numérique"),
  newPassword: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
});

export const scheduleSessionSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  title: z.string().min(1, "Le titre est obligatoire").max(120).trim(),
  moduleName: z.string().min(1, "Le module est obligatoire").max(120).trim(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure de début invalide (HH:mm)"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure de fin invalide (HH:mm)"),
  sessionType: z.enum(["COURS", "TD", "TP", "LIVE", "EXAMEN"]).default("COURS"),
  roomOrLink: z.string().max(200).trim().optional().nullable(),
  description: z.string().max(500).trim().optional().nullable(),
});

export const studentStudyScheduleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  title: z.string().min(1, "Le titre est obligatoire").max(120).trim(),
  moduleName: z.string().min(1, "Le module est obligatoire").max(120).trim(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure de début invalide (HH:mm)"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure de fin invalide (HH:mm)"),
  sessionType: z.enum(["REVISION", "COURS", "TD", "TP", "LIVE", "DEVOIR", "EXAMEN"]).default("REVISION"),
  roomOrLink: z.string().max(200).trim().optional().nullable(),
  description: z.string().max(500).trim().optional().nullable(),
});

export const studentObjectiveSchema = z.object({
  title: z.string().min(1, "Le titre de l'objectif est obligatoire").max(160).trim(),
  description: z.string().max(800).trim().optional().nullable(),
  startAt: z.string().min(1, "Date de début obligatoire"),
  endAt: z.string().min(1, "Date de fin obligatoire"),
  status: z.enum(["IN_PROGRESS", "COMPLETED"]).optional(),
  objectiveType: z.enum(["CHAPITRE", "TD", "RESUME", "REVISION", "AUTRE"]).optional().nullable(),
  focusContentTitle: z.string().max(160).trim().optional().nullable(),
  focusContentUrl: z.string().max(500).trim().optional().nullable(),
  focusContentType: z.enum(["PODCAST", "VIDEO", "AUDIO_REMINDER", "EDUCATIONAL_RESOURCE", "OTHER"]).optional().nullable(),
  recurrence: z.enum(["NONE", "DAILY", "WEEKLY", "MONTHLY"]).optional().nullable(),
});

export const chatTutorSchema = z.object({
  courseId: z.number().int().positive(),
  moduleId: z.number().int().positive().optional(),
  prompt: z.string().min(1, "Question requise").max(CHAT_TUTOR_MAX_PROMPT_CHARS).trim(),
  chatHistory: z.array(z.object({
    role: z.enum(["user", "model", "assistant"]),
    text: z.string().max(CHAT_TUTOR_MAX_PROMPT_CHARS),
  })).max(CHAT_TUTOR_MAX_HISTORY_MESSAGES).optional(),
});

export const PASSWORD_RESET_GENERIC_MESSAGE = "Si un compte Axelmond Research Labs existe pour cette adresse, un code de réinitialisation a été envoyé.";

export const courseSchema = z.object({
  title: z.string().min(2, "Le titre est requis").max(200).trim(),
  level: z.string().min(2).max(50).trim().optional().default(DEFAULT_MODULE_CLASSIFICATION),
  credits: z.number().int().min(0),
  duration: z.string().min(2).max(50).trim(),
  category: z.string().max(100).trim().optional().nullable(),
  disciplineId: z.number().int().positive(),
  price: z.number().nonnegative(),
  instructor: z.string().max(100).trim().optional().nullable(),
  description: z.string().min(5, "La description est requise").max(2000).trim(),
  published: z.boolean().default(false),
});

export const coursePatchSchema = z.object({
  price: z.number().nonnegative().optional(),
  isLiveNow: z.boolean().optional(),
  liveSubject: z.string().max(200).trim().optional().nullable(),
  published: z.boolean().optional(),
});

export const contactSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères").max(100).trim(),
  email: z.string().email("Adresse email invalide").trim().toLowerCase(),
  subject: z.string().min(3, "Le sujet doit contenir au moins 3 caractères").max(200).trim(),
  category: z.string().min(2, "La catégorie est requise").max(100).trim(),
  message: z.string().min(10, "Le message doit contenir au moins 10 caractères").max(5000).trim(),
});

export const supportTicketSchema = z.object({
  subject: z.string().min(3, "Le sujet doit contenir au moins 3 caractères").max(200).trim(),
  category: z.string().min(2, "La catégorie est requise").max(100).trim(),
  description: z.string().min(10, "La description doit contenir au moins 10 caractères").max(5000).trim(),
  screenshotUrl: z.string().url("URL de capture d'écran invalide").trim().optional().nullable(),
});

export const chapterSchema = z.object({
  title: z.string().min(2, "Le titre est requis").max(200).trim(),
  description: z.string().max(1000).trim().optional().nullable(),
  published: z.boolean().default(false),
  order: z.number().int().optional(),
});

export const chapterPatchSchema = z.object({
  published: z.boolean(),
});

export const sectionSchema = z.object({
  title: z.string().min(2, "Le titre est requis").max(200).trim(),
  description: z.string().max(1000).trim().optional().nullable(),
  parentId: z.string().trim().optional().nullable(),
  chapterId: z.string().trim().optional().nullable(),
  published: z.boolean().default(false),
});

export const sectionPatchSchema = z.object({
  title: z.string().min(2).max(200).trim().optional(),
  description: z.string().max(1000).trim().optional().nullable(),
  published: z.boolean().optional(),
  order: z.number().int().optional(),
});

export const textContentSchema = z.object({
  title: z.string().min(2, "Le titre est requis").max(200).trim(),
  body: z.string().min(1, "Le contenu est requis").max(20000).trim(),
  published: z.boolean().default(false),
});

export const textContentPatchSchema = z.object({
  title: z.string().min(2).max(200).trim().optional(),
  body: z.string().max(20000).trim().optional().nullable(),
  published: z.boolean().optional(),
});

export const quizSchema = z.object({
  moduleId: z.number().int().positive().optional().nullable(),
  sectionId: z.string().trim().optional().nullable(),
  title: z.string().min(2).max(200).trim(),
  published: z.boolean().default(false),
});

export const quizPatchSchema = z.object({
  title: z.string().min(2).max(200).trim().optional(),
  published: z.boolean().optional(),
});

export const quizQuestionSchema = z.object({
  question: z.string().min(2).max(500).trim(),
  options: z.array(z.string().min(1).max(200).trim()).min(2).max(10),
  answer: z.string().min(1).trim(),
  explanation: z.string().min(2).max(1000).trim(),
});

export const quizAttemptSchema = z.object({
  answers: z.record(z.string(), z.string().trim()),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Mot de passe actuel requis"),
  newPassword: z.string().min(8, "Le nouveau mot de passe doit contenir au moins 8 caractères"),
});

export const academicProfileSchema = z.object({
  title: z.string().max(100).trim().optional().nullable(),
  department: z.string().max(100).trim().optional().nullable(),
  lab: z.string().max(100).trim().optional().nullable(),
  speciality: z.string().max(100).trim().optional().nullable(),
  teachingDomains: z.array(z.string()).optional(),
  researchDomains: z.array(z.string()).optional(),
  bio: z.string().max(2000).trim().optional().nullable(),
  avatarUrl: z.string().url().or(z.literal("")).optional().nullable(),
  links: z.record(z.string(), z.string().url().or(z.literal(""))).optional(),
});

export const liveMessageSchema = z.object({
  courseId: z.number().int().positive(),
  messageId: z.string().trim().optional(),
  text: z.string().min(1).max(1000).trim(),
});

export const liveEventSchema = z.object({
  courseId: z.number().int().positive(),
  action: z.enum(["RAISE_HAND", "LOWER_HAND", "REACTION", "QUESTION", "RESOURCE_SHARE", "WHITEBOARD_UPDATE", "RECORDING_REQUESTED", "RECORDING_STOPPED"]),
  targetIdentity: z.string().max(200).trim().optional().nullable(),
  targetName: z.string().max(200).trim().optional().nullable(),
  details: z.record(z.string(), z.any()).optional(),
});

export const liveModerationSchema = z.object({
  courseId: z.number().int().positive(),
  action: z.enum(["MUTE_AUDIO", "MUTE_VIDEO", "REMOVE_PARTICIPANT", "GRANT_SPEECH", "REVOKE_SPEECH"]),
  targetIdentity: z.string().min(1).max(200).trim(),
  targetName: z.string().max(200).trim().optional().nullable(),
  trackSid: z.string().max(200).trim().optional().nullable(),
});

export const liveAttendanceLeaveSchema = z.object({
  courseId: z.number().int().positive(),
});

// ─── Resource Ownership Verification Helpers ──────────────────────────────────

export async function verifyCourseAccess(authUser: AppUser, courseId: number): Promise<boolean> {
  if (authUser.role === "ADMIN") return true;
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return false;
  return course.createdById === authUser.id;
}

export async function verifyChapterAccess(authUser: AppUser, chapterId: string): Promise<boolean> {
  if (authUser.role === "ADMIN") return true;
  const chapter = await prisma.chapter.findUnique({ where: { id: chapterId } });
  if (!chapter) return false;
  return verifyCourseAccess(authUser, chapter.courseId);
}

export async function verifySectionAccess(authUser: AppUser, sectionId: string): Promise<boolean> {
  if (authUser.role === "ADMIN") return true;
  const section = await prisma.contentSection.findUnique({ where: { id: sectionId } });
  if (!section) return false;
  return verifyCourseAccess(authUser, section.courseId);
}

export async function verifyContentAccess(authUser: AppUser, contentId: string): Promise<boolean> {
  if (authUser.role === "ADMIN") return true;
  const content = await prisma.lessonContent.findUnique({ where: { id: contentId } });
  if (!content) return false;
  return verifyCourseAccess(authUser, content.courseId);
}

export async function verifyQuizAccess(authUser: AppUser, quizId: string): Promise<boolean> {
  if (authUser.role === "ADMIN") return true;
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz) return false;
  return verifyCourseAccess(authUser, quiz.courseId);
}

export async function verifyQuizQuestionAccess(authUser: AppUser, questionId: string): Promise<boolean> {
  if (authUser.role === "ADMIN") return true;
  const question = await prisma.quizQuestion.findUnique({
    where: { id: questionId },
    include: { quiz: true },
  });
  if (!question || !question.quiz) return false;
  return verifyCourseAccess(authUser, question.quiz.courseId);
}

export async function invalidatePublicCatalogCache(): Promise<void> {
  await cacheDel("api:domains:public");
  await cacheDelByPrefix("api:courses:public:");
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
export const AUTH_LOCKOUT_WINDOW_MS = Number(process.env.AUTH_LOCKOUT_WINDOW_MS) || 60 * 1000;
export const isSecurityRuntimeTest = process.env.SECURITY_RUNTIME_TEST === "1";

export { quizzes, seedQuizModuleCourseMap } from "./startup-db";
export { prisma, getActivePgSchema } from "../db";
export { logSecurity, logAudit, alertFailedLogins } from "../security-logger";
export { cacheGet, cacheSet, cacheDel, cacheDelByPrefix } from "../cache";
export { deleteCloudFiles } from "../uploadthing";
export { notifyEnrolledStudentsForCourse } from "../notifications";
export { buildCourseGradeRows } from "../grades";
export { assertCourseLearningAccess } from "../course-access";
export { APP_USER_BILLING_INCLUDE, buildCourseInvoiceId, mergeUserInvoices, persistCoursePaymentEnrollment };
export { PUBLIC_API_ERRORS, LIVE_ACCESS_ERRORS, toPushSubscribeClientResponse } from "../public-api-errors";
export { sanitizeAcademicProfileInput, sanitizeAvatarUrl, isAvatarUrlFieldInvalid } from "../academic-profile";
export { isAllowedAvatarUrl } from "../avatar-security";
export { setAuthCookies, clearAuthCookies } from "../auth-cookies";
export { withMobileRefreshToken, isMobileClientRequest, MOBILE_CLIENT_HEADER } from "../auth-mobile";
export { readRefreshTokenFromRequest } from "../auth-cookies";
export { parsePositiveInt } from "../route-params";
export { generateChatTutorResponse, ChatTutorServiceError, toChatTutorClientResponse, initializeOpenAIService } from "../openai-service";
export type { CourseModule } from "../types";
export { createRefreshToken, rotateRefreshToken, revokeRefreshToken, revokeAllUserRefreshTokens, signAuthToken, verifyAuthToken, findValidRefreshToken } from "../auth-token";
export { normalizeRole, canLoginToRequestedRole, canAccessAcademicProfile, isTeacherSpaceRole } from "../rbac";
export { DEFAULT_STUDENT_LABEL, DEFAULT_MODULE_CLASSIFICATION } from "../types";
export { DEFAULT_LIVE_SUBJECT, buildLiveKitRoomName, getLiveKitConfig, getLiveKitParticipantIdentity } from "../livekit";
export { normalizeProfessorInviteCode, generateProfessorInviteCode, parseProfessorInviteCodes } from "../invitations";
export { ProfessorInviteConsumeError, attachProfessorInviteUsage, reserveProfessorInviteCode } from "../professor-invite-consume";
export { buildEmailDeliverySummary } from "../email-delivery-summary";
export { sendVerificationEmail, sendAdminTestEmail, getEmailErrorDetails, getSmtpPublicConfig } from "../email";
export { generateEmailVerificationCode, hashEmailVerificationCode, buildEmailVerificationExpiry, canAttemptEmailVerification, isEmailVerificationExpired, normalizeEmailVerificationCode, EMAIL_VERIFICATION_MAX_ATTEMPTS, EMAIL_VERIFICATION_TTL_MINUTES } from "../email-verification";
export { validateSchedulePayload, serializeScheduleSession, sortScheduleSessions, canAccessProfessorScheduleSession } from "../schedule";
export { validateStudentStudyPayload, serializeStudentStudySession, sortStudentStudySessions, canAccessStudentStudySession } from "../student-study-schedule";
export { validateStudentObjectivePayload, normalizeStudentObjectivePayload, serializeStudentObjective, sortStudentObjectives, canAccessStudentObjective, buildStudentObjectiveSummary, buildNextRecurringObjectiveData } from "../student-objectives";
export { validateIncomingLiveSyncMessage, isModeratorOnlyLiveSyncType } from "../live/live-sync-validation";
export { LIVE_SYNC_TOPIC, createEmptyPoll } from "../live/live-sync";
export { hashRefreshToken, CHAT_TUTOR_MAX_HISTORY_MESSAGES, CHAT_TUTOR_MAX_PROMPT_CHARS } from "../security-hardening";
export { createPayPalOrder, capturePayPalOrder, isPayPalConfigured, logPayPalError } from "../paypal-server";
export { processPayPalCaptureEnrollment, toPayPalCaptureClientResponse } from "../paypal-enrollment";
export { resolveCourseChargeAmount } from "../promo-codes";
export { decodeStoredText } from "../text";
export { AccessToken, RoomServiceClient, DataPacket_Kind } from "livekit-server-sdk";
export { Prisma } from "@prisma/client";
export { default as bcrypt } from "bcryptjs";
export { z } from "zod";
