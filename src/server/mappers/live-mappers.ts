import { Prisma } from "@prisma/client";
import type { AccessTokenOptions } from "livekit-server-sdk";
import { Course } from "../../types";
import { canAccessAcademicProfile } from "../../rbac";
import { buildLiveKitRoomName } from "../../livekit";
import { prisma } from "../../db";
import { LIVE_ACCESS_ERRORS } from "../../public-api-errors";
import { LIVE_SYNC_TOPIC } from "../../live/live-sync";
import { logLiveKit } from "../route-loggers";
import type { AppUser } from "../route-types";
import { findCourse } from "./user-mappers";

export function canPublishLiveMedia(_role: AppUser["role"]): boolean {
  return true;
}

export const liveSessionJoinSelect = {
  id: true,
  roomName: true,
  startTime: true,
  isActive: true,
  endTime: true,
  courseId: true,
  professorId: true,
  title: true,
} as const;

export type LiveSessionJoinRecord = Prisma.LiveSessionGetPayload<{ select: typeof liveSessionJoinSelect }>;

export type LiveSessionResolveResult =
  | { ok: true; session: LiveSessionJoinRecord }
  | { ok: false; status: number; error: string };

function isMissingLiveReplayColumnError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "P2022";
}

function buildLegacyLiveSessionId() {
  return `live_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

async function upsertActiveLiveSessionRecordLegacy(input: {
  roomName: string;
  courseId: number;
  professorId: string;
  title: string | null;
  resetStartTime: boolean;
}): Promise<LiveSessionJoinRecord | null> {
  const existing = await prisma.$queryRaw<Array<{ id: string; startTime: Date }>>`
    SELECT id, "startTime"
    FROM "AxelmondResearchLab"."LiveSession"
    WHERE "roomName" = ${input.roomName}
    LIMIT 1
  `;
  const nextStartTime = input.resetStartTime ? new Date() : (existing[0]?.startTime ?? new Date());

  if (existing.length > 0) {
    await prisma.$executeRaw`
      UPDATE "AxelmondResearchLab"."LiveSession"
      SET
        title = ${input.title},
        "isActive" = true,
        "endTime" = NULL,
        "professorId" = ${input.professorId},
        "startTime" = ${nextStartTime}
      WHERE "roomName" = ${input.roomName}
    `;
  } else {
    const id = buildLegacyLiveSessionId();
    await prisma.$executeRaw`
      INSERT INTO "AxelmondResearchLab"."LiveSession"
        (id, "roomName", title, "courseId", "professorId", "isActive", "startTime", "endTime")
      VALUES
        (${id}, ${input.roomName}, ${input.title}, ${input.courseId}, ${input.professorId}, true, ${nextStartTime}, NULL)
    `;
  }

  return findLiveSessionByRoomName(input.roomName);
}

export async function upsertActiveLiveSessionRecord(input: {
  roomName: string;
  courseId: number;
  professorId: string;
  title: string | null;
  resetStartTime: boolean;
}): Promise<LiveSessionJoinRecord | null> {
  const startTime = input.resetStartTime ? new Date() : undefined;
  try {
    return await prisma.liveSession.upsert({
      where: { roomName: input.roomName },
      update: {
        title: input.title,
        isActive: true,
        endTime: null,
        professorId: input.professorId,
        ...(startTime ? { startTime } : {}),
      },
      create: {
        roomName: input.roomName,
        title: input.title,
        courseId: input.courseId,
        professorId: input.professorId,
        startTime: startTime || new Date(),
      },
      select: liveSessionJoinSelect,
    });
  } catch (err) {
    if (!isMissingLiveReplayColumnError(err)) throw err;
    logLiveKit("WARN", "Falling back to legacy live session upsert", {
      roomName: input.roomName,
      courseId: input.courseId,
    });
    return upsertActiveLiveSessionRecordLegacy(input);
  }
}

export async function deactivateLiveSessionByRoomName(roomName: string, title: string | null) {
  try {
    await prisma.liveSession.updateMany({
      where: { roomName, isActive: true, endTime: null },
      data: { title, isActive: false, endTime: new Date() },
    });
  } catch (err) {
    if (!isMissingLiveReplayColumnError(err)) throw err;
    await prisma.$executeRaw`
      UPDATE "AxelmondResearchLab"."LiveSession"
      SET title = ${title}, "isActive" = false, "endTime" = NOW()
      WHERE "roomName" = ${roomName} AND "isActive" = true AND "endTime" IS NULL
    `;
  }
}

async function syncLiveRecordingStatus(sessionId: string) {
  try {
    await prisma.liveSession.update({
      where: { id: sessionId },
      data: { recordingStatus: "RECORDING", replayContentId: null },
    });
  } catch (err) {
    if (isMissingLiveReplayColumnError(err)) return;
    throw err;
  }
}

export async function findLiveSessionByRoomName(roomName: string) {
  return prisma.liveSession.findUnique({
    where: { roomName },
    select: liveSessionJoinSelect,
  });
}

export async function ensureLiveSession(course: Course, authUser: AppUser): Promise<LiveSessionResolveResult> {
  const roomName = buildLiveKitRoomName(course.id);

  if (!course.isLiveNow) {
    return { ok: false, status: 403, error: LIVE_ACCESS_ERRORS.sessionNotActive };
  }

  if (authUser.role === "STUDENT") {
    const session = await findLiveSessionByRoomName(roomName);
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

  const session = await upsertActiveLiveSessionRecord({
    roomName,
    courseId: course.id,
    professorId: authUser.id,
    title: course.liveSubject || null,
    resetStartTime: !course.isLiveNow,
  });
  if (!session) {
    return { ok: false, status: 503, error: LIVE_ACCESS_ERRORS.sessionNotActive };
  }
  await syncLiveRecordingStatus(session.id);
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

type LiveKitSdk = typeof import("livekit-server-sdk");
let liveKitSdkPromise: Promise<LiveKitSdk> | null = null;

function loadLiveKitSdk(): Promise<LiveKitSdk> {
  if (!liveKitSdkPromise) {
    liveKitSdkPromise = import("livekit-server-sdk");
  }
  return liveKitSdkPromise;
}

export async function getLiveKitRoomService(config: { url: string; apiKey: string; apiSecret: string }) {
  const { RoomServiceClient } = await loadLiveKitSdk();
  return new RoomServiceClient(getLiveKitApiUrl(config.url), config.apiKey, config.apiSecret);
}

export async function createLiveKitAccessToken(apiKey: string, apiSecret: string, options: AccessTokenOptions) {
  const { AccessToken } = await loadLiveKitSdk();
  return new AccessToken(apiKey, apiSecret, options);
}

export async function getLiveKitReliableDataKind() {
  const { DataPacket_Kind } = await loadLiveKitSdk();
  return DataPacket_Kind.RELIABLE;
}

export async function endLiveKitRoom(config: { url: string; apiKey: string; apiSecret: string }, roomName: string) {
  const roomService = await getLiveKitRoomService(config);
  const reliableKind = await getLiveKitReliableDataKind();
  const liveEndedPayload = new TextEncoder().encode(JSON.stringify({ type: "LIVE_ENDED" }));

  try {
    await roomService.sendData(roomName, liveEndedPayload, reliableKind, { topic: LIVE_SYNC_TOPIC });
  } catch (err) {
    logLiveKit("WARN", "Live ended relay failed before room shutdown", { roomName, error: String(err) });
  }

  await roomService.deleteRoom(roomName);
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
    select: { id: true, createdById: true, instructor: true },
  });
  if (!course) return { ok: false as const, status: 404, error: LIVE_ACCESS_ERRORS.notFound };
  if (authUser.role === "STUDENT" && !authUser.enrolledCourses.includes(course.id)) {
    return { ok: false as const, status: 403, error: LIVE_ACCESS_ERRORS.enrollmentRequired };
  }
  if (
    (authUser.role === "PROFESSOR" || authUser.role === "RESEARCHER") &&
    course.createdById !== authUser.id &&
    course.instructor !== authUser.fullName
  ) {
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

export function canReadCourseGrades(
  authUser: AppUser,
  course: { id: number; createdById?: string | null; instructor?: string | null },
) {
  if (authUser.role === "ADMIN") return true;
  if (authUser.role === "STUDENT") return authUser.enrolledCourses.includes(course.id);
  // PROFESSOR/RESEARCHER : uniquement le propriétaire du module
  return course.createdById === authUser.id || (course.instructor && course.instructor === authUser.fullName);
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
