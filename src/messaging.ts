import { prisma } from "./db";
import {
  buildDirectConversationKey,
  findDirectConversationId as lookupDirectConversationId,
} from "./direct-conversations";
import { cacheDel, cacheGet, cacheSet } from "./cache";

export { buildDirectConversationKey };
import { isStudentRole, isTeacherSpaceRole, type UserRole } from "./rbac";

export const MESSAGE_BODY_MAX = 4000;
export const MESSAGE_SEARCH_MIN = 2;

const MESSAGE_UPLOAD_CACHE_PREFIX = "message-upload:";
const MESSAGE_UPLOAD_CACHE_TTL_SECONDS = 3600;

export const MESSAGE_ATTACHMENT_LIMITS = {
  IMAGE: 8 * 1024 * 1024,
  VIDEO: 64 * 1024 * 1024,
  AUDIO: 16 * 1024 * 1024,
  DOCUMENT: 16 * 1024 * 1024,
} as const;

const ALLOWED_MIME_BY_KIND: Record<string, string[]> = {
  IMAGE: ["image/jpeg", "image/png", "image/webp"],
  VIDEO: ["video/mp4", "video/webm"],
  AUDIO: ["audio/mpeg", "audio/wav", "audio/webm", "audio/mp3", "audio/x-wav", "audio/mp4", "audio/ogg"],
  DOCUMENT: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
};

const ALLOWED_ATTACHMENT_HOSTS = ["uploadthing.com", "ufs.sh", "utfs.io"] as const;

function isAllowedAttachmentUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:") return false;
    return ALLOWED_ATTACHMENT_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

export interface MessagingUserRef {
  id: string;
  role: UserRole;
}

export interface MessageAttachmentInput {
  kind: "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT";
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  storageKey?: string;
}

export function messageUploadCacheKey(storageKey: string): string {
  return `${MESSAGE_UPLOAD_CACHE_PREFIX}${storageKey}`;
}

export async function registerMessageAttachmentUpload(params: {
  storageKey: string;
  userId: string;
  conversationId: string;
}): Promise<void> {
  await cacheSet(
    messageUploadCacheKey(params.storageKey),
    JSON.stringify({ userId: params.userId, conversationId: params.conversationId }),
    MESSAGE_UPLOAD_CACHE_TTL_SECONDS,
  );
}

export async function verifyMessageAttachmentOwnership(
  userId: string,
  conversationId: string,
  attachment: MessageAttachmentInput,
): Promise<string | null> {
  const storageKey = String(attachment.storageKey || "").trim();
  if (!storageKey) {
    return "Clé de stockage requise pour la pièce jointe";
  }

  const raw = await cacheGet(messageUploadCacheKey(storageKey));
  if (!raw) {
    return "Pièce jointe expirée ou non autorisée";
  }

  try {
    const meta = JSON.parse(raw) as { userId?: string; conversationId?: string };
    if (meta.userId !== userId || meta.conversationId !== conversationId) {
      return "Pièce jointe non autorisée pour cette conversation";
    }
    return null;
  } catch {
    return "Pièce jointe non autorisée";
  }
}

export async function consumeMessageAttachmentUpload(storageKey: string): Promise<void> {
  await cacheDel(messageUploadCacheKey(storageKey));
}

export function validateMessageAttachmentInput(input: MessageAttachmentInput): string | null {
  const kind = input.kind;
  const allowed = ALLOWED_MIME_BY_KIND[kind] || [];
  const mime = String(input.mimeType || "").toLowerCase();
  if (!allowed.includes(mime)) return "Type de fichier non autorisé";
  if (!input.url || !isAllowedAttachmentUrl(String(input.url))) return "URL de pièce jointe invalide";
  if (!input.fileName?.trim()) return "Nom de fichier requis";
  if (!input.storageKey?.trim()) return "Clé de stockage requise pour la pièce jointe";
  const limit = MESSAGE_ATTACHMENT_LIMITS[kind];
  if (input.sizeBytes <= 0 || input.sizeBytes > limit) return "Taille de fichier non autorisée";
  return null;
}

export async function canUsersDirectMessage(userA: MessagingUserRef, userB: MessagingUserRef): Promise<boolean> {
  if (userA.id === userB.id) return false;

  if (isTeacherSpaceRole(userA.role) && isTeacherSpaceRole(userB.role)) {
    return true;
  }

  if (isStudentRole(userA.role) && isStudentRole(userB.role)) {
    const enrollmentsB = await prisma.enrollment.findMany({
      where: { userId: userB.id },
      select: { courseId: true },
    });
    if (enrollmentsB.length === 0) return false;
    const shared = await prisma.enrollment.findFirst({
      where: {
        userId: userA.id,
        courseId: { in: enrollmentsB.map((entry) => entry.courseId) },
      },
    });
    return !!shared;
  }

  const student = isStudentRole(userA.role) ? userA : isStudentRole(userB.role) ? userB : null;
  const teacher = isTeacherSpaceRole(userA.role) ? userA : isTeacherSpaceRole(userB.role) ? userB : null;
  if (!student || !teacher) return false;

  const teacherCourses = await prisma.course.findMany({
    where: { createdById: teacher.id },
    select: { id: true },
  });
  if (teacherCourses.length === 0) return false;

  const enrolled = await prisma.enrollment.findFirst({
    where: {
      userId: student.id,
      courseId: { in: teacherCourses.map((course) => course.id) },
    },
  });
  return !!enrolled;
}

