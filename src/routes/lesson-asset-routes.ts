import type { Express } from "express";
import { z } from "zod";
import {
  LessonAssetConfirmationError,
  resolveConfirmedLessonAsset,
  type LessonAssetIntent,
} from "../lesson-asset-confirmation";
import { persistLessonAsset } from "../lesson-asset-service";
import type { RouteContext } from "../server/route-context";
import { getAuthUser } from "../server/route-types";
import * as api from "../server/route-deps";
import { getBrandingConfig, updateBrandingConfig } from "../services/video-branding-config";

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
    .max(512 * 1024 * 1024),
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
          if (config.introEnabled) {
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
          } else {
            // If branding config is disabled, mark content as READY directly
            await api.prisma.lessonContent.update({
              where: { id: result.content.id },
              data: { status: "READY" },
            });
            // Sync modules since it's ready
            if (result.content.published) {
              await api.syncPublishedLessonModules(courseId);
            }
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
  app.get(
    "/api/teacher/video-jobs/:jobId",
    requireAuth,
    requireRbac,
    async (req, res) => {
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
    }
  );

  // 2. POST /api/teacher/video-jobs/:jobId/retry
  app.post(
    "/api/teacher/video-jobs/:jobId/retry",
    requireAuth,
    requireRbac,
    async (req, res) => {
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
    }
  );

  // 3. POST /api/teacher/video-jobs/:jobId/cancel
  app.post(
    "/api/teacher/video-jobs/:jobId/cancel",
    requireAuth,
    requireRbac,
    async (req, res) => {
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
    }
  );

  // 4. GET /api/admin/video-branding
  app.get(
    "/api/admin/video-branding",
    requireAuth,
    requireRbac,
    async (req, res) => {
      const authUser = getAuthUser(req);
      if (authUser.role !== "ADMIN") {
        res.status(403).json({ error: "Accès réservé aux administrateurs" });
        return;
      }

      const config = await getBrandingConfig();
      res.status(200).json(config);
    }
  );

  // 5. POST /api/admin/video-branding/config
  app.post(
    "/api/admin/video-branding/config",
    requireAuth,
    requireRbac,
    async (req, res) => {
      const authUser = getAuthUser(req);
      if (authUser.role !== "ADMIN") {
        res.status(403).json({ error: "Accès réservé aux administrateurs" });
        return;
      }

      const updated = await updateBrandingConfig(req.body);
      res.status(200).json(updated);
    }
  );
}
