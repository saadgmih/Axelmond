import { createUploadthing, type FileRouter } from "uploadthing/express";
import { UploadThingError } from "uploadthing/server";
import { z } from "zod";
import { prisma } from "./db";
import { syncPublishedLessonModules } from "./course-curriculum-sync";
import { verifyAuthToken } from "./auth-token";
import { canManageContent, isTeacherSpaceRole, normalizeRole } from "./rbac";
import { isAllowedAvatarUrl, isAllowedRasterImageMime, isAllowedRasterImageUpload } from "./avatar-security";
import { alertSuspectUpload } from "./security-logger";
import { completeLiveReplayUpload } from "./server/live-replay-service";
import {
  detectMessageAttachmentKind,
  isConversationParticipant,
  normalizeMessageAttachmentMimeType,
  validateMessageAttachmentInput,
  registerMessageAttachmentUpload,
  type MessageAttachmentInput,
} from "./messaging";
import { utapi } from "./uploadthing-api";

const f = createUploadthing();
export { utapi };

const uploadInput = z.object({
  courseId: z.number().int().positive(),
  sectionId: z.string().min(1).optional().nullable(),
  title: z.string().min(2).max(160),
  contentType: z.enum(["VIDEO", "PDF", "IMAGE"]),
  published: z.boolean().default(false),
});

const liveReplayInput = z.object({
  courseId: z.number().int().positive(),
  liveSessionId: z.string().min(1),
  title: z.string().min(2).max(160).optional(),
});

const DANGEROUS_EXTENSIONS = [
  ".exe",
  ".dll",
  ".bat",
  ".cmd",
  ".sh",
  ".bash",
  ".php",
  ".js",
  ".ts",
  ".py",
  ".pl",
  ".rb",
  ".html",
  ".htm",
  ".msi",
  ".jar",
  ".vbs",
  ".lnk",
  ".svg",
  ".svgz",
];

function isDangerousFile(filename: string): boolean {
  const dotIndex = filename.lastIndexOf(".");
  if (dotIndex === -1) return false;
  const ext = filename.substring(dotIndex).toLowerCase();
  return DANGEROUS_EXTENSIONS.includes(ext);
}

function isValidMimeType(contentType: "VIDEO" | "PDF" | "IMAGE", mimeType: string | null): boolean {
  if (!mimeType) return false;
  const mime = mimeType.toLowerCase();
  if (contentType === "PDF") return mime === "application/pdf";
  if (contentType === "IMAGE") return isAllowedRasterImageMime(mime);
  if (contentType === "VIDEO") return mime.startsWith("video/");
  return false;
}

export async function deleteCloudFiles(fileKeys: string | string[]) {
  try {
    const keys = Array.isArray(fileKeys) ? fileKeys : [fileKeys];
    if (keys.length === 0) return;
    await utapi.deleteFiles(keys);
    console.log(
      `[${new Date().toISOString()}] [INFO] [uploadthing] Cloud files deleted successfully: ${JSON.stringify(keys)}`,
    );
  } catch (err) {
    console.error(`[${new Date().toISOString()}] [ERROR] [uploadthing] Cloud deletion failed: ${String(err)}`);
  }
}

function toAttachmentType(contentType: "VIDEO" | "PDF" | "IMAGE") {
  if (contentType === "VIDEO") return "VIDEO";
  if (contentType === "PDF") return "PDF";
  return "IMAGE";
}

function getFileUrl(file: { ufsUrl?: string; url?: string; appUrl?: string }) {
  return file.ufsUrl || file.url || file.appUrl || "";
}

async function getUploadUser(req: any) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const session = verifyAuthToken(token);
  if (!session) {
    throw new UploadThingError("Authentification requise pour téléverser un fichier");
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  const role = normalizeRole(user?.role);
  if (!user || role !== session.role || !user.emailVerified || !canManageContent(role)) {
    throw new UploadThingError("Accès professeur ou administrateur requis");
  }

  return { id: user.id, role };
}

async function getAuthenticatedUploadUser(req: any) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const session = verifyAuthToken(token);
  if (!session) {
    throw new UploadThingError("Authentification requise pour téléverser un fichier");
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  const role = normalizeRole(user?.role);
  if (!user || role !== session.role || !user.emailVerified) {
    throw new UploadThingError("Session utilisateur invalide");
  }

  return { id: user.id, role };
}