export async function isConversationParticipant(conversationId: string, userId: string): Promise<boolean> {
  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  return !!participant;
}

export async function findDirectConversationId(userAId: string, userBId: string): Promise<string | null> {
  return lookupDirectConversationId(userAId, userBId);
}

export function serializeMessagingUser(user: {
  id: string;
  fullName: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
}) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl || "",
  };
}

export function serializeMessage(
  message: {
    id: string;
    conversationId: string;
    senderId: string;
    body: string;
    createdAt: Date;
    sender: { id: string; fullName: string; email: string; role: string; avatarUrl?: string | null };
    attachments: Array<{
      id: string;
      kind: string;
      fileName: string;
      mimeType: string;
      sizeBytes: number;
      url: string;
    }>;
    reads: Array<{ userId: string; readAt: Date }>;
  },
  viewerId: string,
) {
  const readByOthers = message.reads.filter((read) => read.userId !== message.senderId);
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    sender: serializeMessagingUser(message.sender),
    body: message.body,
    createdAt: message.createdAt.toISOString(),
    sentAtLabel: message.createdAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    attachments: message.attachments.map((attachment) => ({
      id: attachment.id,
      kind: attachment.kind,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      url: attachment.url,
    })),
    readByMe: message.reads.some((read) => read.userId === viewerId),
    seenByOthers: message.senderId === viewerId ? readByOthers.length > 0 : false,
    seenCount: readByOthers.length,
  };
}

export async function serializeConversationSummary(conversationId: string, viewerId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      participants: {
        include: {
          user: { select: { id: true, fullName: true, email: true, role: true, avatarUrl: true } },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          sender: { select: { id: true, fullName: true, email: true, role: true, avatarUrl: true } },
          attachments: true,
          reads: true,
        },
      },
    },
  });
  if (!conversation) return null;

  const unreadCount = await prisma.message.count({
    where: {
      conversationId,
      senderId: { not: viewerId },
      reads: { none: { userId: viewerId } },
    },
  });

  return buildConversationSummary(conversation as any, viewerId, unreadCount);
}

function buildConversationSummary(
  conversation: {
    id: string;
    updatedAt: Date;
    participants: Array<{
      userId: string;
      typingUntil?: Date | null;
      user: { id: string; fullName: string; email: string; role: string; avatarUrl?: string | null };
    }>;
    messages: Array<Parameters<typeof serializeMessage>[0]>;
  },
  viewerId: string,
  unreadCount: number,
) {
  const viewerParticipant = conversation.participants.find((entry) => entry.userId === viewerId);
  if (!viewerParticipant) return null;

  const peer = conversation.participants.find((entry) => entry.userId !== viewerId)?.user;
  const peerParticipant = conversation.participants.find((entry) => entry.userId !== viewerId);
  const lastMessage = conversation.messages[0];

  return {
    id: conversation.id,
    peer: peer ? serializeMessagingUser(peer) : null,
    updatedAt: conversation.updatedAt.toISOString(),
    unreadCount,
    lastMessage: lastMessage ? serializeMessage(lastMessage as any, viewerId) : null,
    isPeerTyping: Boolean(peerParticipant?.typingUntil && peerParticipant.typingUntil > new Date()),
  };
}

export async function serializeConversationSummariesForViewer(conversationIds: string[], viewerId: string) {
  const uniqueConversationIds = [...new Set(conversationIds.filter(Boolean))];
  if (uniqueConversationIds.length === 0) return [];

  const [conversations, unreadRows] = await Promise.all([
    prisma.conversation.findMany({
      where: { id: { in: uniqueConversationIds } },
      include: {
        participants: {
          include: {
            user: { select: { id: true, fullName: true, email: true, role: true, avatarUrl: true } },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            sender: { select: { id: true, fullName: true, email: true, role: true, avatarUrl: true } },
            attachments: true,
            reads: true,
          },
        },
      },
    }),
    prisma.message.groupBy({
      by: ["conversationId"],
      where: {
        conversationId: { in: uniqueConversationIds },
        senderId: { not: viewerId },
        reads: { none: { userId: viewerId } },
      },
      _count: { _all: true },
    }),
  ]);

  const unreadByConversation = new Map(unreadRows.map((row) => [row.conversationId, row._count._all]));
  const summaryByConversation = new Map(
    conversations
      .map(
        (conversation) =>
          [
            conversation.id,
            buildConversationSummary(conversation as any, viewerId, unreadByConversation.get(conversation.id) || 0),
          ] as const,
      )
      .filter((entry) => Boolean(entry[1])),
  );

  return uniqueConversationIds
    .map((conversationId) => summaryByConversation.get(conversationId))
    .filter((summary): summary is NonNullable<typeof summary> => Boolean(summary));
}
