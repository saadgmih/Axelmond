import type { Server as HttpServer } from "node:http";
import { prisma } from "./db";
import { verifyAuthToken } from "./auth-token";
import { isConversationParticipant } from "./messaging";
import { normalizeRole } from "./rbac";
import { isExpectedShutdownCancellation, startupLifecycle } from "./server/startup-lifecycle";
import { logDb } from "./server/route-loggers";

const SOCKET_AUTH_CACHE_MS = Number(process.env.SOCKET_AUTH_CACHE_MS) || 5000;
const configuredSocketCacheMax = Number(process.env.SOCKET_AUTH_CACHE_MAX_ENTRIES);
const SOCKET_AUTH_CACHE_MAX_ENTRIES =
  Number.isInteger(configuredSocketCacheMax) && configuredSocketCacheMax > 0 ? configuredSocketCacheMax : 200;

interface CachedSocketAuth {
  userId: string;
  expiresAt: number;
  authTokenVersion: number;
}

const socketAuthCache = new Map<string, CachedSocketAuth>();

function evictSocketAuthCacheOverflow() {
  while (socketAuthCache.size > SOCKET_AUTH_CACHE_MAX_ENTRIES) {
    const oldestKey = socketAuthCache.keys().next().value;
    if (!oldestKey) return;
    socketAuthCache.delete(oldestKey);
  }
}

async function resolveSocketAuthUser(session: { userId: string; role: string; authTokenVersion: number }) {
  const now = Date.now();
  const cached = socketAuthCache.get(session.userId);
  if (cached && cached.expiresAt > now && cached.authTokenVersion === session.authTokenVersion) {
    return cached.userId;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, emailVerified: true, role: true, authTokenVersion: true },
  });
  if (!user || !user.emailVerified) return null;
  const dbRole = normalizeRole(user.role);
  if (!dbRole || dbRole !== session.role) return null;
  if ((Number(user.authTokenVersion) || 0) !== session.authTokenVersion) return null;

  socketAuthCache.delete(session.userId);
  socketAuthCache.set(session.userId, {
    userId: user.id,
    expiresAt: now + SOCKET_AUTH_CACHE_MS,
    authTokenVersion: session.authTokenVersion,
  });
  evictSocketAuthCacheOverflow();
  return user.id;
}

type MessagingIo = import("socket.io").Server;
type MessagingSocket = import("socket.io").Socket;
let messagingIo: MessagingIo | null = null;

function runMessagingTask(socket: MessagingSocket, task: () => Promise<void>): void {
  if (startupLifecycle.isShuttingDown) return;

  const trackedTask = startupLifecycle.trackCriticalTask(task());
  void trackedTask.catch((error) => {
    if (isExpectedShutdownCancellation(error)) return;
    logDb("ERROR", "Messaging socket action failed", {
      socketId: socket.id,
      error: error instanceof Error ? error.message : String(error),
    });
    socket.emit("messaging:error", { code: "MESSAGING_ACTION_FAILED" });
  });
}

export async function initMessagingSocket(
  httpServer: HttpServer,
  allowedOrigins: Set<string>,
  normalizeOrigin: (value: string) => string,
  isProduction = process.env.NODE_ENV === "production",
) {
  const { Server } = await import("socket.io");
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
    transports: ["websocket"],
    maxHttpBufferSize: Number(process.env.SOCKET_MAX_HTTP_BUFFER_BYTES) || 1_000_000,
    pingTimeout: Number(process.env.SOCKET_PING_TIMEOUT_MS) || 20_000,
    pingInterval: Number(process.env.SOCKET_PING_INTERVAL_MS) || 25_000,
  });

  messagingIo.use(async (socket, next) => {
    try {
      if (startupLifecycle.isShuttingDown) {
        next(new Error("Service restarting"));
        return;
      }
      const rawToken = socket.handshake.auth?.token || socket.handshake.headers.authorization;
      const token = typeof rawToken === "string" ? rawToken.replace(/^Bearer\s+/i, "") : "";
      const session = verifyAuthToken(token);
      if (!session) {
        next(new Error("Unauthorized"));
        return;
      }
      const userId = await startupLifecycle.trackCriticalTask(resolveSocketAuthUser(session));
      if (!userId) {
        next(new Error("Unauthorized"));
        return;
      }
      socket.data.userId = userId;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  messagingIo.on("connection", (socket) => {
    const userId = String(socket.data.userId || "");
    if (!userId) return;
    socket.join(`user:${userId}`);

    socket.on("conversation:join", (conversationId: string) => {
      if (typeof conversationId !== "string") return;
      runMessagingTask(socket, async () => {
        if (await isConversationParticipant(conversationId, userId)) {
          await socket.join(`conversation:${conversationId}`);
        }
      });
    });

    socket.on("conversation:leave", (conversationId: string) => {
      if (typeof conversationId === "string") socket.leave(`conversation:${conversationId}`);
    });

    socket.on("typing:start", (conversationId: string) => {
      if (typeof conversationId !== "string") return;
      runMessagingTask(socket, async () => {
        if (!(await isConversationParticipant(conversationId, userId))) return;
        await prisma.conversationParticipant.update({
          where: { conversationId_userId: { conversationId, userId } },
          data: { typingUntil: new Date(Date.now() + 5000) },
        });
        socket.to(`conversation:${conversationId}`).emit("typing:update", { conversationId, userId, isTyping: true });
      });
    });

    socket.on("typing:stop", (conversationId: string) => {
      if (typeof conversationId !== "string") return;
      runMessagingTask(socket, async () => {
        if (!(await isConversationParticipant(conversationId, userId))) return;
        await prisma.conversationParticipant.update({
          where: { conversationId_userId: { conversationId, userId } },
          data: { typingUntil: null },
        });
        socket.to(`conversation:${conversationId}`).emit("typing:update", { conversationId, userId, isTyping: false });
      });
    });
  });

  return messagingIo;
}

export function getMessagingIo() {
  return messagingIo;
}

export async function stopMessagingSocket(): Promise<void> {
  const io = messagingIo;
  messagingIo = null;
  socketAuthCache.clear();
  if (!io) return;

  await new Promise<void>((resolve) => {
    io.close(() => resolve());
  });
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  messagingIo?.to(`user:${userId}`).emit(event, payload);
}

export function emitToConversation(conversationId: string, event: string, payload: unknown) {
  messagingIo?.to(`conversation:${conversationId}`).emit(event, payload);
}
