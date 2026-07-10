import type { Express } from "express";
import { getAuthUser } from "../server/route-types";
import type { RouteContext } from "../server/route-context";
import * as api from "../server/route-deps";

export function registerLiveRoutes(app: Express, ctx: RouteContext): void {
  const { requireAuth, requireRbac, validateBody } = ctx.middleware;

  app.post("/api/livekit/token", requireAuth, validateBody(api.liveTokenSchema), async (req, res) => {
    const { courseId } = req.body;

    const authUser = getAuthUser(req);

    const access = await api.assertLiveAccess(authUser, Number(courseId));

    if (!access.ok) {
      api.logLiveKit("WARN", "Token denied", {
        userId: authUser.id,
        courseId: Number(courseId),
        status: access.status,
      });

      res.status(access.status).json({ error: access.error });

      return;
    }

    const course = access.course;

    const liveKitConfig = api.getLiveKitConfig(process.env);

    if (!liveKitConfig) {
      api.logLiveKit("ERROR", "LiveKit server configuration missing");

      res.status(503).json({ error: api.PUBLIC_API_ERRORS.liveServiceUnavailable });

      return;
    }

    const roomName = api.buildLiveKitRoomName(course.id);

    const sessionResult = await api.ensureLiveSession(course, authUser);

    if (sessionResult.ok === false) {
      res.status(sessionResult.status).json({ error: sessionResult.error });
      return;
    }

    const session = sessionResult.session;

    await api.recordLiveAttendanceJoin(session, authUser);

    const participantName = authUser.fullName;

    const participantIdentity = api.getLiveKitParticipantIdentity(authUser.id);

    const canPublish = api.canPublishLiveMedia(authUser.role);

    const token = await api.createLiveKitAccessToken(liveKitConfig.apiKey, liveKitConfig.apiSecret, {
      identity: participantIdentity,

      name: participantName,

      ttl: "15m",

      attributes: {
        role: authUser.role,

        userId: authUser.id,

        courseId: String(course.id),
      },

      metadata: JSON.stringify({
        role: authUser.role,

        courseId: course.id,
      }),
    });

    token.addGrant({
      room: roomName,

      roomJoin: true,

      canPublish,

      canSubscribe: true,

      canPublishData: true,
    });

    api.logLiveKit("INFO", "Token issued", {
      roomName,
      identity: participantIdentity,
      role: authUser.role,
      canPublish,
    });

    res.json({
      url: liveKitConfig.url,

      token: await token.toJwt(),

      roomName,

      participantName,

      sessionId: session.id,

      startedAt: session.startTime.toISOString(),
    });
  });

  app.get("/api/livekit/messages/:courseId", requireAuth, async (req, res) => {
    const authUser = getAuthUser(req);

    const courseId = api.parsePositiveInt(req.params.courseId);

    if (!courseId) {
      res.status(400).json({ error: "Identifiant de cours invalide" });

      return;
    }

    const access = await api.assertLiveAccess(authUser, courseId);

    if (!access.ok) {
      res.status(access.status).json({ error: access.error });

      return;
    }

    const roomName = api.buildLiveKitRoomName(access.course.id);

    const messages = await api.prisma.liveMessage.findMany({
      where: { roomName },

      include: { user: true },

      orderBy: { createdAt: "asc" },

      take: 50,
    });

    res.json(
      messages.map((message) => ({
        id: message.clientId || message.id,

        sender: message.user?.fullName || "Participant",

        text: message.text,

        time: message.createdAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),

        isMe: message.userId === authUser.id,
      })),
    );
  });

  app.post("/api/livekit/messages", requireAuth, validateBody(api.liveMessageSchema), async (req, res) => {
    const { courseId, messageId, text } = req.body;

    const authUser = getAuthUser(req);

    const access = await api.assertLiveAccess(authUser, Number(courseId));

    if (!access.ok) {
      res.status(access.status).json({ error: access.error });

      return;
    }

    const sessionResult = await api.ensureLiveSession(access.course, authUser);

    if (sessionResult.ok === false) {
      res.status(sessionResult.status).json({ error: sessionResult.error });
      return;
    }

    const session = sessionResult.session;

    const clientId = String(messageId || `${Date.now()}-${authUser.id}`);

    const existing = await api.prisma.liveMessage.findUnique({ where: { clientId } });
    if (existing) {
      if (existing.userId !== authUser.id) {
        res.status(403).json({ error: "Identifiant de message invalide" });
        return;
      }
      res.status(201).json({ id: existing.clientId || existing.id });
      return;
    }

    const message = await api.prisma.liveMessage.create({
      data: {
        clientId,

        roomName: session.roomName,

        text: text.trim(),

        sessionId: session.id,

        userId: authUser.id,
      },
    });

    api.logLiveKit("INFO", "Live message stored", { userId: authUser.id, roomName: session.roomName });

    res.status(201).json({ id: message.clientId || message.id });
  });

  app.post(
    "/api/livekit/attendance/leave",
    requireAuth,
    validateBody(api.liveAttendanceLeaveSchema),
    async (req, res) => {
      const authUser = getAuthUser(req);

      const access = await api.assertLiveAccess(authUser, req.body.courseId);

      if (!access.ok) {
        res.status(access.status).json({ error: access.error });

        return;
      }

      const roomName = api.buildLiveKitRoomName(access.course.id);

      const session = await api.findLiveSessionByRoomName(roomName);

      if (!session) {
        res.status(404).json({ error: "Session live introuvable" });

        return;
      }

      const attendance = await api.recordLiveAttendanceLeave(session, authUser);

      res.json({
        ok: true,

        attendance: attendance
          ? {
              joinedAt: attendance.joinedAt,

              leftAt: attendance.leftAt,

              durationSeconds: attendance.durationSeconds,
            }
          : null,
      });
    },
  );

  app.get("/api/livekit/attendance/:courseId", requireAuth, async (req, res) => {
    const authUser = getAuthUser(req);

    const courseId = Number(req.params.courseId);

    const access = await api.assertLiveAccess(authUser, courseId);

    if (!access.ok) {
      res.status(access.status).json({ error: access.error });

      return;
    }

    const roomName = api.buildLiveKitRoomName(access.course.id);

    const session = await api.findLiveSessionByRoomName(roomName);

    if (!session) {
      res.json({
        roomName,
        attendances: [],
        actions: [],
        summary: { participants: 0, averageDurationSeconds: 0, totalParticipationScore: 0 },
      });

      return;
    }

    const canSeeAll = authUser.role === "ADMIN" || authUser.role === "PROFESSOR" || authUser.role === "RESEARCHER";

    const attendances = await api.prisma.liveAttendance.findMany({
      where: {
        sessionId: session.id,

        ...(canSeeAll ? {} : { userId: authUser.id }),
      },

      include: { user: true },

      orderBy: { joinedAt: "asc" },

      take: 200,
    });

    const actions = await api.prisma.liveActionLog.findMany({
      where: {
        sessionId: session.id,

        ...(canSeeAll ? {} : { actorId: authUser.id }),
      },

      orderBy: { createdAt: "desc" },

      take: 50,
    });

    const totalDuration = attendances.reduce(
      (sum, item) =>
        sum + (item.durationSeconds || Math.max(0, Math.round((Date.now() - item.joinedAt.getTime()) / 1000))),
      0,
    );

    const totalParticipationScore = attendances.reduce((sum, item) => sum + item.participationScore, 0);

    res.json({
      roomName,

      attendances: attendances.map((item) => ({
        id: item.id,

        userId: item.userId,

        name: item.user?.fullName || "Participant",

        email: item.user?.email || null,

        role: item.role,

        joinedAt: item.joinedAt,

        leftAt: item.leftAt,

        durationSeconds: item.durationSeconds || Math.max(0, Math.round((Date.now() - item.joinedAt.getTime()) / 1000)),

        participationScore: item.participationScore,

        handRaised: item.handRaised,

        online: !item.leftAt,
      })),

      actions: actions.map((item) => ({
        id: item.id,

        action: item.action,

        actorId: item.actorId,

        actorRole: item.actorRole,

        targetIdentity: item.targetIdentity,

        targetName: item.targetName,

        details: item.details,

        createdAt: item.createdAt,
      })),

      summary: {
        participants: attendances.length,

        online: attendances.filter((item) => !item.leftAt).length,

        averageDurationSeconds: attendances.length ? Math.round(totalDuration / attendances.length) : 0,

        totalParticipationScore,
      },
    });
  });

  app.post("/api/livekit/events", requireAuth, validateBody(api.liveEventSchema), async (req, res) => {
    const authUser = getAuthUser(req);

    const access = await api.assertLiveAccess(authUser, req.body.courseId);

    if (!access.ok) {
      res.status(access.status).json({ error: access.error });

      return;
    }

    const sessionResult = await api.ensureLiveSession(access.course, authUser);

    if (sessionResult.ok === false) {
      res.status(sessionResult.status).json({ error: sessionResult.error });
      return;
    }

    const session = sessionResult.session;

    await api.recordLiveAction({
      sessionId: session.id,

      roomName: session.roomName,

      actor: authUser,

      action: req.body.action,

      targetIdentity: req.body.targetIdentity,

      targetName: req.body.targetName,

      details: req.body.details || {},
    });

    if (req.body.action === "RAISE_HAND" || req.body.action === "LOWER_HAND") {
      const activeAttendance = await api.prisma.liveAttendance.findFirst({
        where: { sessionId: session.id, userId: authUser.id, leftAt: null },

        orderBy: { joinedAt: "desc" },
      });

      if (activeAttendance) {
        await api.prisma.liveAttendance.update({
          where: { id: activeAttendance.id },

          data: {
            handRaised: req.body.action === "RAISE_HAND",

            participationScore: { increment: req.body.action === "RAISE_HAND" ? 1 : 0 },

            lastSeenAt: new Date(),
          },
        });
      }
    }

    api.logLiveKit("INFO", "Live event stored", {
      roomName: session.roomName,
      userId: authUser.id,
      action: req.body.action,
    });

    res.status(201).json({ ok: true });
  });

  app.post(
    "/api/livekit/moderation",
    requireAuth,
    requireRbac,
    validateBody(api.liveModerationSchema),
    async (req, res) => {
      const authUser = getAuthUser(req);

      if (authUser.role === "STUDENT") {
        res.status(403).json({ error: "Action réservée à l'équipe académique" });

        return;
      }

      const access = await api.assertLiveAccess(authUser, req.body.courseId);

      if (!access.ok) {
        res.status(access.status).json({ error: access.error });

        return;
      }

      const liveKitConfig = api.getLiveKitConfig(process.env);

      if (!liveKitConfig) {
        res.status(503).json({ error: api.PUBLIC_API_ERRORS.liveServiceUnavailable });

        return;
      }

      const sessionResult = await api.ensureLiveSession(access.course, authUser);

      if (sessionResult.ok === false) {
        res.status(sessionResult.status).json({ error: sessionResult.error });
        return;
      }

      const session = sessionResult.session;

      const roomService = await api.getLiveKitRoomService(liveKitConfig);

      try {
        if (req.body.action === "REMOVE_PARTICIPANT") {
          await roomService.removeParticipant(session.roomName, req.body.targetIdentity, {
            revokeTokenTs: BigInt(Math.floor(Date.now() / 1000)),
          });
        } else if (req.body.action === "MUTE_AUDIO" || req.body.action === "MUTE_VIDEO") {
          if (!req.body.trackSid) {
            res.status(400).json({ error: "trackSid requis pour couper un micro ou une caméra" });

            return;
          }

          await roomService.mutePublishedTrack(session.roomName, req.body.targetIdentity, req.body.trackSid, true);
        } else if (req.body.action === "GRANT_SPEECH" || req.body.action === "REVOKE_SPEECH") {
          await roomService.updateParticipant(session.roomName, req.body.targetIdentity, {
            permission: {
              canPublish: req.body.action === "GRANT_SPEECH",

              canSubscribe: true,

              canPublishData: true,
            },
          });
        }

        await api.recordLiveAction({
          sessionId: session.id,

          roomName: session.roomName,

          actor: authUser,

          action: req.body.action,

          targetIdentity: req.body.targetIdentity,

          targetName: req.body.targetName,

          details: { trackSid: req.body.trackSid || null },
        });

        api.logLiveKit("INFO", "Live moderation applied", {
          roomName: session.roomName,
          actorId: authUser.id,
          action: req.body.action,
          targetIdentity: req.body.targetIdentity,
        });

        res.json({ ok: true });
      } catch (err: any) {
        api.logLiveKit("ERROR", "Live moderation failed", {
          roomName: session.roomName,

          actorId: authUser.id,

          action: req.body.action,

          targetIdentity: req.body.targetIdentity,

          error: String(err?.message || err),
        });

        res.status(502).json({ error: api.PUBLIC_API_ERRORS.liveActionFailed });
      }
    },
  );

  app.post("/api/livekit/sync", requireAuth, requireRbac, async (req, res) => {
    const authUser = getAuthUser(req);
    const courseId = Number(req.body?.courseId);
    const message = req.body?.message;
    if (!courseId || Number.isNaN(courseId) || !message || typeof message !== "object") {
      res.status(400).json({ error: api.PUBLIC_API_ERRORS.liveSyncPayloadRequired });
      return;
    }

    const access = await api.assertLiveAccess(authUser, courseId);
    if (!access.ok) {
      res.status(access.status).json({ error: access.error });
      return;
    }

    const liveKitConfig = api.getLiveKitConfig(process.env);
    if (!liveKitConfig) {
      res.status(503).json({ error: api.PUBLIC_API_ERRORS.liveServiceUnavailable });
      return;
    }

    const payloadText = JSON.stringify(message);
    const senderIdentity = api.getLiveKitParticipantIdentity(authUser.id);
    const validated = api.validateIncomingLiveSyncMessage(message, {
      senderIdentity,
      senderRole: authUser.role,
      localIdentity: senderIdentity,
      currentPoll: api.createEmptyPoll(),
      currentStrokeCount: 0,
      payloadSize: new TextEncoder().encode(payloadText).byteLength,
    });
    if (!validated) {
      res.status(400).json({ error: "Message live sync invalide" });
      return;
    }
    if (api.isModeratorOnlyLiveSyncType(validated.type) && authUser.role === "STUDENT") {
      res.status(403).json({ error: "Action réservée à l'équipe académique" });
      return;
    }

    const sessionResult = await api.ensureLiveSession(access.course, authUser);
    if (sessionResult.ok === false) {
      res.status(sessionResult.status).json({ error: sessionResult.error });
      return;
    }
    const session = sessionResult.session;
    const roomService = await api.getLiveKitRoomService(liveKitConfig);
    const reliableKind = await api.getLiveKitReliableDataKind();
    try {
      await roomService.sendData(session.roomName, new TextEncoder().encode(JSON.stringify(validated)), reliableKind, {
        topic: api.LIVE_SYNC_TOPIC,
      });
      api.logLiveKit("INFO", "Live sync relayed", {
        roomName: session.roomName,
        userId: authUser.id,
        type: validated.type,
      });
      res.json({ ok: true });
    } catch (err: any) {
      api.logLiveKit("ERROR", "Live sync relay failed", {
        roomName: session.roomName,
        userId: authUser.id,
        error: String(err?.message || err),
      });
      res.status(502).json({ error: api.PUBLIC_API_ERRORS.liveRelayFailed });
    }
  });
}
