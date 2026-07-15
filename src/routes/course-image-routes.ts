import type { Express } from "express";
import { z } from "zod";
import { CourseImageConfirmationError, resolveConfirmedCourseImage } from "../course-image-confirmation";
import type { RouteContext } from "../server/route-context";
import { getAuthUser } from "../server/route-types";
import * as api from "../server/route-deps";

const confirmCourseImageSchema = z.object({ customId: z.string().min(1).max(160) });

export function registerCourseImageRoutes(app: Express, ctx: RouteContext): void {
  const { requireAuth, requireRbac, validateBody } = ctx.middleware;

  // This explicit confirmation makes image persistence independent from
  // UploadThing's external callback, which can be delayed or dropped by hosting.
  app.post(
    "/api/courses/:courseId/image",
    requireAuth,
    requireRbac,
    validateBody(confirmCourseImageSchema),
    async (req, res) => {
      const authUser = getAuthUser(req);
      const courseId = api.parsePositiveInt(req.params.courseId);
      if (!courseId) {
        res.status(400).json({ error: "Identifiant de module invalide" });
        return;
      }
      if (!(await api.verifyCourseAccess(authUser, courseId))) {
        res.status(403).json({ error: "Accès refusé pour modifier l'image de ce module" });
        return;
      }

      const course = await api.prisma.course.findUnique({
        where: { id: courseId },
        select: { id: true, imageKey: true },
      });
      if (!course) {
        res.status(404).json({ error: api.PUBLIC_API_ERRORS.courseNotFound });
        return;
      }

      try {
        const confirmed = await resolveConfirmedCourseImage(req.body.customId, courseId, authUser.id);
        const updatedCourse = await api.prisma.course.update({
          where: { id: courseId },
          data: { imageUrl: confirmed.imageUrl, imageKey: confirmed.imageKey },
          include: api.courseResponseInclude,
        });

        if (course.imageKey && course.imageKey !== confirmed.imageKey) {
          await api.deleteCloudFiles(course.imageKey);
        }
        await api.invalidatePublicCatalogCache();
        await api.logAudit(
          authUser.id,
          authUser.email,
          "UPDATE_COURSE_IMAGE",
          "Course",
          String(courseId),
          { imageKey: confirmed.imageKey },
          req.ip,
        );
        api.logDb("INFO", "Course image confirmed", { courseId, userId: authUser.id });
        res.json(api.toCourse(updatedCourse));
      } catch (error) {
        if (error instanceof CourseImageConfirmationError) {
          res.status(error.statusCode).json({ error: error.message });
          return;
        }
        throw error;
      }
    },
  );
}
