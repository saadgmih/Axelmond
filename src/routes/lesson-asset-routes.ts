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
        await api.logAudit(
          authUser.id,
          authUser.email,
          result.created ? "CREATE_LESSON_ASSET" : "CONFIRM_LESSON_ASSET",
          "LessonContent",
          result.content.id,
          { courseId, sectionId: intent.sectionId, fileKey: confirmedFile.fileKey },
          req.ip,
        );
        api.logDb("INFO", "Lesson asset confirmed", {
          contentId: result.content.id,
          courseId,
          sectionId: intent.sectionId,
          userId: authUser.id,
          created: result.created,
        });
        res.status(result.created ? 201 : 200).json(api.toLessonContent(result.content));
      } catch (error) {
        if (error instanceof LessonAssetConfirmationError) {
          res.status(error.statusCode).json({ error: error.message });
          return;
        }
        throw error;
      }
    },
  );
}
