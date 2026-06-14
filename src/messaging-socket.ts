import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { prisma } from "./db";
import { verifyAuthToken } from "./auth-token";
import { isConversationParticipant } from "./messaging";
import { normalizeRole } from "./rbac";

let messagingIo: Server | null = null;

export function initMessagingSocket(
  httpServer: HttpServer,
  allowedOrigins: Set<string>,
  normalizeOrigin: (value: string) => string,
  isProduction = process.env.NODE_ENV === "production",
) {
  messagingIo = new Server(httpServer, {
    cors: {
      origin(origin, callback) {
        if (!origin) {
          callback(null, !isProduction);
          return;
        }
        callback(null, allowedOrigins.has(normalizeOrigin(origin)));
      },
      credentials: true,
    },
    path: "/socket.io",
  });

  messagingIo.use(async (socket, next) => {
    try {
      const rawToken = socket.handshake.auth?.token || socket.handshake.headers.authorization;
      const token = typeof rawToken === "string" ? rawToken.replace(/^Bearer\s+/i, "") : "";
      const session = verifyAuthToken(token);
      if (!session) {
        next(new Error("Unauthorized"));
        return;
      }
      const user = await prisma.user.findUnique({ where: { id: session.userId } });
      if (!user || !user.emailVerified) {
        next(new Error("Unauthorized"));
        return;
      }
      const dbRole = normalizeRole(user.role);
      if (!dbRole || dbRole !== session.role) {
        next(new Error("Unauthorized"));
        return;
      }
      socket.data.userId = user.id;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  messagingIo.on("connection", (socket) => {
    const userId = String(socket.data.userId || "");
    if (!userId) return;
    socket.join(`user:${userId}`);

    socket.on("conversation:join", async (conversationId: string) => {
      if (typeof conversationId !== "string") return;
      if (await isConversationParticipant(conversationId, userId)) {
        socket.join(`conversation:${conversationId}`);
      }
    });

    socket.on("conversation:leave", (conversationId: string) => {
      if (typeof conversationId === "string") socket.leave(`conversation:${conversationId}`);
    });

    socket.on("typing:start", async (conversationId: string) => {
      if (typeof conversationId !== "string") return;
      if (!(await isConversationParticipant(conversationId, userId))) return;
      await prisma.conversationParticipant.update({
        where: { conversationId_userId: { conversationId, userId } },
        data: { typingUntil: new Date(Date.now() + 5000) },
      });
      socket.to(`conversation:${conversationId}`).emit("typing:update", { conversationId, userId, isTyping: true });
    });

    socket.on("typing:stop", async (conversationId: string) => {
      if (typeof conversationId !== "string") return;
      if (!(await isConversationParticipant(conversationId, userId))) return;
      await prisma.conversationParticipant.update({
        where: { conversationId_userId: { conversationId, userId } },
        data: { typingUntil: null },
      });
      socket.to(`conversation:${conversationId}`).emit("typing:update", { conversationId, userId, isTyping: false });
    });
  });

  return messagingIo;
}

export function getMessagingIo() {
  return messagingIo;
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  messagingIo?.to(`user:${userId}`).emit(event, payload);
}

export function emitToConversation(conversationId: string, event: string, payload: unknown) {
  messagingIo?.to(`conversation:${conversationId}`).emit(event, payload);
}
