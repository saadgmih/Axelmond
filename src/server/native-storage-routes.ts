import type { Express, Request, Response } from "express";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import multer from "multer";
import { prisma } from "../db";
import { verifyAuthToken } from "../auth-token";
import { canManageContent, isTeacherSpaceRole, normalizeRole } from "../rbac";
import { isAllowedAvatarUrl, isAllowedRasterImageUpload } from "../avatar-security";
import { invalidateAuthUserCache } from "./auth-user-cache";
import { alertSuspectUpload } from "../security-logger";
import { completeLiveReplayUpload } from "./live-replay-service";
import { invalidatePublicCatalogCache } from "./route-ownership";
import { buildCourseImageCustomId } from "../course-image-confirmation";
import {
  buildLessonAssetCustomId,
  normalizeLessonAssetIntent,
  type LessonAssetIntent,
} from "../lesson-asset-confirmation";
import { persistLessonAsset } from "../lesson-asset-service";
import {
  detectMessageAttachmentKind,
  isConversationParticipant,
  normalizeMessageAttachmentMimeType,
  validateMessageAttachmentInput,
  registerMessageAttachmentUpload,
  type MessageAttachmentInput,
} from "../messaging";

const PROD_MEDIA_ROOT = "/var/www/axelmond/media";
const DEV_MEDIA_ROOT = path.resolve(process.cwd(), "media");

export function getMediaRootDir(): string {
  if (fs.existsSync(PROD_MEDIA_ROOT)) {
    return PROD_MEDIA_ROOT;
  }
  if (!fs.existsSync(DEV_MEDIA_ROOT)) {
    fs.mkdirSync(DEV_MEDIA_ROOT, { recursive: true });
  }
  return DEV_MEDIA_ROOT;
}

export function ensureMediaDirectories(): void {
  const root = getMediaRootDir();
  const subdirs = ["documents", "videos", "images", "avatars", "attachments", "hls"];
  for (const dir of subdirs) {
    const full = path.join(root, dir);
    if (!fs.existsSync(full)) {
      try {
        fs.mkdirSync(full, { recursive: true, mode: 0o755 });
      } catch (err) {
        console.warn(`[storage] Could not create directory ${full}:`, err);
      }
    }
  }
}

const DANGEROUS_EXTENSIONS = new Set([
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
]);

function isDangerousFile(filename: string): boolean {
  const dotIndex = filename.lastIndexOf(".");
  if (dotIndex === -1) return false;
  const ext = filename.substring(dotIndex).toLowerCase();
  return DANGEROUS_EXTENSIONS.has(ext);
}

// Memory / Disk upload config
const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    ensureMediaDirectories();
    const root = getMediaRootDir();
    const endpoint = String(_req.query.endpoint || "").trim();

    let subDir = "attachments";
    if (endpoint === "avatarImage") subDir = "avatars";
    else if (endpoint === "courseImage") subDir = "images";
    else if (endpoint === "liveReplay") subDir = "videos";
    else if (endpoint === "lessonAsset") {
      const mime = (file.mimetype || "").toLowerCase();
      if (mime === "application/pdf") subDir = "documents";
      else if (mime.startsWith("video/")) subDir = "videos";
      else subDir = "images";
    }

    cb(null, path.join(root, subDir));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".bin";
    const safeBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 32);
    const unique = `${Date.now()}-${randomUUID().slice(0, 8)}`;
    cb(null, `${safeBase}-${unique}${ext}`);
  },
});

const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 * 1024, // 5 GB max
    files: 5,
  },
});

function getAuthenticatedUserFromHeader(req: Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  return verifyAuthToken(token);
}

