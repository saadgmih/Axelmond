import type { Express } from "express";
import { getAuthUser } from "../server/route-types";
import type { CourseModule } from "../server/route-deps";
import type { RouteContext } from "../server/route-context";
import * as api from "../server/route-deps";

const CATALOG_QUERY_TIMEOUT_MS = Number(process.env.CATALOG_QUERY_TIMEOUT_MS) || 15000;

async function withCatalogTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`${label} timed out after ${CATALOG_QUERY_TIMEOUT_MS}ms`));
        }, CATALOG_QUERY_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function registerCoursesRoutes(app: Express, ctx: RouteContext): void {
  const { requireAuth, requireRbac, validateBody } = ctx.middleware;

  // GET /api/courses

  app.get("/api/courses", async (req, res, next) => {
    try {
      const authUser = await api.getOptionalAuthUser(req);

      const domainId = Number(req.query.domainId) || 0;

      const disciplineId = Number(req.query.disciplineId) || 0;

      // Cache uniquement pour visiteurs anonymes, clé incluant les filtres
      const cacheKey = authUser ? null : `api:courses:public:d=${domainId}:dis=${disciplineId}`;
      if (cacheKey) {
        const cached = await api.cacheGet(cacheKey);

        if (cached) {
          res.json(JSON.parse(cached));
          return;
        }
      }

      const where: any =
        authUser?.role === "ADMIN"
          ? {}
          : authUser && (authUser.role === "PROFESSOR" || authUser.role === "RESEARCHER")
            ? { createdById: authUser.id }
            : authUser?.role === "STUDENT"
              ? (() => {
                  const enrolledIds = authUser.enrolledCourses.filter((id) => Number.isInteger(id) && id > 0);
                  return enrolledIds.length > 0
                    ? { OR: [{ published: true }, { id: { in: enrolledIds } }] }
                    : { published: true };
                })()
              : { published: true };

      if (Number.isInteger(disciplineId) && disciplineId > 0) {
        where.disciplineId = disciplineId;
      } else if (Number.isInteger(domainId) && domainId > 0) {
        const disciplineIds = await withCatalogTimeout(
          api.prisma.discipline.findMany({
            where: { domainId },
            select: { id: true },
          }),
          "discipline lookup",
        );

        where.disciplineId = { in: disciplineIds.map((discipline) => discipline.id) };
      }

      const courses = await withCatalogTimeout(
        api.prisma.course.findMany({
          where,
          include: api.courseResponseInclude,
          orderBy: { id: "asc" },
        }),
        "course catalog query",
      );

      let payload;
      if (authUser?.role === "STUDENT") {
        payload = await api.toCoursesForStudent(courses, authUser.id, authUser.enrolledCourses);
      } else {
        payload = courses.map((course) => api.toCourse(course));
      }

      api.logDb("INFO", "Academic modules listed", {
        userId: authUser?.id,

        role: authUser?.role || "PUBLIC",

        ownershipScope:
          authUser && (authUser.role === "PROFESSOR" || authUser.role === "RESEARCHER")
            ? "OWN_MODULES_ONLY"
            : "DEFAULT",

        count: payload.length,
      });

      if (cacheKey) await api.cacheSet(cacheKey, JSON.stringify(payload), Number(process.env.CACHE_TTL_SECONDS) || 60);

      res.json(payload);
    } catch (err) {
      api.logDb("ERROR", "Academic modules listing failed", {
        error: String(err),
        path: req.path,
      });
      if (String(err).includes("timed out")) {
        res.status(503).json({ error: "Catalogue temporairement indisponible", code: "CATALOG_TIMEOUT" });
        return;
      }
      next(err);
    }
  });

  // POST /api/courses (Teacher creates a real persisted course)

  app.post("/api/courses", requireAuth, requireRbac, validateBody(api.courseSchema), async (req, res) => {
    const authUser = getAuthUser(req);

    const { title, credits, duration, category, disciplineId, price, instructor, description, published } = req.body;

    const discipline = await api.prisma.discipline.findUnique({ where: { id: Number(disciplineId) } });

    if (!discipline) {
      res.status(400).json({ error: "Discipline académique invalide" });

      return;
    }

    const course = await api.prisma.course.create({
      data: {
        title,

        level: api.DEFAULT_MODULE_CLASSIFICATION,

        credits,

        duration,

        category: category || discipline.name,

        disciplineId: discipline.id,

        price,

        iconName: "Code",

        color: "bg-blue-100",

        instructor: instructor || authUser.fullName,

        description,

        progress: 0,

        isLiveNow: false,

        published,

        createdById: authUser.id,
      },

      include: api.courseResponseInclude,
    });

    await api.logAudit(
      authUser.id,
      authUser.email,
      "CREATE_COURSE",
      "Course",
      String(course.id),
      { title: course.title },
      req.ip,
    );

    api.logDb("INFO", "Course created", {
      courseId: course.id,
      userId: authUser.id,
      disciplineId: course.disciplineId,
      published: course.published,
    });

    // Invalidation du cache public (le nouveau module doit apparaître immédiatement)

    await api.invalidatePublicCatalogCache();

    res.status(201).json(api.toCourse(course));
  });

  // GET /api/courses/:id

  app.get("/api/courses/:id", async (req, res) => {
    const authUser = await api.getOptionalAuthUser(req);

    let course = await api.prisma.course.findUnique({
      where: { id: parseInt(req.params.id) },
      include: api.courseResponseInclude,
    });

    if (!course) {
      res.status(404).json({ error: api.PUBLIC_API_ERRORS.courseNotFound });

      return;
    }

    if (authUser?.role === "STUDENT" && authUser.enrolledCourses.includes(course.id)) {
      await api.syncPublishedLessonModules(course.id);
      const refreshed = await api.attachSyncedCourseModules([course]);
      course = refreshed[0] ?? course;
    }

    if (!course.published) {
      if (!authUser || authUser.role === "STUDENT") {
        res.status(404).json({ error: api.PUBLIC_API_ERRORS.courseNotFound });

        return;
      }

      if (!(await api.verifyCourseAccess(authUser, course.id))) {
        res.status(403).json({ error: "Accès refusé pour consulter ce module" });

        return;
      }
    }

    res.json(authUser ? await api.toCourseForUser(course, authUser) : api.toCourse(course));
  });

  // GET /api/courses/:id/content

  app.get("/api/courses/:id/content", requireAuth, async (req, res) => {
    const authUser = getAuthUser(req);

    const courseId = parseInt(req.params.id);

    const course = await api.prisma.course.findUnique({ where: { id: courseId } });

    if (!course) {
      res.status(404).json({ error: api.PUBLIC_API_ERRORS.courseNotFound });
      return;
    }

    if (authUser.role === "STUDENT" && !authUser.enrolledCourses.includes(courseId)) {
      res.status(403).json({ error: "Inscription requise pour consulter ce contenu" });

      return;
    }

    if (authUser.role !== "STUDENT" && !(await api.verifyCourseAccess(authUser, courseId))) {
      res.status(403).json({ error: "Accès refusé pour consulter ce module" });

      return;
    }

    const includeDrafts = authUser.role !== "STUDENT";

    res.json(await api.getCourseContentTree(courseId, includeDrafts));
  });

  // GET /api/courses/:courseId/module-contents

  app.get("/api/courses/:courseId/module-contents", requireAuth, async (req, res) => {
    const authUser = getAuthUser(req);

    const courseId = parseInt(req.params.courseId);

    const course = await api.prisma.course.findUnique({ where: { id: courseId } });

    if (!course) {
      res.status(404).json({ error: "Module introuvable" });
      return;
    }

    if (authUser.role === "STUDENT" && !authUser.enrolledCourses.includes(courseId)) {
      res.status(403).json({ error: "Inscription requise pour consulter ce contenu" });

      return;
    }

    if (authUser.role !== "STUDENT" && !(await api.verifyCourseAccess(authUser, courseId))) {
      res.status(403).json({ error: "Accès refusé pour consulter ce module" });

      return;
    }

    const includeDrafts = authUser.role !== "STUDENT";

    const contents = await api.prisma.lessonContent.findMany({
      where: {
        courseId,

        sectionId: null,

        ...(includeDrafts ? {} : { published: true }),
      },

      include: { attachments: true },

      orderBy: [{ createdAt: "asc" }],
    });

    res.json(contents.map(api.toLessonContent));
  });

  // POST /api/courses/:courseId/chapters

  // GET /api/courses/:courseId/grades

  // POST /api/courses/:courseId/modules/:moduleId/complete

  app.post("/api/courses/:courseId/modules/:moduleId/complete", requireAuth, requireRbac, async (req, res) => {
    const authUser = getAuthUser(req);

    const courseId = parseInt(req.params.courseId);

    if (authUser.role === "STUDENT" && !authUser.enrolledCourses.includes(courseId)) {
      res.status(403).json({ error: "Inscription requise pour compléter ce module" });

      return;
    }

    const moduleId = parseInt(req.params.moduleId);

    const course = await api.findCourse(courseId);

    if (!course) {
      res.status(404).json({ error: api.PUBLIC_API_ERRORS.courseNotFound });
      return;
    }

    const mod = course.modules.find((m) => m.id === moduleId);

    if (!mod) {
      res.status(404).json({ error: api.PUBLIC_API_ERRORS.courseModuleNotFound });
      return;
    }

    await api.setStudentModuleCompletion({
      userId: authUser.id,
      courseId: course.id,
      module: mod,
      completed: true,
    });

    res.json(await api.toCourseForUser(course, authUser));
  });

  // PUT /api/courses/:courseId/modules/:moduleId/progress

  app.put("/api/courses/:courseId/modules/:moduleId/progress", requireAuth, requireRbac, async (req, res) => {
    const authUser = getAuthUser(req);

    const courseId = parseInt(req.params.courseId);

    if (authUser.role === "STUDENT" && !authUser.enrolledCourses.includes(courseId)) {
      res.status(403).json({ error: "Inscription requise pour modifier cette progression" });

      return;
    }

    const moduleId = parseInt(req.params.moduleId);

    const course = await api.findCourse(courseId);

    if (!course) {
      res.status(404).json({ error: api.PUBLIC_API_ERRORS.courseNotFound });
      return;
    }

    const mod = course.modules.find((m) => m.id === moduleId);

    if (!mod) {
      res.status(404).json({ error: api.PUBLIC_API_ERRORS.courseModuleNotFound });
      return;
    }

    await api.setStudentModuleCompletion({
      userId: authUser.id,
      courseId: course.id,
      module: mod,
      completed: Boolean(req.body?.completed),
    });

    res.json(await api.toCourseForUser(course, authUser));
  });

  // POST /api/courses/:courseId/modules (Teacher adds module)

  app.post("/api/courses/:courseId/modules", requireAuth, requireRbac, async (req, res) => {
    const authUser = getAuthUser(req);

    const courseId = parseInt(req.params.courseId);

    if (!(await api.verifyCourseAccess(authUser, courseId))) {
      res.status(403).json({ error: "Accès refusé pour modifier ce module" });

      return;
    }

    const dbCourse = await api.prisma.course.findUnique({
      where: { id: courseId },
      include: { courseModules: { orderBy: { sortOrder: "asc" } } },
    });

    if (!dbCourse) {
      res.status(404).json({ error: api.PUBLIC_API_ERRORS.courseNotFound });
      return;
    }

    const { title, type, duration, contentMarkdown } = req.body;

    if (!title || !type || !duration) {
      res.status(400).json({ error: api.PUBLIC_API_ERRORS.titleTypeDurationRequired });

      return;
    }

    const nextId = await api.getNextCourseModuleId(dbCourse.id);

    const newModule: CourseModule = {
      id: nextId,

      title,

      type,

      duration,

      completed: false,

      contentMarkdown:
        type === "pdf"
          ? contentMarkdown ||
            "### Introduction théorique\nCe manuel a été rédigé par l'équipe enseignante d'Axelmond Research Labs."
          : undefined,
    };

    const sortOrder = dbCourse.courseModules.length;

    const updatedCourse = await api.prisma.$transaction(async (tx) => {
      await tx.courseModule.create({
        data: api.courseModuleRowFromJsonItem(dbCourse.id, newModule, sortOrder),
      });
      return tx.course.findUniqueOrThrow({
        where: { id: dbCourse.id },
        include: api.courseResponseInclude,
      });
    });

    res.json(api.toCourse(updatedCourse));
  });

  // PUT /api/courses/:courseId (Teacher updates course identity)

  app.put("/api/courses/:courseId", requireAuth, requireRbac, validateBody(api.courseSchema), async (req, res) => {
    const authUser = getAuthUser(req);

    const courseId = parseInt(req.params.courseId);

    if (!(await api.verifyCourseAccess(authUser, courseId))) {
      res.status(403).json({ error: "Accès refusé pour modifier ce module" });

      return;
    }

    const course = await api.prisma.course.findUnique({ where: { id: courseId } });

    if (!course) {
      res.status(404).json({ error: api.PUBLIC_API_ERRORS.courseNotFound });
      return;
    }

    const { title, credits, duration, category, disciplineId, price, instructor, description, published } = req.body;

    const discipline = await api.prisma.discipline.findUnique({ where: { id: Number(disciplineId) } });

    if (!discipline) {
      res.status(400).json({ error: "Discipline académique invalide" });

      return;
    }

    const updatedCourse = await api.prisma.course.update({
      where: { id: course.id },

      data: {
        title,

        level: api.DEFAULT_MODULE_CLASSIFICATION,

        credits,

        duration,

        category: category || discipline.name,

        disciplineId: discipline.id,

        price,

        instructor: instructor || authUser.fullName,

        description,

        published,
      },

      include: api.courseResponseInclude,
    });

    await api.logAudit(
      authUser.id,
      authUser.email,
      "UPDATE_COURSE",
      "Course",
      String(course.id),
      { title: updatedCourse.title },
      req.ip,
    );

    api.logDb("INFO", "Course updated", { courseId: course.id, fields: Object.keys(req.body) });

    await api.invalidatePublicCatalogCache();

    res.json(api.toCourse(updatedCourse));
  });

  // PATCH /api/courses/:courseId (Teacher updates course metadata/live state)

  app.patch(
    "/api/courses/:courseId",
    requireAuth,
    requireRbac,
    validateBody(api.coursePatchSchema),
    async (req, res) => {
      const authUser = getAuthUser(req);

      const courseId = parseInt(req.params.courseId);

      if (!(await api.verifyCourseAccess(authUser, courseId))) {
        res.status(403).json({ error: "Accès refusé pour modifier ce module" });

        return;
      }

      const course = await api.prisma.course.findUnique({ where: { id: courseId } });

      if (!course) {
        res.status(404).json({ error: api.PUBLIC_API_ERRORS.courseNotFound });
        return;
      }

      const updatedCourse = await api.prisma.$transaction(async (tx) => {
        const updated = await tx.course.update({
          where: { id: course.id },

          data: req.body,
        });

        const shouldSyncLiveSession =
          typeof req.body.isLiveNow === "boolean" || typeof req.body.liveSubject !== "undefined";

        if (shouldSyncLiveSession) {
          const roomName = api.buildLiveKitRoomName(course.id);

          if (updated.isLiveNow) {
            const liveStartedAt = course.isLiveNow ? undefined : new Date();

            const session = await tx.liveSession.upsert({
              where: { roomName },

              update: {
                title: updated.liveSubject || null,

                isActive: true,

                endTime: null,

                professorId: authUser.id,

                ...(liveStartedAt ? { startTime: liveStartedAt } : {}),
              },

              create: {
                roomName,

                title: updated.liveSubject || null,

                courseId: course.id,

                professorId: authUser.id,

                startTime: liveStartedAt || new Date(),
              },
            });

            api.logLiveKit("INFO", "Live session synced", {
              courseId: course.id,
              roomName,
              isLiveNow: true,
              startedAt: session.startTime.toISOString(),
            });
          } else if (typeof req.body.isLiveNow === "boolean") {
            await tx.liveSession.updateMany({
              where: { roomName, isActive: true, endTime: null },

              data: { title: updated.liveSubject || null, isActive: false, endTime: new Date() },
            });

            api.logLiveKit("INFO", "Live session synced", { courseId: course.id, roomName, isLiveNow: false });
          }
        }

        return tx.course.findUnique({ where: { id: course.id }, include: api.courseResponseInclude });
      });

      await api.logAudit(authUser.id, authUser.email, "PATCH_COURSE", "Course", String(course.id), req.body, req.ip);

      await api.invalidatePublicCatalogCache();

      if (typeof req.body.isLiveNow === "boolean" && !req.body.isLiveNow && course.isLiveNow) {
        const liveKitConfig = api.getLiveKitConfig(process.env);
        if (liveKitConfig) {
          const roomName = api.buildLiveKitRoomName(course.id);
          await api
            .endLiveKitRoom(liveKitConfig, roomName)
            .then(() => {
              api.logLiveKit("INFO", "LiveKit room closed after live stop", { courseId: course.id, roomName });
            })
            .catch((err) => {
              api.logLiveKit("WARN", "LiveKit room shutdown failed after live stop", {
                courseId: course.id,
                roomName,
                error: String(err),
              });
            });
        }
      }

      if (updatedCourse?.isLiveNow && !course.isLiveNow) {
        await api
          .notifyEnrolledStudentsForCourse(course.id, {
            type: "LIVE_STARTED",

            title: "Séance live en cours",

            body: `${updatedCourse.liveSubject || updatedCourse.title} est en direct`,

            actionUrl: "/student/live",

            metadata: { courseId: course.id },
          })
          .catch(() => undefined);
      } else if (typeof req.body.isLiveNow === "boolean" && !req.body.isLiveNow && course.isLiveNow) {
        await api
          .notifyEnrolledStudentsForCourse(course.id, {
            type: "LIVE_FINISHED",

            title: "Séance live terminée",

            body: `La séance en direct pour ${course.title} est terminée`,

            metadata: { courseId: course.id },
          })
          .catch(() => undefined);
      }

      res.json(api.toCourse(updatedCourse));
    },
  );

  // DELETE /api/courses/:courseId

  app.delete("/api/courses/:courseId", requireAuth, requireRbac, async (req, res) => {
    const authUser = getAuthUser(req);

    const courseId = parseInt(req.params.courseId);

    if (!(await api.verifyCourseAccess(authUser, courseId))) {
      res.status(403).json({ error: "Accès refusé pour supprimer ce module" });

      return;
    }

    const course = await api.prisma.course.findUnique({ where: { id: courseId } });

    if (!course) {
      res.status(404).json({ error: api.PUBLIC_API_ERRORS.courseNotFound });
      return;
    }

    const fileKeys: string[] = [];

    await api.prisma.$transaction(async (tx) => {
      const contents = await tx.lessonContent.findMany({ where: { courseId }, select: { id: true } });

      const contentIds = contents.map((content: any) => content.id);

      const sessions = await tx.liveSession.findMany({ where: { courseId }, select: { id: true } });

      const sessionIds = sessions.map((session: any) => session.id);

      if (contentIds.length > 0) {
        const attachments = await tx.attachment.findMany({
          where: { contentId: { in: contentIds } },

          select: { fileKey: true },
        });

        fileKeys.push(...attachments.map((a: any) => a.fileKey));

        await tx.attachment.deleteMany({ where: { contentId: { in: contentIds } } });
      }

      await tx.lessonContent.deleteMany({ where: { courseId } });

      await tx.contentSection.deleteMany({ where: { courseId } });

      await tx.chapter.deleteMany({ where: { courseId } });

      if (sessionIds.length > 0) await tx.liveMessage.deleteMany({ where: { sessionId: { in: sessionIds } } });

      await tx.liveSession.deleteMany({ where: { courseId } });

      await tx.enrollment.deleteMany({ where: { courseId } });

      await tx.course.delete({ where: { id: courseId } });
    });

    if (fileKeys.length > 0) {
      await api.deleteCloudFiles(fileKeys);
    }

    await api.logAudit(
      authUser.id,
      authUser.email,
      "DELETE_COURSE",
      "Course",
      String(courseId),
      { title: course.title },
      req.ip,
    );

    api.logDb("INFO", "Course deleted", { courseId });

    await api.invalidatePublicCatalogCache();

    res.json({ ok: true, deletedId: courseId });
  });

  // POST /api/courses/:courseId/free-enroll — inscription gratuite (prix serveur = 0 DH)
  app.post("/api/courses/:courseId/free-enroll", requireAuth, requireRbac, async (req, res) => {
    const authUser = getAuthUser(req);
    const courseId = api.parsePositiveInt(req.params.courseId);
    if (!courseId) {
      res.status(400).json({ error: "Identifiant de module invalide" });
      return;
    }

    const promoCode = String(req.body?.promoCode || "").trim();
    const persistCoursePaymentEnrollment = (params: Parameters<typeof api.persistCoursePaymentWithAudit>[0]) =>
      api.persistCoursePaymentWithAudit(params);

    try {
      const result = await api.processFreeCourseEnrollment({
        userId: authUser.id,
        role: authUser.role,
        courseId,
        promoCode: promoCode || undefined,
        reqIp: req.ip,
        persistCoursePaymentEnrollment,
      });

      if (result.ok === false) {
        res.status(result.status).json({ error: result.error, code: result.code });
        return;
      }

      if (result.duplicate) {
        api.logSecurity("INFO", "Free enrollment duplicate ignored", {
          userId: authUser.id,
          courseId,
        });
      }

      res.json({
        ok: true,
        message: result.message,
        invoice: result.invoice,
        user: result.user,
      });
    } catch (err) {
      api.logDb("ERROR", "Free enrollment failed", { userId: authUser.id, courseId, error: String(err) });
      res.status(500).json({ error: "Erreur lors de l'inscription gratuite" });
    }
  });

  // PUT /api/content-sections/:id
}