export const uploadRouter = {
  avatarImage: f(
    {
      image: { maxFileSize: "2MB", maxFileCount: 1 },
    },
    { awaitServerData: true },
  )
    .middleware(async ({ req }) => {
      const user = await getAuthenticatedUploadUser(req);
      return { userId: user.id, role: user.role };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const fileUrl = getFileUrl(file);
      if (isDangerousFile(file.name) || !isAllowedRasterImageUpload(file.name, file.type || null)) {
        alertSuspectUpload(metadata.userId, file.name, file.type || "unknown");
        await utapi.deleteFiles(file.key);
        throw new UploadThingError("Image de profil suspecte ou invalide refusée.");
      }
      if (!fileUrl) {
        await utapi.deleteFiles(file.key);
        throw new UploadThingError("URL de fichier introuvable pour la photo de profil.");
      }
      if (!isAllowedAvatarUrl(fileUrl)) {
        alertSuspectUpload(metadata.userId, file.name, file.type || "unknown");
        await utapi.deleteFiles(file.key);
        throw new UploadThingError("URL de photo de profil non autorisée.");
      }

      await prisma.user.update({
        where: { id: metadata.userId },
        data: { avatarUrl: fileUrl },
      });

      if (isTeacherSpaceRole(metadata.role)) {
        await prisma.academicProfile.upsert({
          where: { userId: metadata.userId },
          update: { avatarUrl: fileUrl },
          create: {
            userId: metadata.userId,
            avatarUrl: fileUrl,
            teachingDomains: [],
            researchDomains: [],
            links: {},
          },
        });
      }

      console.log(
        `[${new Date().toISOString()}] [INFO] [uploadthing] Avatar uploaded ${JSON.stringify({ userId: metadata.userId, fileKey: file.key })}`,
      );
      return { url: fileUrl };
    }),

  supportScreenshot: f(
    {
      image: { maxFileSize: "4MB", maxFileCount: 1 },
    },
    { awaitServerData: true },
  )
    .middleware(async ({ req }) => {
      const user = await getAuthenticatedUploadUser(req);
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const fileUrl = getFileUrl(file);
      if (isDangerousFile(file.name) || !isAllowedRasterImageUpload(file.name, file.type || null)) {
        alertSuspectUpload(metadata.userId, file.name, file.type || "unknown");
        await utapi.deleteFiles(file.key);
        throw new UploadThingError("Capture d'écran suspecte ou invalide refusée.");
      }
      if (!fileUrl) {
        await utapi.deleteFiles(file.key);
        throw new UploadThingError("URL de fichier introuvable pour la capture d'écran.");
      }
      console.log(
        `[${new Date().toISOString()}] [INFO] [uploadthing] Support screenshot uploaded ${JSON.stringify({ userId: metadata.userId, fileKey: file.key })}`,
      );
      return { url: fileUrl };
    }),

  lessonAsset: f(
    {
      image: { maxFileSize: "8MB", maxFileCount: 1 },
      pdf: { maxFileSize: "32MB", maxFileCount: 1 },
      video: { maxFileSize: "512MB", maxFileCount: 1 },
    },
    { awaitServerData: true },
  )
    .input(uploadInput)
    .middleware(async ({ req, input }) => {
      const user = await getUploadUser(req);
      const course = await prisma.course.findFirst({
        where: {
          id: input.courseId,
          ...(user.role === "ADMIN" ? {} : { createdById: user.id }),
        },
      });
      if (!course) {
        console.warn(
          `[${new Date().toISOString()}] [WARN] [uploadthing] Lesson asset upload denied ${JSON.stringify({ userId: user.id, role: user.role, courseId: input.courseId, sectionId: input.sectionId })}`,
        );
        throw new UploadThingError("Module introuvable ou non autorisé");
      }

      if (input.sectionId) {
        const section = await prisma.contentSection.findFirst({
          where: {
            id: input.sectionId,
            courseId: input.courseId,
          },
        });
        if (!section) {
          console.warn(
            `[${new Date().toISOString()}] [WARN] [uploadthing] Lesson asset section denied ${JSON.stringify({ userId: user.id, role: user.role, courseId: input.courseId, sectionId: input.sectionId })}`,
          );
          throw new UploadThingError("Section de module introuvable");
        }
      }

      return {
        userId: user.id,
        courseId: input.courseId,
        sectionId: input.sectionId || null,
        title: input.title,
        contentType: input.contentType,
        published: input.published,
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const fileUrl = getFileUrl(file);
      if (
        isDangerousFile(file.name) ||
        !isValidMimeType(metadata.contentType, file.type) ||
        (metadata.contentType === "IMAGE" && !isAllowedRasterImageUpload(file.name, file.type || null))
      ) {
        alertSuspectUpload(metadata.userId, file.name, file.type || "unknown");
        await utapi.deleteFiles(file.key);
        throw new UploadThingError("Type de fichier suspect ou invalide refusé.");
      }
      if (!fileUrl) {
        await utapi.deleteFiles(file.key);
        throw new UploadThingError("URL du média pédagogique introuvable.");
      }

      const content = await prisma.lessonContent.create({
        data: {
          courseId: metadata.courseId,
          sectionId: metadata.sectionId,
          title: metadata.title,
          type: metadata.contentType,
          published: metadata.published,
          createdById: metadata.userId,
          attachments: {
            create: {
              courseId: metadata.courseId,
              type: toAttachmentType(metadata.contentType),
              fileName: file.name,
              fileKey: file.key,
              url: fileUrl,
              mimeType: file.type || null,
              size: file.size,
              createdById: metadata.userId,
            },
          },
        },
        include: { attachments: true },
      });

      console.log(
        `[${new Date().toISOString()}] [INFO] [uploadthing] Lesson asset uploaded ${JSON.stringify({ contentId: content.id, courseId: metadata.courseId, sectionId: metadata.sectionId, fileKey: file.key })}`,
      );
      if (content.published) {
        await syncPublishedLessonModules(metadata.courseId);
      }
      return {
        contentId: content.id,
        attachmentId: content.attachments[0]?.id,
        url: fileUrl,
      };
    }),

  liveReplay: f(
    {
      video: { maxFileSize: "512MB", maxFileCount: 1 },
    },
    { awaitServerData: true },
  )
    .input(liveReplayInput)
    .middleware(async ({ req, input }) => {
      const user = await getUploadUser(req);
      const session = await prisma.liveSession.findFirst({
        where: { id: input.liveSessionId, courseId: input.courseId },
        include: {
          course: {
            select: { id: true, createdById: true },
          },
        },
      });
      if (!session) {
        throw new UploadThingError("Session live introuvable pour cette rediffusion.");
      }
      if (user.role !== "ADMIN" && session.course.createdById !== user.id) {
        throw new UploadThingError("Module introuvable ou non autorisé");
      }
      return {
        userId: user.id,
        courseId: input.courseId,
        liveSessionId: input.liveSessionId,
        title: input.title,
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const fileUrl = getFileUrl(file);
      if (isDangerousFile(file.name) || !isValidMimeType("VIDEO", file.type)) {
        alertSuspectUpload(metadata.userId, file.name, file.type || "unknown");
        await utapi.deleteFiles(file.key);
        throw new UploadThingError("Type de fichier suspect ou invalide refusé.");
      }
      if (!fileUrl) {
        await utapi.deleteFiles(file.key);
        throw new UploadThingError("URL de la rediffusion introuvable.");
      }

      const content = await completeLiveReplayUpload({
        userId: metadata.userId,
        courseId: metadata.courseId,
        liveSessionId: metadata.liveSessionId,
        title: metadata.title,
        fileName: file.name,
        fileKey: file.key,
        fileUrl,
        mimeType: file.type || null,
        size: file.size,
      });

      console.log(
        `[${new Date().toISOString()}] [INFO] [uploadthing] Live replay uploaded ${JSON.stringify({ contentId: content.id, courseId: metadata.courseId, liveSessionId: metadata.liveSessionId, fileKey: file.key })}`,
      );

      return {
        contentId: content.id,
        attachmentId: content.attachments[0]?.id,
        url: fileUrl,
      };
    }),

  messageAttachment: f(
    {
      image: { maxFileSize: "8MB", maxFileCount: 1 },
      video: { maxFileSize: "64MB", maxFileCount: 1 },
      audio: { maxFileSize: "16MB", maxFileCount: 1 },
      pdf: { maxFileSize: "16MB", maxFileCount: 1 },
      blob: { maxFileSize: "16MB", maxFileCount: 1 },
    },
    { awaitServerData: true },
  )
    .input(z.object({ conversationId: z.string().min(1) }))
    .middleware(async ({ req, input }) => {
      const user = await getAuthenticatedUploadUser(req);
      const allowed = await isConversationParticipant(input.conversationId, user.id);
      if (!allowed) throw new UploadThingError("Conversation introuvable ou accès refusé");
      return { userId: user.id, conversationId: input.conversationId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const fileUrl = getFileUrl(file);
      const normalizedMimeType = normalizeMessageAttachmentMimeType(file.type || "", file.name);
      const kind = detectMessageAttachmentKind(normalizedMimeType || file.type || null, file.name);
      if (
        isDangerousFile(file.name) ||
        !kind ||
        (kind === "IMAGE" && !isAllowedRasterImageUpload(file.name, file.type || null))
      ) {
        alertSuspectUpload(metadata.userId, file.name, file.type || "unknown");
        await utapi.deleteFiles(file.key);
        throw new UploadThingError("Type de fichier non autorisé pour la messagerie.");
      }
      const attachment: MessageAttachmentInput = {
        kind,
        fileName: file.name,
        mimeType: normalizedMimeType || "application/octet-stream",
        sizeBytes: file.size,
        url: fileUrl,
        storageKey: file.key,
      };
      const validationError = validateMessageAttachmentInput(attachment);
      if (validationError || !fileUrl) {
        if (file.key) await utapi.deleteFiles(file.key);
        throw new UploadThingError(validationError || "URL du fichier introuvable.");
      }
      console.log(
        `[${new Date().toISOString()}] [INFO] [uploadthing] Message attachment uploaded ${JSON.stringify({ userId: metadata.userId, conversationId: metadata.conversationId, fileKey: file.key, kind })}`,
      );
      await registerMessageAttachmentUpload({
        storageKey: file.key,
        userId: metadata.userId,
        conversationId: metadata.conversationId,
      });
      return {
        kind,
        fileName: file.name,
        mimeType: normalizedMimeType,
        sizeBytes: file.size,
        url: fileUrl,
        storageKey: file.key,
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof uploadRouter;
