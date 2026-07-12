import type { Express } from "express";
import { getAuthUser } from "../server/route-types";
import type { CourseModule } from "../server/route-deps";
import type { RouteContext } from "../server/route-context";
import { getActiveEnrolledCourseIds } from "../enrollment-access";
import { buildCatalogCourseVisibilityWhere } from "../catalog-visibility";
import { resolveFreeAccessWindowForSave } from "../course-free-access-window";
import * as api from "../server/route-deps";

const CATALOG_QUERY_TIMEOUT_MS = Number(process.env.CATALOG_QUERY_TIMEOUT_MS) || 15000;

function resolveFreeAccessWindow(
  price: number,
  startsAt?: Date | string | null,
  endsAt?: Date | string | null,
) {
  if (price > 0) return { freeAccessStartsAt: null, freeAccessEndsAt: null, freeAccessDurationDays: null };
  const window = resolveFreeAccessWindowForSave(startsAt, endsAt);
  if (!window) {
    return { freeAccessStartsAt: null, freeAccessEndsAt: null, freeAccessDurationDays: null };
  }
  return window;
}

function isInvalidFreeAccessWindow(price: number, window: { freeAccessStartsAt: Date | null; freeAccessEndsAt: Date | null }) {
  if (price > 0) return false;
  if (!window.freeAccessStartsAt || !window.freeAccessEndsAt) return true;
  return window.freeAccessEndsAt <= window.freeAccessStartsAt;
}

