import type { Express } from "express";
import { getAuthUser } from "../server/route-types";
import type { RouteContext } from "../server/route-context";
import type { AppUser } from "../server/route-deps";
import * as api from "../server/route-deps";

export function registerObjectivesRoutes(app: Express, ctx: RouteContext): void {
  const { requireAuth, requireRbac, requireAdmin, validateBody } = ctx.middleware;

  async function listStudentStudyScheduleSessions(studentId: string) {
    const sessions = await api.prisma.studentStudyScheduleSession.findMany({
      where: { studentId },

      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });

    return api.sortStudentStudySessions(sessions).map(api.serializeStudentStudySession);
  }

  async function getOwnedStudentStudyScheduleSession(sessionId: string, authUserId: string) {
    const session = await api.prisma.studentStudyScheduleSession.findUnique({ where: { id: sessionId } });

    if (!session || !api.canAccessStudentStudySession(session.studentId, authUserId)) return null;

    return session;
  }

  app.get("/api/me/study-schedule", requireAuth, requireRbac, async (req, res) => {
    const authUser = getAuthUser(req);

    if (authUser.role !== "STUDENT") {
      res.status(403).json({ error: "Emploi du temps d'étude réservé aux étudiants" });

      return;
    }

    const sessions = await listStudentStudyScheduleSessions(authUser.id);

    res.json(sessions);
  });

  // POST /api/me/study-schedule

  app.post(
    "/api/me/study-schedule",
    requireAuth,
    requireRbac,
    validateBody(api.studentStudyScheduleSchema),
    async (req, res) => {
      const authUser = getAuthUser(req);

      if (authUser.role !== "STUDENT") {
        res.status(403).json({ error: "Emploi du temps d'étude réservé aux étudiants" });

        return;
      }

      const payload = {
        dayOfWeek: req.body.dayOfWeek,

        title: req.body.title,

        moduleName: req.body.moduleName,

        startTime: req.body.startTime,

        endTime: req.body.endTime,

        sessionType: req.body.sessionType,

        roomOrLink: req.body.roomOrLink || undefined,

        description: req.body.description || undefined,
      };

      const existing = await api.prisma.studentStudyScheduleSession.findMany({ where: { studentId: authUser.id } });

      const validationError = api.validateStudentStudyPayload(payload, existing);

      if (validationError) {
        res.status(400).json({ error: validationError, code: "STUDY_SCHEDULE_VALIDATION_FAILED" });

        return;
      }

      const created = await api.prisma.studentStudyScheduleSession.create({
        data: {
          studentId: authUser.id,

          dayOfWeek: payload.dayOfWeek,

          title: payload.title,

          moduleName: payload.moduleName,

          startTime: payload.startTime,

          endTime: payload.endTime,

          sessionType: payload.sessionType,

          roomOrLink: payload.roomOrLink || null,

          description: payload.description || null,
        },
      });

      await api.logAudit(
        authUser.id,
        authUser.email,
        "CREATE_STUDY_SCHEDULE_SESSION",
        "StudentStudyScheduleSession",
        created.id,
        { dayOfWeek: created.dayOfWeek },
        req.ip,
      );

      res.status(201).json(api.serializeStudentStudySession(created));
    },
  );

  // PUT /api/me/study-schedule/:id

  app.put(
    "/api/me/study-schedule/:id",
    requireAuth,
    requireRbac,
    validateBody(api.studentStudyScheduleSchema),
    async (req, res) => {
      const authUser = getAuthUser(req);

      if (authUser.role !== "STUDENT") {
        res.status(403).json({ error: "Emploi du temps d'étude réservé aux étudiants" });

        return;
      }

      const owned = await getOwnedStudentStudyScheduleSession(req.params.id, authUser.id);

      if (!owned) {
        res.status(403).json({ error: "Accès refusé pour modifier cette séance" });

        return;
      }

      const payload = {
        dayOfWeek: req.body.dayOfWeek,

        title: req.body.title,

        moduleName: req.body.moduleName,

        startTime: req.body.startTime,

        endTime: req.body.endTime,

        sessionType: req.body.sessionType,

        roomOrLink: req.body.roomOrLink || undefined,

        description: req.body.description || undefined,
      };

      const existing = await api.prisma.studentStudyScheduleSession.findMany({ where: { studentId: authUser.id } });

      const validationError = api.validateStudentStudyPayload(payload, existing, { excludeId: owned.id });

      if (validationError) {
        res.status(400).json({ error: validationError, code: "STUDY_SCHEDULE_VALIDATION_FAILED" });

        return;
      }

      const updated = await api.prisma.studentStudyScheduleSession.update({
        where: { id: owned.id },

        data: {
          dayOfWeek: payload.dayOfWeek,

          title: payload.title,

          moduleName: payload.moduleName,

          startTime: payload.startTime,

          endTime: payload.endTime,

          sessionType: payload.sessionType,

          roomOrLink: payload.roomOrLink || null,

          description: payload.description || null,
        },
      });

      await api.logAudit(
        authUser.id,
        authUser.email,
        "UPDATE_STUDY_SCHEDULE_SESSION",
        "StudentStudyScheduleSession",
        updated.id,
        { dayOfWeek: updated.dayOfWeek },
        req.ip,
      );

      res.json(api.serializeStudentStudySession(updated));
    },
  );

  // DELETE /api/me/study-schedule/:id

  app.delete("/api/me/study-schedule/:id", requireAuth, requireRbac, async (req, res) => {
    const authUser = getAuthUser(req);

    if (authUser.role !== "STUDENT") {
      res.status(403).json({ error: "Emploi du temps d'étude réservé aux étudiants" });

      return;
    }

    const owned = await getOwnedStudentStudyScheduleSession(req.params.id, authUser.id);

    if (!owned) {
      res.status(403).json({ error: "Accès refusé pour supprimer cette séance" });

      return;
    }

    await api.prisma.studentStudyScheduleSession.delete({ where: { id: owned.id } });

    await api.logAudit(
      authUser.id,
      authUser.email,
      "DELETE_STUDY_SCHEDULE_SESSION",
      "StudentStudyScheduleSession",
      owned.id,
      {},
      req.ip,
    );

    res.json({ ok: true });
  });

  async function listStudentObjectives(studentId: string) {
    const objectives = await api.prisma.studentObjective.findMany({
      where: { studentId },

      orderBy: [{ status: "asc" }, { endAt: "asc" }, { updatedAt: "desc" }],
    });

    return api
      .sortStudentObjectives(objectives as any)
      .map((objective) => api.serializeStudentObjective(objective as any));
  }

  async function getOwnedStudentObjective(objectiveId: string, authUserId: string) {
    const objective = await api.prisma.studentObjective.findUnique({ where: { id: objectiveId } });

    if (!objective || !api.canAccessStudentObjective(objective.studentId, authUserId)) return null;

    return objective;
  }

  // GET /api/me/objectives

  app.get("/api/me/objectives", requireAuth, requireRbac, async (req, res) => {
    const authUser = getAuthUser(req);

    if (authUser.role !== "STUDENT") {
      res.status(403).json({ error: "Objectifs réservés aux étudiants" });

      return;
    }

    const objectives = await listStudentObjectives(authUser.id);

    res.json(objectives);
  });

  // GET /api/me/objectives/summary

  app.get("/api/me/objectives/summary", requireAuth, requireRbac, async (req, res) => {
    const authUser = getAuthUser(req);

    if (authUser.role !== "STUDENT") {
      res.status(403).json({ error: "Objectifs réservés aux étudiants" });

      return;
    }

    const objectives = await api.prisma.studentObjective.findMany({ where: { studentId: authUser.id } });

    res.json(api.buildStudentObjectiveSummary(objectives as any));
  });

  // POST /api/me/objectives

  app.post(
    "/api/me/objectives",
    requireAuth,
    requireRbac,
    validateBody(api.studentObjectiveSchema),
    async (req, res) => {
      const authUser = getAuthUser(req);

      if (authUser.role !== "STUDENT") {
        res.status(403).json({ error: "Objectifs réservés aux étudiants" });

        return;
      }

      const validationError = api.validateStudentObjectivePayload(req.body);

      if (validationError) {
        res.status(400).json({ error: validationError, code: "STUDENT_OBJECTIVE_VALIDATION_FAILED" });

        return;
      }

      const payload = api.normalizeStudentObjectivePayload(req.body);

      const created = await api.prisma.studentObjective.create({
        data: {
          studentId: authUser.id,

          title: payload.title,

          description: payload.description,

          startAt: payload.startAt,

          endAt: payload.endAt,

          status: payload.status,

          objectiveType: payload.objectiveType,

          focusContentTitle: payload.focusContentTitle,

          focusContentUrl: payload.focusContentUrl,

          focusContentType: payload.focusContentType,

          recurrence: payload.recurrence,

          completedAt: payload.status === "COMPLETED" ? new Date() : null,
        },
      });

      await api.logAudit(
        authUser.id,
        authUser.email,
        "CREATE_STUDENT_OBJECTIVE",
        "StudentObjective",
        created.id,
        { status: created.status },
        req.ip,
      );

      res.status(201).json(api.serializeStudentObjective(created as any));
    },
  );

  // PUT /api/me/objectives/:id

  app.put(
    "/api/me/objectives/:id",
    requireAuth,
    requireRbac,
    validateBody(api.studentObjectiveSchema),
    async (req, res) => {
      const authUser = getAuthUser(req);

      if (authUser.role !== "STUDENT") {
        res.status(403).json({ error: "Objectifs réservés aux étudiants" });

        return;
      }

      const owned = await getOwnedStudentObjective(req.params.id, authUser.id);

      if (!owned) {
        res.status(403).json({ error: "Accès refusé pour modifier cet objectif" });

        return;
      }

      const validationError = api.validateStudentObjectivePayload(req.body);

      if (validationError) {
        res.status(400).json({ error: validationError, code: "STUDENT_OBJECTIVE_VALIDATION_FAILED" });

        return;
      }

      const payload = api.normalizeStudentObjectivePayload(req.body);

      const statusChangedToCompleted = payload.status === "COMPLETED" && owned.status !== "COMPLETED";

      const statusChangedToProgress = payload.status === "IN_PROGRESS";

      const updated = await api.prisma.studentObjective.update({
        where: { id: owned.id },

        data: {
          title: payload.title,

          description: payload.description,

          startAt: payload.startAt,

          endAt: payload.endAt,

          status: payload.status,

          objectiveType: payload.objectiveType,

          focusContentTitle: payload.focusContentTitle,

          focusContentUrl: payload.focusContentUrl,

          focusContentType: payload.focusContentType,

          recurrence: payload.recurrence,

          completedAt: statusChangedToCompleted ? new Date() : statusChangedToProgress ? null : owned.completedAt,
        },
      });

      await api.logAudit(
        authUser.id,
        authUser.email,
        "UPDATE_STUDENT_OBJECTIVE",
        "StudentObjective",
        updated.id,
        { status: updated.status },
        req.ip,
      );

      res.json(api.serializeStudentObjective(updated as any));
    },
  );

  // PATCH /api/me/objectives/:id/complete

  app.patch("/api/me/objectives/:id/complete", requireAuth, requireRbac, async (req, res) => {
    const authUser = getAuthUser(req);

    if (authUser.role !== "STUDENT") {
      res.status(403).json({ error: "Objectifs réservés aux étudiants" });

      return;
    }

    const owned = await getOwnedStudentObjective(req.params.id, authUser.id);

    if (!owned) {
      res.status(403).json({ error: "Accès refusé pour terminer cet objectif" });

      return;
    }

    const updated = await api.prisma.studentObjective.update({
      where: { id: owned.id },

      data: {
        status: "COMPLETED",

        completedAt: owned.completedAt || new Date(),
      },
    });

    const nextRecurringData = api.buildNextRecurringObjectiveData(updated as any, updated.completedAt || new Date());

    const nextObjective = nextRecurringData
      ? await api.prisma.studentObjective.create({ data: nextRecurringData as any })
      : null;

    await api.logAudit(
      authUser.id,
      authUser.email,
      "COMPLETE_STUDENT_OBJECTIVE",
      "StudentObjective",
      updated.id,
      {},
      req.ip,
    );

    res.json({
      objective: api.serializeStudentObjective(updated as any),

      nextObjective: nextObjective ? api.serializeStudentObjective(nextObjective as any) : null,
    });
  });

  // DELETE /api/me/objectives/:id

  app.delete("/api/me/objectives/:id", requireAuth, requireRbac, async (req, res) => {
    const authUser = getAuthUser(req);

    if (authUser.role !== "STUDENT") {
      res.status(403).json({ error: "Objectifs réservés aux étudiants" });

      return;
    }

    const owned = await getOwnedStudentObjective(req.params.id, authUser.id);

    if (!owned) {
      res.status(403).json({ error: "Accès refusé pour supprimer cet objectif" });

      return;
    }

    await api.prisma.studentObjective.delete({ where: { id: owned.id } });

    await api.logAudit(
      authUser.id,
      authUser.email,
      "DELETE_STUDENT_OBJECTIVE",
      "StudentObjective",
      owned.id,
      {},
      req.ip,
    );

    res.json({ ok: true });
  });

  async function persistUserAvatarUrl(authUser: AppUser, avatarUrl: string) {
    await api.prisma.user.update({
      where: { id: authUser.id },

      data: { avatarUrl },
    });

    if (api.canAccessAcademicProfile(authUser.role)) {
      await api.prisma.academicProfile.upsert({
        where: { userId: authUser.id },

        update: { avatarUrl },

        create: {
          userId: authUser.id,

          title: authUser.levelOrTitle,

          avatarUrl,

          teachingDomains: [],

          researchDomains: [],

          links: {},
        },
      });
    }
  }
}
