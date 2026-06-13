import type { Prisma } from "@prisma/client";
import type { UserRole } from "./rbac";
import { prisma } from "./db";

type LiveSessionRef = { id: string; roomName: string };
type LiveActor = { id: string; role: UserRole; fullName?: string; email?: string };

export async function recordLiveAttendanceJoin(
  session: LiveSessionRef,
  authUser: LiveActor,
  deps: {
    recordLiveAction: (params: {
      sessionId?: string;
      roomName: string;
      actor?: LiveActor;
      action: string;
      targetIdentity?: string;
      targetName?: string;
      details?: Record<string, unknown>;
    }) => Promise<void>;
    logLiveKit: (level: "INFO" | "WARN" | "ERROR", message: string, data?: unknown) => void;
  },
) {
  const activeWhere = {
    sessionId: session.id,
    userId: authUser.id,
    leftAt: null,
  } as const;

  return prisma.$transaction(async (tx) => {
    const active = await tx.liveAttendance.findFirst({
      where: activeWhere,
      orderBy: { joinedAt: "desc" },
    });
    if (active) {
      return tx.liveAttendance.update({
        where: { id: active.id },
        data: { lastSeenAt: new Date(), role: authUser.role },
      });
    }

    try {
      const attendance = await tx.liveAttendance.create({
        data: {
          sessionId: session.id,
          roomName: session.roomName,
          userId: authUser.id,
          role: authUser.role,
        },
      });
      await deps.recordLiveAction({
        sessionId: session.id,
        roomName: session.roomName,
        actor: authUser,
        action: "JOIN",
      });
      deps.logLiveKit("INFO", "Attendance join recorded", {
        roomName: session.roomName,
        userId: authUser.id,
        role: authUser.role,
      });
      return attendance;
    } catch (err) {
      const prismaError = err as Prisma.PrismaClientKnownRequestError;
      if (prismaError?.code === "P2002") {
        const raced = await tx.liveAttendance.findFirst({
          where: activeWhere,
          orderBy: { joinedAt: "desc" },
        });
        if (raced) {
          return tx.liveAttendance.update({
            where: { id: raced.id },
            data: { lastSeenAt: new Date(), role: authUser.role },
          });
        }
      }
      throw err;
    }
  });
}

export async function recordLiveAttendanceLeave(
  session: LiveSessionRef,
  authUser: LiveActor,
  deps: {
    recordLiveAction: (params: {
      sessionId?: string;
      roomName: string;
      actor?: LiveActor;
      action: string;
      targetIdentity?: string;
      targetName?: string;
      details?: Record<string, unknown>;
    }) => Promise<void>;
    logLiveKit: (level: "INFO" | "WARN" | "ERROR", message: string, data?: unknown) => void;
  },
) {
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
  await deps.recordLiveAction({
    sessionId: session.id,
    roomName: session.roomName,
    actor: authUser,
    action: "LEAVE",
    details: { durationSeconds },
  });
  deps.logLiveKit("INFO", "Attendance leave recorded", {
    roomName: session.roomName,
    userId: authUser.id,
    durationSeconds,
  });
  return updated;
}
