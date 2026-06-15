import { Prisma, type LiveSession } from "@prisma/client";
import { RoomServiceClient } from "livekit-server-sdk";
import { Course } from "../types";
import { canAccessAcademicProfile } from "../rbac";
import { buildLiveKitRoomName } from "../livekit";
import { prisma } from "../db";
import { LIVE_ACCESS_ERRORS } from "../public-api-errors";
import { logLiveKit } from "../route-loggers";
import type { AppUser } from "../route-types";
import { findCourse } from "./user-mappers";

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