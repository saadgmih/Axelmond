import type { Express } from "express";
import type { RouteContext } from "../server/route-context";
import { prisma } from "../db";
import { sanitizeCourseAttachmentUrl } from "../external-url-security";

export function registerPublicResourceRoutes(app: Express, _ctx: RouteContext): void {
  // Return catalog of all public modules and videos
  app.get("/api/public/resources", async (_req, res) => {
    try {
      const courseModules = await prisma.courseModule.findMany({
        where: { type: "video" },
        include: {
          course: { select: { id: true, title: true } },
        },
        orderBy: [{ courseId: "asc" }, { sortOrder: "asc" }],
      });

      const grouped: Record<
        number,
        {
          courseId: number;
          courseTitle: string;
          videos: Array<{
            id: string;
            moduleId: number;
            lessonId?: string;
            title: string;
            duration: string;
            url: string;
            publicPath: string;
          }>;
        }
      > = {};

      for (const m of courseModules) {
        if (!grouped[m.courseId]) {
          grouped[m.courseId] = {
            courseId: m.courseId,
            courseTitle: m.course?.title || `Module ${m.courseId}`,
            videos: [],
          };
        }
        const lessonId = m.sectionId?.startsWith("lesson:") ? m.sectionId.replace("lesson:", "") : undefined;
        const publicId = `c${m.courseId}-m${m.id}`;
        grouped[m.courseId].videos.push({
          id: publicId,
          moduleId: m.id,
          lessonId,
          title: m.title,
          duration: m.duration || "—",
          url: m.attachmentUrl,
          publicPath: `/ressource?id=${publicId}`,
        });
      }

      res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");
      res.json({
        ok: true,
        modules: Object.values(grouped),
      });
    } catch (err) {
      console.error("Public resources catalog error:", err);
      res.status(500).json({ error: "Erreur lors de la récupération des vidéos" });
    }
  });

  // Get single public resource (video, pdf, image)
  app.get("/api/public/resource/:id?", async (req, res) => {
    try {
      const rawId = req.params.id || (req.query.id as string) || (req.query.slug as string) || "";
      const queryCourseId = req.query.courseId ? parseInt(req.query.courseId as string, 10) : null;
      const queryModuleId = req.query.moduleId ? parseInt(req.query.moduleId as string, 10) : null;

      // 1. Check if courseId and moduleId specified
      let courseModule = null;
      if (queryCourseId && queryModuleId) {
        courseModule = await prisma.courseModule.findFirst({
          where: { courseId: queryCourseId, id: queryModuleId },
          include: { course: { select: { id: true, title: true } } },
        });
      }

      // 2. Check if composite pattern: c{courseId}-m{moduleId} or {courseId}-{moduleId}
      if (!courseModule && rawId) {
        const compositeMatch = rawId.match(/^c?(\d+)-m?(\d+)$/i);
        if (compositeMatch) {
          const cId = parseInt(compositeMatch[1], 10);
          const mId = parseInt(compositeMatch[2], 10);
          courseModule = await prisma.courseModule.findFirst({
            where: { courseId: cId, id: mId },
            include: { course: { select: { id: true, title: true } } },
          });
        }
      }

      if (courseModule) {
        const lessonId = courseModule.sectionId?.startsWith("lesson:")
          ? courseModule.sectionId.replace("lesson:", "")
          : undefined;

        res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");
        res.json({
          ok: true,
          resource: {
            id: `c${courseModule.courseId}-m${courseModule.id}`,
            moduleId: courseModule.id,
            lessonId,
            title: courseModule.title,
            moduleName: courseModule.course?.title || `Module ${courseModule.courseId}`,
            courseId: courseModule.courseId,
            chapterName: courseModule.title,
            type: courseModule.type.toUpperCase() as "VIDEO" | "PDF",
            url: courseModule.attachmentUrl,
            duration: courseModule.duration || "—",
            fileName: courseModule.attachmentName || `${courseModule.title}.mp4`,
            instructor: "Prof Oussama",
          },
        });
        return;
      }

      // 3. Check LessonContent by ID or slug
      let cleanId = rawId.startsWith("lesson:") ? rawId.replace("lesson:", "") : rawId;
      let content = null;

      if (cleanId && cleanId !== "default") {
        content = await prisma.lessonContent.findFirst({
          where: {
            OR: [
              { id: cleanId },
              { title: { contains: cleanId, mode: "insensitive" } },
            ],
          },
          include: {
            attachments: { orderBy: { createdAt: "asc" } },
            course: { select: { id: true, title: true } },
            section: { include: { chapter: true } },
          },
        });
      }

      // 4. If still not found, check CourseModule by ID
      if (!content && cleanId && /^\d+$/.test(cleanId)) {
        const mId = parseInt(cleanId, 10);
        courseModule = await prisma.courseModule.findFirst({
          where: { id: mId },
          include: { course: { select: { id: true, title: true } } },
        });

        if (courseModule) {
          res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");
          res.json({
            ok: true,
            resource: {
              id: `c${courseModule.courseId}-m${courseModule.id}`,
              moduleId: courseModule.id,
              title: courseModule.title,
              moduleName: courseModule.course?.title || `Module ${courseModule.courseId}`,
              courseId: courseModule.courseId,
              chapterName: courseModule.title,
              type: courseModule.type.toUpperCase() as "VIDEO" | "PDF",
              url: courseModule.attachmentUrl,
              duration: courseModule.duration || "—",
              fileName: courseModule.attachmentName || `${courseModule.title}.mp4`,
              instructor: "Prof Oussama",
            },
          });
          return;
        }
      }

      // 5. Default fallback to featured TAF video in Analyse 1-PC
      if (!content) {
        content = await prisma.lessonContent.findFirst({
          where: {
            OR: [
              { id: "50427f3c-5dd8-4f53-aa7f-e91721c8749f" },
              { title: { contains: "accroissements", mode: "insensitive" } },
            ],
          },
          include: {
            attachments: { orderBy: { createdAt: "asc" } },
            course: { select: { id: true, title: true } },
            section: { include: { chapter: true } },
          },
        });
      }

      if (!content) {
        res.status(404).json({ error: "Ressource introuvable" });
        return;
      }

      const attachment = content.attachments[0];
      const safeUrl = attachment ? sanitizeCourseAttachmentUrl(attachment.url) || attachment.url : "";

      res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");
      res.json({
        ok: true,
        resource: {
          id: content.id,
          title: content.title,
          moduleName: content.course?.title || "Analyse 1-PC",
          courseId: content.courseId,
          chapterName: content.section?.chapter?.title || content.section?.title || "Théorème des accroissements finis",
          type: content.type,
          url: safeUrl,
          duration: "1h 09 min",
          fileName: attachment?.fileName || `${content.title}.mp4`,
          instructor: "Prof Oussama",
        },
      });
    } catch (err) {
      console.error("Public resource error:", err);
      res.status(500).json({ error: "Erreur lors de la récupération de la ressource" });
    }
  });
}