export function registerNativeStorageRoutes(app: Express): void {
  ensureMediaDirectories();

  app.post("/api/storage/upload", uploadMiddleware.array("files"), async (req: Request, res: Response): Promise<void> => {
    const session = getAuthenticatedUserFromHeader(req);
    if (!session) {
      res.status(401).json({ error: "Authentification requise pour téléverser un fichier" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    const role = normalizeRole(user?.role);
    if (!user || role !== session.role || !user.emailVerified) {
      res.status(401).json({ error: "Session utilisateur invalide" });
      return;
    }

    const endpoint = String(req.query.endpoint || "").trim();
    const files = (req.files as Express.Multer.File[]) || [];
    if (!files.length) {
      res.status(400).json({ error: "Aucun fichier fourni pour le téléversement" });
      return;
    }

    const firstFile = files[0];
    if (isDangerousFile(firstFile.originalname)) {
      alertSuspectUpload(user.id, firstFile.originalname, firstFile.mimetype);
      try { fs.unlinkSync(firstFile.path); } catch {}
      res.status(400).json({ error: "Type de fichier non autorisé pour des raisons de sécurité" });
      return;
    }

    let inputData: any = {};
    if (req.body.input) {
      try {
        inputData = typeof req.body.input === "string" ? JSON.parse(req.body.input) : req.body.input;
      } catch {
        inputData = {};
      }
    }

    try {
      // 1. AVATAR
      if (endpoint === "avatarImage") {
        if (!isAllowedRasterImageUpload(firstFile.originalname, firstFile.mimetype)) {
          try { fs.unlinkSync(firstFile.path); } catch {}
          res.status(400).json({ error: "Seules les images JPEG, PNG ou WebP sont autorisées pour la photo de profil." });
          return;
        }

        const relativeUrl = `/media/avatars/${firstFile.filename}`;
        await prisma.user.update({
          where: { id: user.id },
          data: { avatarUrl: relativeUrl },
        });

        if (isTeacherSpaceRole(role)) {
          await prisma.academicProfile.upsert({
            where: { userId: user.id },
            update: { avatarUrl: relativeUrl },
            create: {
              userId: user.id,
              avatarUrl: relativeUrl,
              teachingDomains: [],
              researchDomains: [],
              links: {},
            },
          });
        }

        invalidateAuthUserCache(user.id);
        res.status(200).json([
          {
            key: firstFile.filename,
            name: firstFile.originalname,
            size: firstFile.size,
            url: relativeUrl,
            serverData: { url: relativeUrl },
          },
        ]);
        return;
      }

      // 2. SUPPORT SCREENSHOT
      if (endpoint === "supportScreenshot") {
        if (!isAllowedRasterImageUpload(firstFile.originalname, firstFile.mimetype)) {
          try { fs.unlinkSync(firstFile.path); } catch {}
          res.status(400).json({ error: "Seules les images JPEG, PNG ou WebP sont autorisées." });
          return;
        }

        const relativeUrl = `/media/attachments/${firstFile.filename}`;
        res.status(200).json([
          {
            key: firstFile.filename,
            name: firstFile.originalname,
            size: firstFile.size,
            url: relativeUrl,
            serverData: { url: relativeUrl },
          },
        ]);
        return;
      }

      // 3. COURSE IMAGE
      if (endpoint === "courseImage") {
        if (!canManageContent(role)) {
          try { fs.unlinkSync(firstFile.path); } catch {}
          res.status(403).json({ error: "Accès professeur ou administrateur requis" });
          return;
        }

        const courseId = Number(inputData.courseId);
        if (!courseId || isNaN(courseId)) {
          try { fs.unlinkSync(firstFile.path); } catch {}
          res.status(400).json({ error: "Identifiant de module requis" });
          return;
        }

        const course = await prisma.course.findFirst({
          where: {
            id: courseId,
            ...(role === "ADMIN" ? {} : { createdById: user.id }),
          },
          select: { id: true, imageKey: true },
        });

        if (!course) {
          try { fs.unlinkSync(firstFile.path); } catch {}
          res.status(404).json({ error: "Module introuvable ou non autorisé" });
          return;
        }

        if (!isAllowedRasterImageUpload(firstFile.originalname, firstFile.mimetype)) {
          try { fs.unlinkSync(firstFile.path); } catch {}
          res.status(400).json({ error: "Seules les images JPEG, PNG ou WebP sont autorisées pour la couverture du module." });
          return;
        }

        const relativeUrl = `/media/images/${firstFile.filename}`;
        const customId = buildCourseImageCustomId(course.id, user.id);

        await prisma.course.update({
          where: { id: course.id },
          data: { imageUrl: relativeUrl, imageKey: firstFile.filename },
        });

        if (course.imageKey && course.imageKey !== firstFile.filename) {
          const oldPath = path.join(getMediaRootDir(), "images", course.imageKey);
          if (fs.existsSync(oldPath)) {
            try { fs.unlinkSync(oldPath); } catch {}
          }
        }

        await invalidatePublicCatalogCache();

        res.status(200).json([
          {
            key: firstFile.filename,
            name: firstFile.originalname,
            size: firstFile.size,
            url: relativeUrl,
            customId,
            serverData: { url: relativeUrl, key: firstFile.filename, customId },
          },
        ]);
        return;
      }

      // 4. LESSON ASSET
      if (endpoint === "lessonAsset") {
        if (!canManageContent(role)) {
          try { fs.unlinkSync(firstFile.path); } catch {}
          res.status(403).json({ error: "Accès professeur ou administrateur requis" });
          return;
        }

        const courseId = Number(inputData.courseId);
        if (!courseId || isNaN(courseId)) {
          try { fs.unlinkSync(firstFile.path); } catch {}
          res.status(400).json({ error: "Identifiant de cours requis" });
          return;
        }

        const course = await prisma.course.findFirst({
          where: {
            id: courseId,
            ...(role === "ADMIN" ? {} : { createdById: user.id }),
          },
        });

        if (!course) {
          try { fs.unlinkSync(firstFile.path); } catch {}
          res.status(404).json({ error: "Module introuvable ou non autorisé" });
          return;
        }

        if (inputData.sectionId) {
          const section = await prisma.contentSection.findFirst({
            where: { id: String(inputData.sectionId), courseId },
          });
          if (!section) {
            try { fs.unlinkSync(firstFile.path); } catch {}
            res.status(404).json({ error: "Section introuvable" });
            return;
          }
        }

        const contentType = String(inputData.contentType || "PDF").toUpperCase() as "VIDEO" | "PDF" | "IMAGE";
        const subfolder = contentType === "PDF" ? "documents" : contentType === "VIDEO" ? "videos" : "images";
        const relativeUrl = `/media/${subfolder}/${firstFile.filename}`;

        const intent = normalizeLessonAssetIntent({
          courseId,
          sectionId: inputData.sectionId ? String(inputData.sectionId) : null,
          title: String(inputData.title || firstFile.originalname).trim(),
          contentType,
          published: Boolean(inputData.published),
          fileName: firstFile.originalname,
          mimeType: firstFile.mimetype,
          size: firstFile.size,
        } satisfies LessonAssetIntent);

        const customId = buildLessonAssetCustomId(intent, user.id);

        const { content } = await persistLessonAsset({
          customId,
          userId: user.id,
          intent,
          file: {
            fileKey: firstFile.filename,
            url: relativeUrl,
          },
        });

        res.status(200).json([
          {
            key: firstFile.filename,
            name: firstFile.originalname,
            size: firstFile.size,
            url: relativeUrl,
            customId,
            serverData: {
              contentId: content.id,
              attachmentId: content.attachments[0]?.id,
              url: relativeUrl,
              customId,
            },
          },
        ]);
        return;
      }

      // 5. LIVE REPLAY
      if (endpoint === "liveReplay") {
        if (!canManageContent(role)) {
          try { fs.unlinkSync(firstFile.path); } catch {}
          res.status(403).json({ error: "Accès refusé" });
          return;
        }

        const courseId = Number(inputData.courseId);
        const liveSessionId = String(inputData.liveSessionId || "");
        const sessionRow = await prisma.liveSession.findFirst({
          where: { id: liveSessionId, courseId },
          include: { course: { select: { id: true, createdById: true } } },
        });

        if (!sessionRow) {
          try { fs.unlinkSync(firstFile.path); } catch {}
          res.status(404).json({ error: "Session live introuvable" });
          return;
        }

        if (role !== "ADMIN" && sessionRow.course.createdById !== user.id) {
          try { fs.unlinkSync(firstFile.path); } catch {}
          res.status(403).json({ error: "Non autorisé" });
          return;
        }

        const relativeUrl = `/media/videos/${firstFile.filename}`;
        const content = await completeLiveReplayUpload({
          userId: user.id,
          courseId,
          liveSessionId,
          title: inputData.title,
          fileName: firstFile.originalname,
          fileKey: firstFile.filename,
          fileUrl: relativeUrl,
          mimeType: firstFile.mimetype || null,
          size: firstFile.size,
        });

        res.status(200).json([
          {
            key: firstFile.filename,
            name: firstFile.originalname,
            size: firstFile.size,
            url: relativeUrl,
            serverData: {
              contentId: content.id,
              attachmentId: content.attachments[0]?.id,
              url: relativeUrl,
            },
          },
        ]);
        return;
      }

      // 6. MESSAGE ATTACHMENT
      if (endpoint === "messageAttachment") {
        const conversationId = String(inputData.conversationId || "");
        const allowed = await isConversationParticipant(conversationId, user.id);
        if (!allowed) {
          try { fs.unlinkSync(firstFile.path); } catch {}
          res.status(403).json({ error: "Conversation introuvable ou accès refusé" });
          return;
        }

        const normalizedMimeType = normalizeMessageAttachmentMimeType(firstFile.mimetype || "", firstFile.originalname);
        const kind = detectMessageAttachmentKind(normalizedMimeType || firstFile.mimetype || null, firstFile.originalname);
        if (!kind || (kind === "IMAGE" && !isAllowedRasterImageUpload(firstFile.originalname, firstFile.mimetype))) {
          try { fs.unlinkSync(firstFile.path); } catch {}
          res.status(400).json({ error: "Type de fichier non autorisé pour la messagerie" });
          return;
        }

        const relativeUrl = `/media/attachments/${firstFile.filename}`;
        const attachmentInput: MessageAttachmentInput = {
          kind,
          fileName: firstFile.originalname,
          mimeType: normalizedMimeType || "application/octet-stream",
          sizeBytes: firstFile.size,
          url: relativeUrl,
          storageKey: firstFile.filename,
        };

        const validationError = validateMessageAttachmentInput(attachmentInput);
        if (validationError) {
          try { fs.unlinkSync(firstFile.path); } catch {}
          res.status(400).json({ error: validationError });
          return;
        }

        await registerMessageAttachmentUpload({
          storageKey: firstFile.filename,
          userId: user.id,
          conversationId,
        });

        res.status(200).json([
          {
            key: firstFile.filename,
            name: firstFile.originalname,
            size: firstFile.size,
            url: relativeUrl,
            serverData: {
              kind,
              fileName: firstFile.originalname,
              mimeType: normalizedMimeType,
              sizeBytes: firstFile.size,
              url: relativeUrl,
              storageKey: firstFile.filename,
            },
          },
        ]);
        return;
      }

      // Unknown endpoint fallback
      try { fs.unlinkSync(firstFile.path); } catch {}
      res.status(400).json({ error: `Point de terminaison de téléversement inconnu : ${endpoint}` });
    } catch (err: any) {
      try { fs.unlinkSync(firstFile.path); } catch {}
      console.error("[storage] Native upload error:", err);
      res.status(500).json({ error: err?.message || "Erreur lors du téléversement du fichier" });
    }
  });
}

