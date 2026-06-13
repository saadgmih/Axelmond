import type { Express } from "express";
import type { CourseModule } from "../server/route-deps";
import type { RouteContext } from "../server/route-context";
import type { AppUser } from "../server/route-deps";
import * as api from "../server/route-deps";

export function registerCoursesRoutes(app: Express, ctx: RouteContext): void {
  const { requireAuth, requireRbac, requireAdmin, validateBody } = ctx.middleware;

  // GET /api/courses
  
  app.get("/api/courses", async (req, res) => {
  
    const authUser = await api.getOptionalAuthUser(req);
  
    const domainId = Number(req.query.domainId) || 0;
  
    const disciplineId = Number(req.query.disciplineId) || 0;
  
    // Cache uniquement pour visiteurs anonymes, clé incluant les filtres
    const cacheKey = authUser
      ? null
      : `api:courses:public:d=${domainId}:dis=${disciplineId}`;
    if (cacheKey) {
  
      const cached = await api.cacheGet(cacheKey);
  
      if (cached) { res.json(JSON.parse(cached)); return; }
  
    }
  
  
  
    const where: any = authUser?.role === "ADMIN"
  
      ? {}
  
      : authUser && (authUser.role === "PROFESSOR" || authUser.role === "RESEARCHER")
  
        ? { createdById: authUser.id }
  
        : { published: true };
  
    if (Number.isInteger(disciplineId) && disciplineId > 0) {
  
      where.disciplineId = disciplineId;
  
    } else if (Number.isInteger(domainId) && domainId > 0) {
  
      const disciplineIds = await api.prisma.discipline.findMany({
  
        where: { domainId },
  
        select: { id: true },
  
      });
  
      where.disciplineId = { in: disciplineIds.map((discipline) => discipline.id) };
  
    }
  
    const courses = await api.prisma.course.findMany({
  
      where,
  
      include: api.courseResponseInclude,
  
      orderBy: { id: "asc" },
  
    });
  
    const payload = authUser?.role === "STUDENT"
      ? await Promise.all(courses.map((course) => api.toCourseForUser(course, authUser)))
      : courses.map((course) => api.toCourse(course));
  
    api.logDb("INFO", "Academic modules listed", {
  
      userId: authUser?.id,
  
      role: authUser?.role || "PUBLIC",
  
      ownershipScope: authUser && (authUser.role === "PROFESSOR" || authUser.role === "RESEARCHER") ? "OWN_MODULES_ONLY" : "DEFAULT",
  
      count: payload.length,
  
    });
  
    if (cacheKey) await api.cacheSet(cacheKey, JSON.stringify(payload), Number(process.env.CACHE_TTL_SECONDS) || 60);
  
    res.json(payload);
  
  });
  
  
  
  // POST /api/courses (Teacher creates a real persisted course)
  
  app.post("/api/courses", requireAuth, requireRbac, validateBody(api.courseSchema), async (req, res) => {
  
    const authUser = (req as any).authUser as AppUser;
  
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
  
        modules: [],
  
        published,
  
        createdById: authUser.id,
  
      },
  
      include: api.courseResponseInclude,
  
    });
  
  
  
    await api.logAudit(authUser.id, authUser.email, "CREATE_COURSE", "Course", String(course.id), { title: course.title }, req.ip);
  
    api.logDb("INFO", "Course created", { courseId: course.id, userId: authUser.id, disciplineId: course.disciplineId, published: course.published });
  
    // Invalidation du cache public (le nouveau module doit apparaître immédiatement)
  
    await api.invalidatePublicCatalogCache();
  
    res.status(201).json(api.toCourse(course));
  
  });
  
  
  
  // GET /api/courses/:id
  
  app.get("/api/courses/:id", async (req, res) => {
  
    const authUser = await api.getOptionalAuthUser(req);
  
    const course = await api.prisma.course.findUnique({ where: { id: parseInt(req.params.id) }, include: api.courseResponseInclude });
  
    if (!course) {
  
      res.status(404).json({ error: "Course not found" });
  
      return;
  
    }
  
    if (!course.published) {
  
      if (!authUser || authUser.role === "STUDENT") {
  
        res.status(404).json({ error: "Course not found" });
  
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
  
    const authUser = (req as any).authUser as AppUser;
  
    const courseId = parseInt(req.params.id);
  
    const course = await api.prisma.course.findUnique({ where: { id: courseId } });
  
    if (!course) { res.status(404).json({ error: "Course not found" }); return; }
  
  
  
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
  
    const authUser = (req as any).authUser as AppUser;
  
    const courseId = parseInt(req.params.courseId);
  
    const course = await api.prisma.course.findUnique({ where: { id: courseId } });
  
    if (!course) { res.status(404).json({ error: "Module introuvable" }); return; }
  
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
  
    const authUser = (req as any).authUser as AppUser;
  
    const courseId = parseInt(req.params.courseId);
  
    if (authUser.role === "STUDENT" && !authUser.enrolledCourses.includes(courseId)) {
  
      res.status(403).json({ error: "Inscription requise pour compléter ce module" });
  
      return;
  
    }
  
    const moduleId = parseInt(req.params.moduleId);
  
    const course = await api.findCourse(courseId);
  
    if (!course) { res.status(404).json({ error: "Course not found" }); return; }
  
  
  
    const mod = course.modules.find(m => m.id === moduleId);
  
    if (!mod) { res.status(404).json({ error: "Module not found" }); return; }
  
  
  
    await api.prisma.moduleProgress.upsert({

      where: { userId_courseId_moduleId: { userId: authUser.id, courseId: course.id, moduleId } },

      create: { userId: authUser.id, courseId: course.id, moduleId },

      update: {},

    });

    res.json(await api.toCourseForUser(course, authUser));
  
  });
  
  
  
  // POST /api/courses/:courseId/modules (Teacher adds module)
  
  app.post("/api/courses/:courseId/modules", requireAuth, requireRbac, async (req, res) => {
  
    const authUser = (req as any).authUser as AppUser;
  
    const courseId = parseInt(req.params.courseId);
  
    if (!(await api.verifyCourseAccess(authUser, courseId))) {
  
      res.status(403).json({ error: "Accès refusé pour modifier ce module" });
  
      return;
  
    }
  
    const course = await api.findCourse(courseId);
  
    if (!course) { res.status(404).json({ error: "Course not found" }); return; }
  
  
  
    const { title, type, duration, contentMarkdown } = req.body;
  
    if (!title || !type || !duration) {
  
      res.status(400).json({ error: "title, type, duration required" });
  
      return;
  
    }
  
  
  
    const courses = (await api.prisma.course.findMany()).map((course) => api.toCourse(course));
  
    const allIds = courses.flatMap(c => c.modules.map(m => m.id));
  
    const nextId = Math.max(...allIds, 100) + 1;
  
  
  
    const newModule: CourseModule = {
  
      id: nextId,
  
      title,
  
      type,
  
      duration,
  
      completed: false,
  
      contentMarkdown: type === "pdf" ? (contentMarkdown || "### Introduction théorique\nCe manuel a été rédigé par l'équipe enseignante d'Axelmond Research Labs.") : undefined,
  
    };
  
  
  
    course.modules.push(newModule);
  
    const updatedCourse = await api.prisma.course.update({
  
      where: { id: course.id },
  
      data: { modules: course.modules as unknown as api.Prisma.InputJsonValue },
  
    });
  
    res.json(api.toCourse(updatedCourse));
  
  });
  
  
  
  // PUT /api/courses/:courseId (Teacher updates course identity)
  
  app.put("/api/courses/:courseId", requireAuth, requireRbac, validateBody(api.courseSchema), async (req, res) => {
  
    const authUser = (req as any).authUser as AppUser;
  
    const courseId = parseInt(req.params.courseId);
  
    if (!(await api.verifyCourseAccess(authUser, courseId))) {
  
      res.status(403).json({ error: "Accès refusé pour modifier ce module" });
  
      return;
  
    }
  
  
  
    const course = await api.prisma.course.findUnique({ where: { id: courseId } });
  
    if (!course) { res.status(404).json({ error: "Course not found" }); return; }
  
  
  
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
  
  
  
    await api.logAudit(authUser.id, authUser.email, "UPDATE_COURSE", "Course", String(course.id), { title: updatedCourse.title }, req.ip);
  
    api.logDb("INFO", "Course updated", { courseId: course.id, fields: Object.keys(req.body) });
  
    await api.invalidatePublicCatalogCache();
  
    res.json(api.toCourse(updatedCourse));
  
  });
  
  
  
  // PATCH /api/courses/:courseId (Teacher updates course metadata/live state)
  
  app.patch("/api/courses/:courseId", requireAuth, requireRbac, validateBody(api.coursePatchSchema), async (req, res) => {
  
    const authUser = (req as any).authUser as AppUser;
  
    const courseId = parseInt(req.params.courseId);
  
    if (!(await api.verifyCourseAccess(authUser, courseId))) {
  
      res.status(403).json({ error: "Accès refusé pour modifier ce module" });
  
      return;
  
    }
  
  
  
    const course = await api.prisma.course.findUnique({ where: { id: courseId } });
  
    if (!course) { res.status(404).json({ error: "Course not found" }); return; }
  
  
  
    const updatedCourse = await api.prisma.$transaction(async (tx) => {
  
      const updated = await tx.course.update({
  
        where: { id: course.id },
  
        data: req.body,
  
      });
  
      const shouldSyncLiveSession = typeof req.body.isLiveNow === "boolean" || typeof req.body.liveSubject !== "undefined";
  
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
  
          api.logLiveKit("INFO", "Live session synced", { courseId: course.id, roomName, isLiveNow: true, startedAt: session.startTime.toISOString() });
  
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
  
    if (updatedCourse?.isLiveNow && !course.isLiveNow) {
  
      await api.notifyEnrolledStudentsForCourse(course.id, {
  
        type: "LIVE_STARTED",
  
        title: "Séance live en cours",
  
        body: `${updatedCourse.liveSubject || updatedCourse.title} est en direct`,
  
        actionUrl: "/student/live",
  
        metadata: { courseId: course.id },
  
      }).catch(() => undefined);
  
    }
  
    res.json(api.toCourse(updatedCourse));
  
  });
  
  
  
  // DELETE /api/courses/:courseId
  
  app.delete("/api/courses/:courseId", requireAuth, requireRbac, async (req, res) => {
  
    const authUser = (req as any).authUser as AppUser;
  
    const courseId = parseInt(req.params.courseId);
  
    if (!(await api.verifyCourseAccess(authUser, courseId))) {
  
      res.status(403).json({ error: "Accès refusé pour supprimer ce module" });
  
      return;
  
    }
  
  
  
    const course = await api.prisma.course.findUnique({ where: { id: courseId } });
  
    if (!course) { res.status(404).json({ error: "Course not found" }); return; }
  
  
  
    const fileKeys: string[] = [];
  
    await api.prisma.$transaction(async (tx) => {
  
      const contents = await tx.lessonContent.findMany({ where: { courseId }, select: { id: true } });
  
      const contentIds = contents.map((content: any) => content.id);
  
      const sessions = await tx.liveSession.findMany({ where: { courseId }, select: { id: true } });
  
      const sessionIds = sessions.map((session: any) => session.id);
  
      if (contentIds.length > 0) {
  
        const attachments = await tx.attachment.findMany({
  
          where: { contentId: { in: contentIds } },
  
          select: { fileKey: true }
  
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
  
  
  
    await api.logAudit(authUser.id, authUser.email, "DELETE_COURSE", "Course", String(courseId), { title: course.title }, req.ip);
  
    api.logDb("INFO", "Course deleted", { courseId });
  
    await api.invalidatePublicCatalogCache();
  
    res.json({ ok: true, deletedId: courseId });
  
  });
  
  
  
  // PUT /api/content-sections/:id
  
}
