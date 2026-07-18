import type { Express } from "express";
import { getAuthUser } from "../server/route-types";
import type { RouteContext } from "../server/route-context";
import * as api from "../server/route-deps";

// Published curriculum events: NEW_CHAPTER, NEW_SECTION, NEW_CONTENT, NEW_HOMEWORK, LIVE_REPLAY_AVAILABLE.

export function registerContentRoutes(app: Express, ctx: RouteContext): void {
  const { requireAuth, requireRbac, validateBody } = ctx.middleware;

  const refreshStudentCourseModules = async (courseId: number) => {
    await api.syncPublishedLessonModules(courseId);
  };

  app.post(
    "/api/courses/:courseId/chapters",
    requireAuth,
    requireRbac,
    validateBody(api.chapterSchema),
    async (req, res) => {
      const authUser = getAuthUser(req);

      const courseId = parseInt(req.params.courseId);

      if (!(await api.verifyCourseAccess(authUser, courseId))) {
        res.status(403).json({ error: "Accès refusé pour modifier ce module" });

        return;
      }

      const { title, description, published } = req.body;

      const course = await api.prisma.course.findUnique({ where: { id: courseId } });

      if (!course) {
        res.status(404).json({ error: api.PUBLIC_API_ERRORS.courseNotFound });
        return;
      }

      const order = await api.prisma.chapter.count({ where: { courseId } });

      const result = await api.prisma.$transaction(async (tx) => {
        const chapter = await tx.chapter.create({
          data: {
            courseId,

            title: title.trim(),

            description: typeof description === "string" ? description.trim() || null : null,

            order,

            published: Boolean(published),

            createdById: authUser.id,
          },
        });

        const section = await tx.contentSection.create({
          data: {
            courseId,

            chapterId: chapter.id,

            title: chapter.title,

            description: chapter.description,

            order,

            published: chapter.published,

            createdById: authUser.id,
          },
        });

        return { chapter, section };
      });

      api.logDb("INFO", "Chapter created", {
        courseId,
        chapterId: result.chapter.id,
        sectionId: result.section.id,
        userId: authUser.id,
      });

      if (result.chapter.published) {
        await refreshStudentCourseModules(courseId);
        await api.notifyPublishedChapter({
          chapterId: result.chapter.id,
          courseId,
          chapterTitle: result.chapter.title,
          published: result.chapter.published,
          actorId: authUser.id,
        });
      }

      res.status(201).json(result);
    },
  );

  // GET /api/courses/:courseId/chapters

  app.get("/api/courses/:courseId/chapters", requireAuth, async (req, res) => {
    const authUser = getAuthUser(req);

    const courseId = parseInt(req.params.courseId);

    const course = await api.prisma.course.findUnique({ where: { id: courseId } });

    if (!course) {
      res.status(404).json({ error: api.PUBLIC_API_ERRORS.courseNotFound });
      return;
    }

    if (authUser.role === "STUDENT" && !authUser.enrolledCourses.includes(courseId)) {
      res.status(403).json({ error: "Inscription requise pour consulter ces chapitres" });

      return;
    }

    if (authUser.role !== "STUDENT" && !(await api.verifyCourseAccess(authUser, courseId))) {
      res.status(403).json({ error: "Accès refusé pour consulter ces chapitres" });

      return;
    }

    const includeDrafts = authUser.role !== "STUDENT";

    const chapters = await api.prisma.chapter.findMany({
      where: { courseId, ...(includeDrafts ? {} : { published: true }) },

      include: {
        sections: {
          where: includeDrafts ? { parentId: null } : { parentId: null, published: true },

          orderBy: { order: "asc" },
        },
      },

      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });

    res.json(chapters);
  });

  // PUT /api/chapters/:id

  app.put(
    "/api/chapters/:id",
    requireAuth,
    requireRbac,
    validateBody(api.chapterSchema.partial()),
    async (req, res) => {
      const authUser = getAuthUser(req);

      if (!(await api.verifyChapterAccess(authUser, req.params.id))) {
        res.status(403).json({ error: "Accès refusé pour modifier ce chapitre" });

        return;
      }

      const existingChapter = await api.prisma.chapter.findUnique({
        where: { id: req.params.id },
        select: { published: true },
      });

      const { title, description, published, order } = req.body;

      const data: any = {};

      if (typeof title === "string" && title.trim()) data.title = title.trim();

      if (typeof description === "string" || description === null) data.description = description?.trim() || null;

      if (typeof published === "boolean") data.published = published;

      if (typeof order === "number") data.order = order;

      const result = await api.prisma.$transaction(async (tx) => {
        const chapter = await tx.chapter
          .update({
            where: { id: req.params.id },

            data,
          })
          .catch(() => null);

        if (!chapter) return null;

        const sectionData: any = {};

        if (data.title) sectionData.title = data.title;

        if ("description" in data) sectionData.description = data.description;

        if (typeof data.published === "boolean") sectionData.published = data.published;

        if (typeof data.order === "number") sectionData.order = data.order;

        if (Object.keys(sectionData).length > 0) {
          await tx.contentSection.updateMany({
            where: { chapterId: chapter.id, parentId: null },

            data: sectionData,
          });
        }

        return chapter;
      });

      if (!result) {
        res.status(404).json({ error: api.PUBLIC_API_ERRORS.chapterNotFound });
        return;
      }

      api.logDb("INFO", "Chapter updated", { chapterId: result.id, data: Object.keys(data) });

      if (typeof data.published === "boolean") {
        await refreshStudentCourseModules(result.courseId);
      }
      if (result.published && !existingChapter?.published) {
        await api.notifyPublishedChapter({
          chapterId: result.id,
          courseId: result.courseId,
          chapterTitle: result.title,
          published: result.published,
          actorId: authUser.id,
        });
      }

      res.json(result);
    },
  );

  // PATCH /api/chapters/:id

  app.patch("/api/chapters/:id", requireAuth, requireRbac, validateBody(api.chapterPatchSchema), async (req, res) => {
    const authUser = getAuthUser(req);

    if (!(await api.verifyChapterAccess(authUser, req.params.id))) {
      res.status(403).json({ error: "Accès refusé pour modifier ce chapitre" });

      return;
    }

    const existingChapter = await api.prisma.chapter.findUnique({
      where: { id: req.params.id },
      select: { published: true },
    });

    const { published } = req.body;

    const result = await api.prisma.$transaction(async (tx) => {
      const chapter = await tx.chapter
        .update({
          where: { id: req.params.id },

          data: { published },
        })
        .catch(() => null);

      if (!chapter) return null;

      await tx.contentSection.updateMany({
        where: { chapterId: chapter.id, parentId: null },

        data: { published },
      });

      return chapter;
    });

    if (!result) {
      res.status(404).json({ error: api.PUBLIC_API_ERRORS.chapterNotFound });
      return;
    }

    api.logDb("INFO", "Chapter publication updated", { chapterId: result.id, published });

    await refreshStudentCourseModules(result.courseId);

    if (published && !existingChapter?.published) {
      await api.notifyPublishedChapter({
        chapterId: result.id,
        courseId: result.courseId,
        chapterTitle: result.title,
        published: result.published,
        actorId: authUser.id,
      });
    }

    res.json(result);
  });

  // DELETE /api/chapters/:id

  app.delete("/api/chapters/:id", requireAuth, requireRbac, async (req, res) => {
    const authUser = getAuthUser(req);

    if (!(await api.verifyChapterAccess(authUser, req.params.id))) {
      res.status(403).json({ error: "Accès refusé pour supprimer ce chapitre" });

      return;
    }

    const chapter = await api.prisma.chapter.findUnique({
      where: { id: req.params.id },

      include: { sections: { where: { parentId: null }, select: { id: true } } },
    });

    if (!chapter) {
      res.status(404).json({ error: api.PUBLIC_API_ERRORS.chapterNotFound });
      return;
    }

    const fileKeys: string[] = [];

    await api.prisma.$transaction(async (tx) => {
      for (const section of chapter.sections) {
        const resTree = await api.deleteContentSectionTree(tx, section.id);

        fileKeys.push(...resTree.fileKeys);
      }

      await tx.chapter.delete({ where: { id: chapter.id } });
    });

    if (fileKeys.length > 0) {
      await api.deleteCloudFiles(fileKeys);
    }

    api.logDb("INFO", "Chapter deleted", { chapterId: chapter.id, courseId: chapter.courseId });

    res.json({ ok: true, deletedId: chapter.id });
  });

  // POST /api/courses/:courseId/sections

  app.post(
    "/api/courses/:courseId/sections",
    requireAuth,
    requireRbac,
    validateBody(api.sectionSchema),
    async (req, res) => {
      const authUser = getAuthUser(req);

      const courseId = parseInt(req.params.courseId);

      if (!(await api.verifyCourseAccess(authUser, courseId))) {
        res.status(403).json({ error: "Accès refusé pour modifier ce module" });

        return;
      }

      const { title, description, parentId, chapterId, published } = req.body;

      const course = await api.prisma.course.findUnique({ where: { id: courseId } });

      if (!course) {
        res.status(404).json({ error: api.PUBLIC_API_ERRORS.courseNotFound });
        return;
      }

      let parent: any = null;

      if (parentId) {
        parent = await api.prisma.contentSection.findFirst({ where: { id: String(parentId), courseId } });

        if (!parent) {
          res.status(404).json({ error: api.PUBLIC_API_ERRORS.parentSectionNotFound });
          return;
        }
      }

      const resolvedChapterId = parent?.chapterId || (typeof chapterId === "string" ? chapterId : null);

      if (resolvedChapterId) {
        const chapter = await api.prisma.chapter.findFirst({ where: { id: resolvedChapterId, courseId } });

        if (!chapter) {
          res.status(404).json({ error: api.PUBLIC_API_ERRORS.chapterNotFound });
          return;
        }
      }

      const order = await api.prisma.contentSection.count({
        where: { courseId, parentId: parent ? parent.id : null },
      });

      const section = await api.prisma.contentSection.create({
        data: {
          courseId,

          chapterId: resolvedChapterId,

          parentId: parent?.id || null,

          title: title.trim(),

          description: typeof description === "string" ? description.trim() || null : null,

          order,

          published: Boolean(published),

          createdById: authUser.id,
        },
      });

      api.logDb("INFO", "Content section created", {
        courseId,
        sectionId: section.id,
        parentId: section.parentId,
        userId: authUser.id,
      });

      if (section.published) {
        await refreshStudentCourseModules(section.courseId);
        await api.notifyPublishedSection({
          sectionId: section.id,
          courseId: section.courseId,
          sectionTitle: section.title,
          parentId: section.parentId,
          published: section.published,
          actorId: authUser.id,
        });
      }

      res.status(201).json(section);
    },
  );

  app.put(
    "/api/content-sections/:id",
    requireAuth,
    requireRbac,
    validateBody(api.sectionPatchSchema),
    async (req, res) => {
      const authUser = getAuthUser(req);

      if (!(await api.verifySectionAccess(authUser, req.params.id))) {
        res.status(403).json({ error: "Accès refusé pour modifier cette section" });

        return;
      }

      const existingSection = await api.prisma.contentSection.findUnique({
        where: { id: req.params.id },
        select: { published: true },
      });

      const { title, description, published, order } = req.body;

      const data: any = {};

      if (typeof title === "string" && title.trim()) data.title = title.trim();

      if (typeof description === "string" || description === null) data.description = description?.trim() || null;

      if (typeof published === "boolean") data.published = published;

      if (typeof order === "number") data.order = order;

      const section = await api.prisma.contentSection
        .update({
          where: { id: req.params.id },

          data,
        })
        .catch(() => null);

      if (!section) {
        res.status(404).json({ error: api.PUBLIC_API_ERRORS.sectionNotFound });
        return;
      }

      api.logDb("INFO", "Content section updated", { sectionId: section.id, data: Object.keys(data) });

      if (typeof data.published === "boolean") {
        await refreshStudentCourseModules(section.courseId);
      }
      if (section.published && !existingSection?.published) {
        await api.notifyPublishedSection({
          sectionId: section.id,
          courseId: section.courseId,
          sectionTitle: section.title,
          parentId: section.parentId,
          published: section.published,
          actorId: authUser.id,
        });
      }

      res.json(section);
    },
  );

  // PATCH /api/content-sections/:id

  app.patch(
    "/api/content-sections/:id",
    requireAuth,
    requireRbac,
    validateBody(api.sectionPatchSchema),
    async (req, res) => {
      const authUser = getAuthUser(req);

      if (!(await api.verifySectionAccess(authUser, req.params.id))) {
        res.status(403).json({ error: "Accès refusé pour modifier cette section" });

        return;
      }

      const existingSection = await api.prisma.contentSection.findUnique({
        where: { id: req.params.id },
        select: { published: true },
      });

      const { title, description, published } = req.body;

      const data: any = {};

      if (typeof title === "string" && title.trim()) data.title = title.trim();

      if (typeof description === "string" || description === null) data.description = description?.trim() || null;

      if (typeof published === "boolean") data.published = published;

      const section = await api.prisma.contentSection
        .update({
          where: { id: req.params.id },

          data,
        })
        .catch(() => null);

      if (!section) {
        res.status(404).json({ error: api.PUBLIC_API_ERRORS.sectionNotFound });
        return;
      }

      api.logDb("INFO", "Content section updated", { sectionId: section.id, published: section.published });

      if (typeof published === "boolean") {
        await refreshStudentCourseModules(section.courseId);
      }
      if (section.published && !existingSection?.published) {
        await api.notifyPublishedSection({
          sectionId: section.id,
          courseId: section.courseId,
          sectionTitle: section.title,
          parentId: section.parentId,
          published: section.published,
          actorId: authUser.id,
        });
      }

      res.json(section);
    },
  );

  // DELETE /api/content-sections/:id

  app.delete("/api/content-sections/:id", requireAuth, requireRbac, async (req, res) => {
    const authUser = getAuthUser(req);

    if (!(await api.verifySectionAccess(authUser, req.params.id))) {
      res.status(403).json({ error: "Accès refusé pour supprimer cette section" });

      return;
    }

    const section = await api.prisma.contentSection.findUnique({ where: { id: req.params.id } });

    if (!section) {
      res.status(404).json({ error: api.PUBLIC_API_ERRORS.sectionNotFound });
      return;
    }

    let fileKeys: string[] = [];

    const result = await api.prisma.$transaction(async (tx) => {
      const resTree = await api.deleteContentSectionTree(tx, section.id);

      fileKeys = resTree.fileKeys;

      return resTree;
    });

    if (fileKeys.length > 0) {
      await api.deleteCloudFiles(fileKeys);
    }

    api.logDb("INFO", "Content section deleted", { sectionId: section.id, descendants: result.sectionCount - 1 });

    res.json({ ok: true, deletedId: section.id });
  });

  // POST /api/content-sections/:sectionId/contents

  app.post(
    "/api/content-sections/:sectionId/contents",
    requireAuth,
    requireRbac,
    validateBody(api.textContentSchema),
    async (req, res) => {
      const authUser = getAuthUser(req);

      if (!(await api.verifySectionAccess(authUser, req.params.sectionId))) {
        res.status(403).json({ error: "Accès refusé pour modifier cette section" });

        return;
      }

      const section = await api.prisma.contentSection.findUnique({ where: { id: req.params.sectionId } });

      if (!section) {
        res.status(404).json({ error: api.PUBLIC_API_ERRORS.sectionNotFound });
        return;
      }

      const { title, body, published } = req.body;

      if (!title || !body) {
        res.status(400).json({ error: api.PUBLIC_API_ERRORS.titleBodyRequired });
        return;
      }

      const content = await api.prisma.lessonContent.create({
        data: {
          courseId: section.courseId,

          sectionId: section.id,

          type: "TEXT",

          title: title.trim(),

          body: body.trim(),

          published: Boolean(published),

          createdById: authUser.id,
        },

        include: { attachments: true },
      });

      api.logDb("INFO", "Text lesson content created", {
        contentId: content.id,
        sectionId: section.id,
        userId: authUser.id,
      });

      if (content.published) {
        await refreshStudentCourseModules(section.courseId);
        await api.notifyPublishedLessonContent({
          contentId: content.id,
          courseId: content.courseId,
          contentTitle: content.title,
          contentType: content.type,
          body: content.body,
          sectionTitle: section.title,
          published: content.published,
          actorId: authUser.id,
        });
      }

      res.status(201).json(api.toLessonContent(content));
    },
  );

  // PUT /api/lesson-contents/:id

  app.put(
    "/api/lesson-contents/:id",
    requireAuth,
    requireRbac,
    validateBody(api.textContentPatchSchema),
    async (req, res) => {
      const authUser = getAuthUser(req);

      if (!(await api.verifyContentAccess(authUser, req.params.id))) {
        res.status(403).json({ error: "Accès refusé pour modifier ce contenu" });

        return;
      }

      const existingContent = await api.prisma.lessonContent.findUnique({
        where: { id: req.params.id },
        select: { published: true },
      });

      const { title, body, published } = req.body;

      const data: any = {};

      if (typeof title === "string" && title.trim()) data.title = title.trim();

      if (typeof body === "string" || body === null) data.body = body?.trim() || null;

      if (typeof published === "boolean") data.published = published;

      const content = await api.prisma.lessonContent
        .update({
          where: { id: req.params.id },

          data,

          include: { attachments: true },
        })
        .catch(() => null);

      if (!content) {
        res.status(404).json({ error: api.PUBLIC_API_ERRORS.contentNotFound });
        return;
      }

      api.logDb("INFO", "Lesson content updated", { contentId: content.id, data: Object.keys(data) });

      await refreshStudentCourseModules(content.courseId);

      if (content.published && !existingContent?.published) {
        const section = content.sectionId
          ? await api.prisma.contentSection.findUnique({
              where: { id: content.sectionId },
              select: { title: true },
            })
          : null;
        await api.notifyPublishedLessonContent({
          contentId: content.id,
          courseId: content.courseId,
          contentTitle: content.title,
          contentType: content.type,
          body: content.body,
          sectionTitle: section?.title || "",
          published: content.published,
          actorId: authUser.id,
        });
      }

      res.json(api.toLessonContent(content));
    },
  );

  // PATCH /api/lesson-contents/:id

  app.patch(
    "/api/lesson-contents/:id",
    requireAuth,
    requireRbac,
    validateBody(api.textContentPatchSchema),
    async (req, res) => {
      const authUser = getAuthUser(req);

      if (!(await api.verifyContentAccess(authUser, req.params.id))) {
        res.status(403).json({ error: "Accès refusé pour modifier ce contenu" });

        return;
      }

      const existingContent = await api.prisma.lessonContent.findUnique({
        where: { id: req.params.id },
        select: { published: true },
      });

      const { title, body, published } = req.body;

      const data: any = {};

      if (typeof title === "string" && title.trim()) data.title = title.trim();

      if (typeof body === "string" || body === null) data.body = body?.trim() || null;

      if (typeof published === "boolean") data.published = published;

      const content = await api.prisma.lessonContent
        .update({
          where: { id: req.params.id },

          data,

          include: { attachments: true },
        })
        .catch(() => null);

      if (!content) {
        res.status(404).json({ error: api.PUBLIC_API_ERRORS.contentNotFound });
        return;
      }

      api.logDb("INFO", "Lesson content updated", { contentId: content.id, published: content.published });

      await refreshStudentCourseModules(content.courseId);

      if (content.published && !existingContent?.published) {
        const section = content.sectionId
          ? await api.prisma.contentSection.findUnique({
              where: { id: content.sectionId },
              select: { title: true },
            })
          : null;
        await api.notifyPublishedLessonContent({
          contentId: content.id,
          courseId: content.courseId,
          contentTitle: content.title,
          contentType: content.type,
          body: content.body,
          sectionTitle: section?.title || "",
          published: content.published,
          actorId: authUser.id,
        });
      }

      res.json(api.toLessonContent(content));
    },
  );

  // DELETE /api/lesson-contents/:id

  app.delete("/api/lesson-contents/:id", requireAuth, requireRbac, async (req, res) => {
    const authUser = getAuthUser(req);

    if (!(await api.verifyContentAccess(authUser, req.params.id))) {
      res.status(403).json({ error: "Accès refusé pour supprimer ce contenu" });

      return;
    }

    const content = await api.prisma.lessonContent.findUnique({ where: { id: req.params.id } });

    if (!content) {
      res.status(404).json({ error: api.PUBLIC_API_ERRORS.contentNotFound });
      return;
    }

    const attachments = await api.prisma.attachment.findMany({ where: { contentId: content.id } });

    const fileKeys = attachments.map((a) => a.fileKey);

    await api.prisma.$transaction(async (tx) => {
      await tx.attachment.deleteMany({ where: { contentId: content.id } });

      await tx.lessonContent.delete({ where: { id: content.id } });
    });

    if (fileKeys.length > 0) {
      await api.deleteCloudFiles(fileKeys);
    }

    api.logDb("INFO", "Lesson content deleted", { contentId: content.id });

    await refreshStudentCourseModules(content.courseId);

    res.json({ ok: true });
  });

  app.get("/api/lesson-contents/:contentId/document", requireAuth, async (req, res) => {
    const authUser = getAuthUser(req);

    try {
      const result = await api.streamLessonContentDocument(req.params.contentId, authUser);
      if (!result.ok) {
        res.status(result.status).json({ error: result.error });
        return;
      }

      res.setHeader("Content-Type", result.contentType);
      res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(result.fileName)}"`);
      res.setHeader("Cache-Control", "private, no-store");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.send(result.bytes);
    } catch (err) {
      api.logDb("ERROR", "Lesson document stream failed", {
        contentId: req.params.contentId,
        userId: authUser.id,
        error: String(err),
      });
      res.status(502).json({ error: "Impossible de charger le document" });
    }
  });

  app.get("/api/lesson-contents/:contentId/media-source", requireAuth, async (req, res) => {
    const authUser = getAuthUser(req);
    try {
      const result = await api.resolveLessonContentMediaSource(req.params.contentId, authUser);
      res.setHeader("Cache-Control", "private, no-store");
      if (!result.ok) {
        res.status(result.status).json({ error: result.error });
        return;
      }
      res.json({ sourceUrl: result.sourceUrl, mimeType: result.mimeType });
    } catch (err) {
      api.logDb("ERROR", "Lesson media source resolution failed", {
        contentId: req.params.contentId,
        userId: authUser.id,
        error: String(err),
      });
      res.status(502).json({ error: "Impossible de charger la vidéo" });
    }
  });
}
