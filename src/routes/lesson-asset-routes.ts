import type { Express } from "express";
import { z } from "zod";
import {
  LessonAssetConfirmationError,
  resolveConfirmedLessonAsset,
  type LessonAssetIntent,
} from "../lesson-asset-confirmation";
import { persistLessonAsset, reuseLessonAsset } from "../lesson-asset-service";
import { sanitizeCourseAttachmentUrl } from "../external-url-security";
import type { RouteContext } from "../server/route-context";
import { getAuthUser } from "../server/route-types";
import * as api from "../server/route-deps";
import { getBrandingConfig, shouldQueueVideoBranding, updateBrandingConfig } from "../services/video-branding-config";

const confirmLessonAssetSchema = z.object({
  customId: z.string().trim().min(1).max(160),
  sectionId: z.string().trim().min(1).max(160).nullable(),
  title: z.string().trim().min(2).max(160),
  contentType: z.enum(["VIDEO", "PDF", "IMAGE"]),
  published: z.boolean(),
  fileName: z.string().trim().min(1).max(512),
  mimeType: z.string().trim().min(1).max(160),
  size: z
    .number()
    .int()
    .positive()
    .max(5 * 1024 * 1024 * 1024),
});

const reuseLessonAssetSchema = z.object({
  fileKey: z.string().trim().min(1).max(255),
  url: z.string().trim().min(1),
  fileName: z.string().trim().min(1).max(512),
  mimeType: z.string().trim().min(1).max(160).nullable().optional(),
  size: z.number().int().positive().max(5 * 1024 * 1024 * 1024),
  contentType: z.enum(["VIDEO", "PDF", "IMAGE"]),
  title: z.string().trim().min(1).max(160),
  sectionId: z.string().trim().min(1).max(160).nullable().optional(),
  published: z.boolean().default(false),
  sourceContentId: z.string().trim().min(1).optional(),
});

const copyLessonContentSchema = z.object({
  targetCourseId: z.number().int().positive(),
  targetSectionId: z.string().trim().min(1).max(160).nullable().optional(),
  title: z.string().trim().min(1).max(160).optional(),
  published: z.boolean().default(false),
});