function patchTouchesPricing(body: Record<string, unknown>) {
  return (
    typeof body.price === "number" ||
    body.freeAccessStartsAt !== undefined ||
    body.freeAccessEndsAt !== undefined ||
    body.freeAccessDurationDays !== undefined
  );
}

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
      const dbUser = await api.getOptionalAuthDbUser(req);
      const authUser = dbUser ? api.toAppUser(dbUser) : null;

      const domainId = Number(req.query.domainId) || 0;

      const disciplineId = Number(req.query.disciplineId) || 0;
      const bypassCache = req.query.fresh === "1";

      const isStudent = authUser?.role === "STUDENT";
      let cacheKey: string | null = null;
      if (!bypassCache) {
        if (!authUser) {
          cacheKey = `api:courses:public:d=${domainId}:dis=${disciplineId}`;
        } else if (isStudent) {
          cacheKey = `api:courses:student:${authUser.id}:d=${domainId}:dis=${disciplineId}`;
        }
      }

      if (cacheKey) {
        const cached = await api.cacheGet(cacheKey);

        if (cached) {
          res.json(JSON.parse(cached));
          return;
        }
      }

      const studentEnrolledIds = isStudent && dbUser ? getActiveEnrolledCourseIds(dbUser.enrollments) : [];

      const visibilityWhere = buildCatalogCourseVisibilityWhere({
        role: authUser?.role ?? null,
        userId: authUser?.id ?? null,
        fullName: authUser?.fullName ?? null,
        studentEnrolledIds,
      });

      const where: any = { ...visibilityWhere };

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
          include: api.courseListResponseInclude,
          orderBy: { id: "asc" },
        }),
        "course catalog query",
      );

      let payload;
      if (authUser?.role === "STUDENT" && dbUser) {
        payload = await api.toCoursesForStudent(
          courses,
          authUser.id,
          studentEnrolledIds,
          dbUser.enrollments,
          { skipModuleSync: true },
        );
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

      if (cacheKey) {
        const ttl = isStudent
          ? Number(process.env.STUDENT_CATALOG_CACHE_SECONDS) || Number(process.env.CACHE_TTL_SECONDS) || 60
          : Number(process.env.CACHE_TTL_SECONDS) || 60;
        await api.cacheSet(cacheKey, JSON.stringify(payload), ttl);
      }

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

    const {
      title,
      credits,
      duration,
      category,
      disciplineId,
      price,
      freeAccessStartsAt,
      freeAccessEndsAt,
      instructor,
      description,
      published,
    } = req.body;

    const discipline = await api.prisma.discipline.findUnique({ where: { id: Number(disciplineId) } });

    if (!discipline) {
      res.status(400).json({ error: "Discipline académique invalide" });

      return;
    }

    const freeAccessWindow = resolveFreeAccessWindow(price, freeAccessStartsAt, freeAccessEndsAt);
    if (isInvalidFreeAccessWindow(price, freeAccessWindow)) {
      res.status(400).json({
        error:
          price <= 0
            ? "Les modules gratuits doivent avoir une date de début et une date de fin de gratuité."
            : "La date de fin de gratuité doit être après la date de début.",
      });
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

        ...freeAccessWindow,

        iconName: "Code",

        color: "bg-emerald-100",

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
            "### Introduction théorique\nCe manuel a été rédigé par l'équipe enseignante de Performance Académique."
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

    await api.invalidatePublicCatalogCache();

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

    const {
      title,
      credits,
      duration,
      category,
      disciplineId,
      price,
      freeAccessStartsAt,
      freeAccessEndsAt,
      instructor,
      description,
      published,
    } = req.body;

    const discipline = await api.prisma.discipline.findUnique({ where: { id: Number(disciplineId) } });

    if (!discipline) {
      res.status(400).json({ error: "Discipline académique invalide" });

      return;
    }

    const freeAccessWindow = resolveFreeAccessWindow(price, freeAccessStartsAt, freeAccessEndsAt);
    if (isInvalidFreeAccessWindow(price, freeAccessWindow)) {
      res.status(400).json({
        error:
          price <= 0
            ? "Les modules gratuits doivent avoir une date de début et une date de fin de gratuité."
            : "La date de fin de gratuité doit être après la date de début.",
      });
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

        ...freeAccessWindow,

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

      const touchesPricing = patchTouchesPricing(req.body);
      const nextPrice = typeof req.body.price === "number" ? req.body.price : course.price;
      if (
        touchesPricing &&
        nextPrice > 0 &&
        (req.body.freeAccessDurationDays != null || req.body.freeAccessStartsAt != null || req.body.freeAccessEndsAt != null)
      ) {
        res.status(400).json({ error: "La période de gratuité s'applique uniquement aux modules gratuits." });
        return;
      }

      const nextFreeAccessWindow = touchesPricing
        ? resolveFreeAccessWindow(
            nextPrice,
            req.body.freeAccessStartsAt ?? course.freeAccessStartsAt,
            req.body.freeAccessEndsAt ?? course.freeAccessEndsAt,
          )
        : null;
      if (touchesPricing && nextFreeAccessWindow && isInvalidFreeAccessWindow(nextPrice, nextFreeAccessWindow)) {
        res.status(400).json({
          error:
            nextPrice <= 0
              ? "Les modules gratuits doivent avoir une date de début et une date de fin de gratuité."
              : "La date de fin de gratuité doit être après la date de début.",
        });
        return;
      }

      const patchData = touchesPricing
        ? {
            ...req.body,
            ...(nextPrice > 0 ? { freeAccessStartsAt: null, freeAccessEndsAt: null, freeAccessDurationDays: null } : {}),
            ...(nextPrice <= 0 && nextFreeAccessWindow ? nextFreeAccessWindow : {}),
          }
        : { ...req.body };

      const shouldSyncLiveSession =
        typeof req.body.isLiveNow === "boolean" || typeof req.body.liveSubject !== "undefined";

      let updatedCourseRow;
      try {
        updatedCourseRow = await api.prisma.course.update({
          where: { id: course.id },
          data: patchData,
        });
      } catch (err) {
        api.logDb("ERROR", "Course patch update failed", {
          courseId: course.id,
          userId: authUser.id,
          patch: patchData,
          error: String(err),
        });
        res.status(api.apiErrorStatus(err)).json({
          error: api.apiErrorMessage(err),
          code: typeof err === "object" && err && "code" in err ? String((err as { code?: string }).code) : undefined,
        });
        return;
      }

      if (shouldSyncLiveSession) {
        const roomName = api.buildLiveKitRoomName(course.id);
        try {
          if (updatedCourseRow.isLiveNow) {
            const session = await api.upsertActiveLiveSessionRecord({
              roomName,
              courseId: course.id,
              professorId: authUser.id,
              title: updatedCourseRow.liveSubject || null,
              resetStartTime: !course.isLiveNow,
            });
            api.logLiveKit("INFO", "Live session synced", {
              courseId: course.id,
              roomName,
              isLiveNow: true,
              startedAt: session?.startTime?.toISOString() ?? null,
            });
          } else if (typeof req.body.isLiveNow === "boolean") {
            await api.deactivateLiveSessionByRoomName(roomName, updatedCourseRow.liveSubject || null);
            api.logLiveKit("INFO", "Live session synced", { courseId: course.id, roomName, isLiveNow: false });
          }
        } catch (err) {
          if (typeof req.body.isLiveNow === "boolean" && req.body.isLiveNow && !course.isLiveNow) {
            await api.prisma.course.update({
              where: { id: course.id },
              data: { isLiveNow: false },
            });
          }
          api.logDb("ERROR", "Course live session sync failed", {
            courseId: course.id,
            userId: authUser.id,
            error: String(err),
          });
          res.status(503).json({
            error: "La session live n'a pas pu être démarrée. Réessayez dans un instant.",
            code: "LIVE_SYNC_FAILED",
          });
          return;
        }
      }

      const updatedCourse = await api.prisma.course.findUnique({
        where: { id: course.id },
        include: api.courseResponseInclude,
      });
      if (!updatedCourse) {
        res.status(404).json({ error: api.PUBLIC_API_ERRORS.courseNotFound });
        return;
      }

      await api.logAudit(authUser.id, authUser.email, "PATCH_COURSE", "Course", String(course.id), patchData, req.ip);

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
    const includeAiAssistant = Boolean(req.body?.includeAiAssistant);
    const persistCoursePaymentEnrollment = (params: Parameters<typeof api.persistCoursePaymentWithAudit>[0]) =>
      api.persistCoursePaymentWithAudit(params);

    try {
      const result = await api.processFreeCourseEnrollment({
        userId: authUser.id,
        role: authUser.role,
        courseId,
        promoCode: promoCode || undefined,
        includeAiAssistant,
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
