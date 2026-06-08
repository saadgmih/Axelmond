import type { Express, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "./db";
import { normalizeRole } from "./rbac";
import {
  canUsersDirectMessage,
  findDirectConversationId,
  isConversationParticipant,
  MESSAGE_BODY_MAX,
  MESSAGE_SEARCH_MIN,
  serializeConversationSummary,
  serializeMessage,
  serializeMessagingUser,
  validateMessageAttachmentInput,
  type MessageAttachmentInput,
} from "./messaging";
import { emitToConversation } from "./messaging-socket";
import {
  configureWebPush,
  createUserNotification,
  getUnreadNotificationCount,
  getVapidPublicKey,
  listUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  savePushSubscription,
  serializeNotification,
} from "./notifications";

type AuthUser = { id: string; email: string; fullName: string; role: string };

type RouteMiddleware = (req: Request, res: Response, next: NextFunction) => void;

const createConversationSchema = z.object({
  participantUserId: z.string().min(1),
});

const sendMessageSchema = z.object({
  body: z.string().max(MESSAGE_BODY_MAX).default(""),
  attachment: z.object({
    kind: z.enum(["IMAGE", "VIDEO", "AUDIO", "DOCUMENT"]),
    fileName: z.string().min(1).max(200),
    mimeType: z.string().min(3).max(120),
    sizeBytes: z.number().int().positive(),
    url: z.string().url(),
    storageKey: z.string().optional().nullable(),
  }).optional().nullable(),
});

const pushSubscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export function registerMessagingRoutes(
  app: Express,
  middleware: {
    requireAuth: RouteMiddleware;
    requireRbac: RouteMiddleware;
    validateBody: (schema: z.ZodTypeAny) => RouteMiddleware;
  },
) {
  configureWebPush();

  app.get("/api/messaging/users/search", middleware.requireAuth, middleware.requireRbac, async (req, res) => {
    const authUser = (req as any).authUser as AuthUser;
    const query = String(req.query.q || "").trim();
    if (query.length < MESSAGE_SEARCH_MIN) {
      res.json([]);
      return;
    }

    const candidates = await prisma.user.findMany({
      where: {
        emailVerified: true,
        id: { not: authUser.id },
        OR: [
          { fullName: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 20,
      select: { id: true, fullName: true, email: true, role: true, avatarUrl: true },
    });

    const allowed = [];
    for (const candidate of candidates) {
      const role = normalizeRole(candidate.role);
      if (!role) continue;
      const ok = await canUsersDirectMessage(
        { id: authUser.id, role: normalizeRole(authUser.role)! },
        { id: candidate.id, role },
      );
      if (ok) allowed.push(serializeMessagingUser({ ...candidate, role }));
    }
    res.json(allowed);
  });

  app.get("/api/conversations", middleware.requireAuth, middleware.requireRbac, async (req, res) => {
    const authUser = (req as any).authUser as AuthUser;
    const memberships = await prisma.conversationParticipant.findMany({
      where: { userId: authUser.id },
      orderBy: { conversation: { updatedAt: "desc" } },
      select: { conversationId: true },
    });
    const summaries = [];
    for (const membership of memberships) {
      const summary = await serializeConversationSummary(membership.conversationId, authUser.id);
      if (summary) summaries.push(summary);
    }
    res.json(summaries);
  });

  app.post("/api/conversations", middleware.requireAuth, middleware.requireRbac, middleware.validateBody(createConversationSchema), async (req, res) => {
    const authUser = (req as any).authUser as AuthUser;
    const participantUserId = String(req.body.participantUserId);
    const participant = await prisma.user.findUnique({
      where: { id: participantUserId },
      select: { id: true, role: true, fullName: true, email: true, avatarUrl: true, emailVerified: true },
    });
    if (!participant || !participant.emailVerified) {
      res.status(404).json({ error: "Utilisateur introuvable" });
      return;
    }
    const participantRole = normalizeRole(participant.role);
    const authRole = normalizeRole(authUser.role);
    if (!participantRole || !authRole) {
      res.status(400).json({ error: "Rôle utilisateur invalide" });
      return;
    }
    const allowed = await canUsersDirectMessage(
      { id: authUser.id, role: authRole },
      { id: participant.id, role: participantRole },
    );
    if (!allowed) {
      res.status(403).json({ error: "Conversation non autorisée avec cet utilisateur" });
      return;
    }

    const existingId = await findDirectConversationId(authUser.id, participant.id);
    if (existingId) {
      const summary = await serializeConversationSummary(existingId, authUser.id);
      res.json(summary);
      return;
    }

    const conversation = await prisma.conversation.create({
      data: {
        participants: {
          create: [
            { userId: authUser.id },
            { userId: participant.id },
          ],
        },
      },
    });
    const summary = await serializeConversationSummary(conversation.id, authUser.id);
    res.status(201).json(summary);
  });

  app.get("/api/conversations/:id/messages", middleware.requireAuth, middleware.requireRbac, async (req, res) => {
    const authUser = (req as any).authUser as AuthUser;
    const conversationId = String(req.params.id);
    if (!(await isConversationParticipant(conversationId, authUser.id))) {
      res.status(403).json({ error: "Accès refusé à cette conversation" });
      return;
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: 200,
      include: {
        sender: { select: { id: true, fullName: true, email: true, role: true, avatarUrl: true } },
        attachments: true,
        reads: true,
      },
    });

    res.json(messages.map((message) => serializeMessage(message as any, authUser.id)));
  });

  app.post("/api/conversations/:id/messages", middleware.requireAuth, middleware.requireRbac, middleware.validateBody(sendMessageSchema), async (req, res) => {
    const authUser = (req as any).authUser as AuthUser;
    const conversationId = String(req.params.id);
    if (!(await isConversationParticipant(conversationId, authUser.id))) {
      res.status(403).json({ error: "Accès refusé à cette conversation" });
      return;
    }

    const body = String(req.body.body || "").trim();
    const attachment = req.body.attachment as MessageAttachmentInput | null | undefined;
    if (!body && !attachment) {
      res.status(400).json({ error: "Message texte ou pièce jointe requis" });
      return;
    }
    if (attachment) {
      const attachmentError = validateMessageAttachmentInput(attachment);
      if (attachmentError) {
        res.status(400).json({ error: attachmentError });
        return;
      }
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: authUser.id,
        body,
        attachments: attachment
          ? {
              create: [{
                kind: attachment.kind,
                fileName: attachment.fileName,
                mimeType: attachment.mimeType,
                sizeBytes: attachment.sizeBytes,
                url: attachment.url,
                storageKey: attachment.storageKey || null,
              }],
            }
          : undefined,
      },
      include: {
        sender: { select: { id: true, fullName: true, email: true, role: true, avatarUrl: true } },
        attachments: true,
        reads: true,
      },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    const payload = serializeMessage(message as any, authUser.id);
    emitToConversation(conversationId, "message:new", payload);

    const participants = await prisma.conversationParticipant.findMany({
      where: { conversationId },
      select: { userId: true },
    });
    for (const participant of participants) {
      if (participant.userId === authUser.id) continue;
      await createUserNotification({
        userId: participant.userId,
        type: "NEW_MESSAGE",
        title: "Nouveau message",
        body: `${authUser.fullName} : ${body || "Pièce jointe envoyée"}`,
        actionUrl: `/messages?conversation=${conversationId}`,
        metadata: { conversationId, messageId: message.id },
      });
    }

    res.status(201).json(payload);
  });

  app.post("/api/conversations/:id/read", middleware.requireAuth, middleware.requireRbac, async (req, res) => {
    const authUser = (req as any).authUser as AuthUser;
    const conversationId = String(req.params.id);
    if (!(await isConversationParticipant(conversationId, authUser.id))) {
      res.status(403).json({ error: "Accès refusé à cette conversation" });
      return;
    }

    const unreadMessages = await prisma.message.findMany({
      where: {
        conversationId,
        senderId: { not: authUser.id },
        reads: { none: { userId: authUser.id } },
      },
      select: { id: true, senderId: true },
    });

    if (unreadMessages.length > 0) {
      await prisma.messageRead.createMany({
        data: unreadMessages.map((message) => ({ messageId: message.id, userId: authUser.id })),
        skipDuplicates: true,
      });
    }

    await prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId: authUser.id } },
      data: { lastReadAt: new Date(), typingUntil: null },
    });

    for (const message of unreadMessages) {
      emitToConversation(conversationId, "message:read", {
        conversationId,
        messageId: message.id,
        userId: authUser.id,
      });
    }

    res.json({ ok: true, marked: unreadMessages.length });
  });

  app.get("/api/notifications", middleware.requireAuth, middleware.requireRbac, async (req, res) => {
    const authUser = (req as any).authUser as AuthUser;
    const notifications = await listUserNotifications(authUser.id);
    res.json(notifications.map(serializeNotification));
  });

  app.get("/api/notifications/unread-count", middleware.requireAuth, middleware.requireRbac, async (req, res) => {
    const authUser = (req as any).authUser as AuthUser;
    const count = await getUnreadNotificationCount(authUser.id);
    res.json({ count });
  });

  app.get("/api/notifications/vapid-public-key", middleware.requireAuth, middleware.requireRbac, (_req, res) => {
    res.json({ publicKey: getVapidPublicKey() });
  });

  app.patch("/api/notifications/:id/read", middleware.requireAuth, middleware.requireRbac, async (req, res) => {
    const authUser = (req as any).authUser as AuthUser;
    const ok = await markNotificationRead(String(req.params.id), authUser.id);
    if (!ok) {
      res.status(404).json({ error: "Notification introuvable" });
      return;
    }
    res.json({ ok: true });
  });

  app.post("/api/notifications/read-all", middleware.requireAuth, middleware.requireRbac, async (req, res) => {
    const authUser = (req as any).authUser as AuthUser;
    await markAllNotificationsRead(authUser.id);
    res.json({ ok: true });
  });

  app.post("/api/notifications/push-subscribe", middleware.requireAuth, middleware.requireRbac, middleware.validateBody(pushSubscribeSchema), async (req, res) => {
    const authUser = (req as any).authUser as AuthUser;
    await savePushSubscription(authUser.id, req.body);
    res.json({ ok: true });
  });
}