export function registerLessonAssetRoutes(app: Express, ctx: RouteContext): void {
  const { requireAuth, requireRbac, validateBody } = ctx.middleware;

  // Confirm on the authenticated API request as well as in UploadThing's callback.
  // Some production hosts can drop external callbacks after the binary upload succeeds.
  app.post(
    "/api/courses/:courseId/lesson-assets/confirm",
    requireAuth,
    requireRbac,
    validateBody(confirmLessonAssetSchema),
    async (req, res) => {
      const authUser = getAuthUser(req);
      const courseId = api.parsePositiveInt(req.params.courseId);
      if (!courseId) {
        res.status(400).json({ error: "Identifiant de module invalide" });
        return;
      }
      if (!(await api.verifyCourseAccess(authUser, courseId))) {
        res.status(403).json({ error: "Accès refusé pour ajouter un média à ce module" });
        return;
      }

      if (req.body.sectionId) {
        const section = await api.prisma.contentSection.findFirst({
          where: { id: req.body.sectionId, courseId },
          select: { id: true },
        });
        if (!section) {
          res.status(404).json({ error: "Section de module introuvable" });
          return;
        }
      }

      const intent: LessonAssetIntent = {
        courseId,
        sectionId: req.body.sectionId,
        title: req.body.title,
        contentType: req.body.contentType,
        published: req.body.published,
        fileName: req.body.fileName,
        mimeType: req.body.mimeType,
        size: req.body.size,
      };

      try {
        const confirmedFile = await resolveConfirmedLessonAsset(req.body.customId, intent, authUser.id);
        const result = await persistLessonAsset({
          customId: req.body.customId,
          userId: authUser.id,
          intent,
          file: confirmedFile,
        });

        // Trigger automatic video branding if it's a video and automatic branding is enabled
        let jobId: string | null = null;
        if (intent.contentType === "VIDEO") {
          const config = await getBrandingConfig();
          if (shouldQueueVideoBranding(config)) {
            const existingJob = await api.prisma.videoProcessingJob.findFirst({
              where: { contentId: result.content.id },
            });
            if (!existingJob) {
              const job = await api.prisma.videoProcessingJob.create({
                data: {
                  contentId: result.content.id,
                  uploadedByUserId: authUser.id,
                  sourceVideoPath: confirmedFile.url,
                  status: "UPLOADED",
                  progressPercent: 0,
                  currentStep: "Téléversement terminé, en attente de traitement...",
                  introVersion: config.introVersion,
                },
              });
              jobId = job.id;
            } else {
              jobId = existingJob.id;
            }
          }

          // Ensure video is immediately playable for enrolled students without waiting for background worker
          await api.prisma.lessonContent.update({
            where: { id: result.content.id },
            data: { status: "READY" },
          });
          if (result.content.published) {
            await api.syncPublishedLessonModules(courseId);
            await api.notifyPublishedLessonContent({
              contentId: result.content.id,
              courseId,
              contentTitle: result.content.title,
              contentType: result.content.type,
              published: result.content.published,
              actorId: authUser.id,
              sourceEvent: "LESSON_ASSET_PUBLISHED",
            });
          }
        }

        await api.logAudit(
          authUser.id,
          authUser.email,
          result.created ? "CREATE_LESSON_ASSET" : "CONFIRM_LESSON_ASSET",
          "LessonContent",
          result.content.id,
          { courseId, sectionId: intent.sectionId, fileKey: confirmedFile.fileKey, jobId },
          req.ip,
        );
        api.logDb("INFO", "Lesson asset confirmed", {
          contentId: result.content.id,
          courseId,
          sectionId: intent.sectionId,
          userId: authUser.id,
          created: result.created,
          jobId,
        });

        // Refetch to return the updated status
        const finalContent = await api.prisma.lessonContent.findUnique({
          where: { id: result.content.id },
          include: { attachments: true },
        });

        res.status(result.created ? 201 : 200).json({
          ...(finalContent ? api.toLessonContent(finalContent) : api.toLessonContent(result.content)),
          jobId,
        });
      } catch (error) {
        if (error instanceof LessonAssetConfirmationError) {
          res.status(error.statusCode).json({ error: error.message });
          return;
        }
        throw error;
      }
    },
  );

  // 1. GET /api/teacher/video-jobs/:jobId
  app.get("/api/teacher/video-jobs/:jobId", requireAuth, requireRbac, async (req, res) => {
    const authUser = getAuthUser(req);
    const { jobId } = req.params;
    const job = await api.prisma.videoProcessingJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      res.status(404).json({ error: "Job introuvable" });
      return;
    }

    if (authUser.role !== "ADMIN" && job.uploadedByUserId !== authUser.id) {
      res.status(403).json({ error: "Accès refusé pour ce job" });
      return;
    }

    res.status(200).json(job);
  });

  // 2. POST /api/teacher/video-jobs/:jobId/retry
  app.post("/api/teacher/video-jobs/:jobId/retry", requireAuth, requireRbac, async (req, res) => {
    const authUser = getAuthUser(req);
    const { jobId } = req.params;
    const job = await api.prisma.videoProcessingJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      res.status(404).json({ error: "Job introuvable" });
      return;
    }

    if (authUser.role !== "ADMIN" && job.uploadedByUserId !== authUser.id) {
      res.status(403).json({ error: "Accès refusé pour ce job" });
      return;
    }

    if (job.status !== "FAILED" && job.status !== "CANCELLED") {
      res.status(400).json({ error: "Seuls les jobs échoués ou annulés peuvent être relancés" });
      return;
    }

    const brandingConfig = await getBrandingConfig();
    if (!shouldQueueVideoBranding(brandingConfig)) {
      const fallbackJob = await api.prisma.$transaction(async (tx) => {
        await tx.lessonContent.update({
          where: { id: job.contentId },
          data: { status: "READY" },
        });
        return tx.videoProcessingJob.update({
          where: { id: jobId },
          data: {
            status: "FAILED",
            currentStep: "Outils vidéo indisponibles ; la vidéo originale reste publiée.",
            errorCode: "VIDEO_TOOL_UNAVAILABLE",
          },
        });
      });
      res.status(200).json(fallbackJob);
      return;
    }

    const updatedJob = await api.prisma.videoProcessingJob.update({
      where: { id: jobId },
      data: {
        status: "UPLOADED",
        progressPercent: 0,
        currentStep: "Relance du traitement...",
        errorCode: null,
        errorMessage: null,
        startedAt: null,
        completedAt: null,
        failedAt: null,
      },
    });

    await api.prisma.lessonContent.update({
      where: { id: job.contentId },
      data: { status: "PROCESSING" },
    });

    res.status(200).json(updatedJob);
  });

  // 3. POST /api/teacher/video-jobs/:jobId/cancel
  app.post("/api/teacher/video-jobs/:jobId/cancel", requireAuth, requireRbac, async (req, res) => {
    const authUser = getAuthUser(req);
    const { jobId } = req.params;
    const job = await api.prisma.videoProcessingJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      res.status(404).json({ error: "Job introuvable" });
      return;
    }

    if (authUser.role !== "ADMIN" && job.uploadedByUserId !== authUser.id) {
      res.status(403).json({ error: "Accès refusé pour ce job" });
      return;
    }

    const cancellableStates = ["UPLOADED", "QUEUED"];
    if (!cancellableStates.includes(job.status)) {
      res.status(400).json({ error: "Impossible d'annuler un job déjà en cours de traitement" });
      return;
    }

    const updatedJob = await api.prisma.videoProcessingJob.update({
      where: { id: jobId },
      data: {
        status: "CANCELLED",
        currentStep: "Job annulé par l'utilisateur",
        failedAt: new Date(),
      },
    });

    await api.prisma.lessonContent.update({
      where: { id: job.contentId },
      data: { status: "FAILED" },
    });

    res.status(200).json(updatedJob);
  });

  // 4. GET /api/admin/video-branding
  app.get("/api/admin/video-branding", requireAuth, requireRbac, async (req, res) => {
    const authUser = getAuthUser(req);
    if (authUser.role !== "ADMIN") {
      res.status(403).json({ error: "Accès réservé aux administrateurs" });
      return;
    }

    const config = await getBrandingConfig();
    res.status(200).json(config);
  });

  // 5. POST /api/admin/video-branding/config
  app.post("/api/admin/video-branding/config", requireAuth, requireRbac, async (req, res) => {
    const authUser = getAuthUser(req);
    if (authUser.role !== "ADMIN") {
      res.status(403).json({ error: "Accès réservé aux administrateurs" });
      return;
    }

    const updated = await updateBrandingConfig(req.body);
    res.status(200).json(updated);
  });

  // 6. GET /api/teacher/media-library
  // Returns all media assets previously uploaded across the teacher's courses
  app.get("/api/teacher/media-library", requireAuth, requireRbac, async (req, res) => {
    const authUser = getAuthUser(req);
    const typeFilter = typeof req.query.type === "string" ? req.query.type.toUpperCase() : undefined;
    const searchFilter = typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : "";

    let accessibleCourseIds: number[] | null = null;
    if (authUser.role !== "ADMIN") {
      const teacherCourses = await api.prisma.course.findMany({
        where: {
          OR: [{ createdById: authUser.id }, { instructor: authUser.fullName }],
        },
        select: { id: true },
      });
      accessibleCourseIds = teacherCourses.map((c) => c.id);
    }

    const whereClause: any = {
      content: {
        type:
          typeFilter && ["VIDEO", "PDF", "IMAGE"].includes(typeFilter)
            ? typeFilter
            : { in: ["VIDEO", "PDF", "IMAGE"] },
      },
    };

    if (accessibleCourseIds !== null) {
      whereClause.OR = [
        { createdById: authUser.id },
        { courseId: { in: accessibleCourseIds } },
      ];
    }

    const attachments = await api.prisma.attachment.findMany({
      where: whereClause,
      include: {
        content: {
          select: {
            id: true,
            title: true,
            type: true,
            status: true,
            sectionId: true,
            createdAt: true,
            section: { select: { id: true, title: true } },
          },
        },
        course: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const seenKeys = new Set<string>();
    const libraryItems: any[] = [];

    for (const att of attachments) {
      const key = att.fileKey || att.url;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      const safeUrl = sanitizeCourseAttachmentUrl(att.url);
      if (!safeUrl) continue;

      const item = {
        id: att.id,
        contentId: att.contentId,
        title: att.content?.title || att.fileName,
        type: att.type,
        fileName: att.fileName,
        fileKey: att.fileKey,
        url: safeUrl,
        mimeType: att.mimeType,
        size: att.size,
        courseId: att.courseId,
        courseTitle: att.course?.title || "Module",
        sectionId: att.content?.sectionId || null,
        sectionTitle: att.content?.section?.title || null,
        createdAt: att.createdAt.toISOString(),
      };

      if (searchFilter) {
        const match =
          item.title.toLowerCase().includes(searchFilter) ||
          item.fileName.toLowerCase().includes(searchFilter) ||
          item.courseTitle.toLowerCase().includes(searchFilter);
        if (!match) continue;
      }

      libraryItems.push(item);
    }

    res.status(200).json(libraryItems);
  });

  // 7. POST /api/courses/:courseId/lesson-assets/reuse
  // Attaches an existing uploaded media to another course/section without re-uploading
  app.post(
    "/api/courses/:courseId/lesson-assets/reuse",
    requireAuth,
    requireRbac,
    validateBody(reuseLessonAssetSchema),
    async (req, res) => {
      const authUser = getAuthUser(req);
      const courseId = api.parsePositiveInt(req.params.courseId);
      if (!courseId) {
        res.status(400).json({ error: "Identifiant de module invalide" });
        return;
      }
      if (!(await api.verifyCourseAccess(authUser, courseId))) {
        res.status(403).json({ error: "Accès refusé pour ajouter un média à ce module" });
        return;
      }

      if (req.body.sectionId) {
        const section = await api.prisma.contentSection.findFirst({
          where: { id: req.body.sectionId, courseId },
          select: { id: true },
        });
        if (!section) {
          res.status(404).json({ error: "Section de module introuvable" });
          return;
        }
      }

      const safeUrl = sanitizeCourseAttachmentUrl(req.body.url);
      if (!safeUrl) {
        res.status(400).json({ error: "URL de média non autorisée" });
        return;
      }

      if (authUser.role !== "ADMIN") {
        const sourceAsset = await api.prisma.attachment.findFirst({
          where: { fileKey: req.body.fileKey },
          select: { createdById: true, courseId: true },
        });
        if (sourceAsset && sourceAsset.createdById !== authUser.id) {
          const canAccessSource = await api.verifyCourseAccess(authUser, sourceAsset.courseId);
          if (!canAccessSource) {
            res.status(403).json({ error: "Accès refusé pour réutiliser ce média" });
            return;
          }
        }
      }

      const newContent = await reuseLessonAsset({
        targetCourseId: courseId,
        targetSectionId: req.body.sectionId || null,
        title: req.body.title.trim(),
        contentType: req.body.contentType,
        fileName: req.body.fileName,
        fileKey: req.body.fileKey,
        url: safeUrl,
        mimeType: req.body.mimeType || null,
        size: req.body.size,
        published: req.body.published,
        userId: authUser.id,
        sourceContentId: req.body.sourceContentId,
      });

      await api.logAudit(
        authUser.id,
        authUser.email,
        "REUSE_LESSON_ASSET",
        "LessonContent",
        newContent.id,
        { courseId, sectionId: newContent.sectionId, fileKey: req.body.fileKey },
        req.ip,
      );

      res.status(201).json(api.toLessonContent(newContent));
    },
  );

  // 8. POST /api/courses/:courseId/lesson-contents/:contentId/copy-to
  // Direct clone/copy of an existing lesson content to another course/section
  app.post(
    "/api/courses/:courseId/lesson-contents/:contentId/copy-to",
    requireAuth,
    requireRbac,
    validateBody(copyLessonContentSchema),
    async (req, res) => {
      const authUser = getAuthUser(req);
      const sourceCourseId = api.parsePositiveInt(req.params.courseId);
      const { contentId } = req.params;
      const { targetCourseId, targetSectionId, title, published } = req.body;

      if (!sourceCourseId || !targetCourseId) {
        res.status(400).json({ error: "Identifiant de module invalide" });
        return;
      }

      if (!(await api.verifyCourseAccess(authUser, sourceCourseId))) {
        res.status(403).json({ error: "Accès refusé au module source" });
        return;
      }
      if (!(await api.verifyCourseAccess(authUser, targetCourseId))) {
        res.status(403).json({ error: "Accès refusé au module de destination" });
        return;
      }

      const sourceContent = await api.prisma.lessonContent.findFirst({
        where: { id: contentId, courseId: sourceCourseId },
        include: { attachments: true },
      });
      if (!sourceContent) {
        res.status(404).json({ error: "Contenu source introuvable" });
        return;
      }

      const sourceAttachment = sourceContent.attachments[0];
      if (!sourceAttachment) {
        res.status(400).json({ error: "Ce contenu ne possède aucun fichier média attaché" });
        return;
      }

      if (targetSectionId) {
        const section = await api.prisma.contentSection.findFirst({
          where: { id: targetSectionId, courseId: targetCourseId },
          select: { id: true },
        });
        if (!section) {
          res.status(404).json({ error: "Section de destination introuvable" });
          return;
        }
      }

      const safeUrl = sanitizeCourseAttachmentUrl(sourceAttachment.url);
      if (!safeUrl) {
        res.status(400).json({ error: "URL de média non autorisée" });
        return;
      }

      const newContent = await reuseLessonAsset({
        targetCourseId,
        targetSectionId: targetSectionId || null,
        title: (title || sourceContent.title).trim(),
        contentType: sourceContent.type,
        fileName: sourceAttachment.fileName,
        fileKey: sourceAttachment.fileKey,
        url: safeUrl,
        mimeType: sourceAttachment.mimeType,
        size: sourceAttachment.size,
        published: published,
        userId: authUser.id,
        sourceContentId: sourceContent.id,
      });

      await api.logAudit(
        authUser.id,
        authUser.email,
        "COPY_LESSON_ASSET",
        "LessonContent",
        newContent.id,
        { sourceCourseId, targetCourseId, fileKey: sourceAttachment.fileKey },
        req.ip,
      );

      res.status(201).json(api.toLessonContent(newContent));
    },
  );
}
