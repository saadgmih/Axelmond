import type { Express } from "express";
import { getAuthUser } from "../server/route-types";
import type { RouteContext } from "../server/route-context";
import * as api from "../server/route-deps";

export function registerProfileRoutes(app: Express, ctx: RouteContext): void {
  const { requireAuth, requireRbac, validateBody } = ctx.middleware;

  // GET /api/me/profile

  app.get("/api/me/profile", requireAuth, requireRbac, async (req, res) => {
    const authUser = getAuthUser(req);

    if (!api.canAccessAcademicProfile(authUser.role)) {
      res.status(403).json({ error: "Profil académique réservé aux administrateurs, professeurs et chercheurs" });

      return;
    }

    const payload = await api.getAcademicProfileResponse(authUser);

    if (!payload) {
      res.status(404).json({ error: "Compte introuvable" });

      return;
    }

    api.logSecurity("INFO", "Academic profile read", { userId: authUser.id, role: authUser.role });

    res.json(payload);
  });

  // PUT /api/me/profile

  app.put("/api/me/profile", requireAuth, requireRbac, async (req, res) => {
    const authUser = getAuthUser(req);

    if (!api.canAccessAcademicProfile(authUser.role)) {
      res.status(403).json({ error: "Profil académique réservé aux administrateurs, professeurs et chercheurs" });

      return;
    }

    const rawBody = req.body && typeof req.body === "object" ? (req.body as Record<string, unknown>) : {};

    const input = api.sanitizeAcademicProfileInput(req.body);

    if ("role" in req.body || "userId" in req.body) {
      api.logSecurity("WARN", "Academic profile immutable fields ignored", {
        userId: authUser.id,
        fields: Object.keys(req.body).filter((field) => field === "role" || field === "userId"),
      });
    }

    if ("avatarUrl" in rawBody && api.isAvatarUrlFieldInvalid(rawBody.avatarUrl)) {
      res.status(400).json({ error: "URL de photo de profil non autorisée", code: "AVATAR_URL_INVALID" });

      return;
    }

    const profileData = {
      title: input.title,

      department: input.department,

      lab: input.lab,

      speciality: input.speciality,

      teachingDomains: input.teachingDomains as unknown as api.Prisma.InputJsonValue,

      researchDomains: input.researchDomains as unknown as api.Prisma.InputJsonValue,

      bio: input.bio,

      links: input.links as api.Prisma.InputJsonObject,

      ...("avatarUrl" in rawBody ? { avatarUrl: input.avatarUrl ?? null } : {}),
    };

    await api.prisma.academicProfile.upsert({
      where: { userId: authUser.id },

      update: profileData,

      create: {
        userId: authUser.id,
        ...profileData,
        title: input.title || authUser.levelOrTitle,
      },
    });

    if ("avatarUrl" in rawBody) {
      await api.prisma.user.update({
        where: { id: authUser.id },

        data: { avatarUrl: input.avatarUrl ?? null },
      });
    }

    const payload = await api.getAcademicProfileResponse(authUser);

    api.logSecurity("INFO", "Academic profile updated", { userId: authUser.id, role: authUser.role });

    res.json({ ...payload, message: "Profil académique mis à jour" });
  });

  async function listProfessorScheduleSessions(professorId: string) {
    const sessions = await api.prisma.professorScheduleSession.findMany({
      where: { professorId },

      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });

    return api.sortScheduleSessions(sessions).map(api.serializeScheduleSession);
  }

  async function getOwnedProfessorScheduleSession(sessionId: string, authUserId: string) {
    const session = await api.prisma.professorScheduleSession.findUnique({ where: { id: sessionId } });

    if (!session || !api.canAccessProfessorScheduleSession(session.professorId, authUserId)) return null;

    return session;
  }

  // GET /api/me/schedule

  app.get("/api/me/schedule", requireAuth, requireRbac, async (req, res) => {
    const authUser = getAuthUser(req);

    if (!api.canAccessAcademicProfile(authUser.role)) {
      res.status(403).json({ error: "Emploi du temps réservé aux professeurs et chercheurs" });

      return;
    }

    const sessions = await listProfessorScheduleSessions(authUser.id);

    res.json(sessions);
  });

  // POST /api/me/schedule

  app.post("/api/me/schedule", requireAuth, requireRbac, validateBody(api.scheduleSessionSchema), async (req, res) => {
    const authUser = getAuthUser(req);

    if (!api.canAccessAcademicProfile(authUser.role)) {
      res.status(403).json({ error: "Emploi du temps réservé aux professeurs et chercheurs" });

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

    const existing = await api.prisma.professorScheduleSession.findMany({ where: { professorId: authUser.id } });

    const validationError = api.validateSchedulePayload(payload, existing);

    if (validationError) {
      res.status(400).json({ error: validationError, code: "SCHEDULE_VALIDATION_FAILED" });

      return;
    }

    const created = await api.prisma.professorScheduleSession.create({
      data: {
        professorId: authUser.id,

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
      "CREATE_SCHEDULE_SESSION",
      "ProfessorScheduleSession",
      created.id,
      { dayOfWeek: created.dayOfWeek },
      req.ip,
    );

    res.status(201).json(api.serializeScheduleSession(created));
  });

  // PUT /api/me/schedule/:id

  app.put(
    "/api/me/schedule/:id",
    requireAuth,
    requireRbac,
    validateBody(api.scheduleSessionSchema),
    async (req, res) => {
      const authUser = getAuthUser(req);

      if (!api.canAccessAcademicProfile(authUser.role)) {
        res.status(403).json({ error: "Emploi du temps réservé aux professeurs et chercheurs" });

        return;
      }

      const owned = await getOwnedProfessorScheduleSession(req.params.id, authUser.id);

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

      const existing = await api.prisma.professorScheduleSession.findMany({ where: { professorId: authUser.id } });

      const validationError = api.validateSchedulePayload(payload, existing, { excludeId: owned.id });

      if (validationError) {
        res.status(400).json({ error: validationError, code: "SCHEDULE_VALIDATION_FAILED" });

        return;
      }

      const updated = await api.prisma.professorScheduleSession.update({
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
        "UPDATE_SCHEDULE_SESSION",
        "ProfessorScheduleSession",
        updated.id,
        { dayOfWeek: updated.dayOfWeek },
        req.ip,
      );

      res.json(api.serializeScheduleSession(updated));
    },
  );

  // DELETE /api/me/schedule/:id

  app.delete("/api/me/schedule/:id", requireAuth, requireRbac, async (req, res) => {
    const authUser = getAuthUser(req);

    if (!api.canAccessAcademicProfile(authUser.role)) {
      res.status(403).json({ error: "Emploi du temps réservé aux professeurs et chercheurs" });

      return;
    }

    const owned = await getOwnedProfessorScheduleSession(req.params.id, authUser.id);

    if (!owned) {
      res.status(403).json({ error: "Accès refusé pour supprimer cette séance" });

      return;
    }

    await api.prisma.professorScheduleSession.delete({ where: { id: owned.id } });

    await api.logAudit(
      authUser.id,
      authUser.email,
      "DELETE_SCHEDULE_SESSION",
      "ProfessorScheduleSession",
      owned.id,
      {},
      req.ip,
    );

    res.json({ ok: true });
  });

  async function _listStudentStudyScheduleSessions(studentId: string) {
    const sessions = await api.prisma.studentStudyScheduleSession.findMany({
      where: { studentId },

      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });

    return api.sortStudentStudySessions(sessions).map(api.serializeStudentStudySession);
  }

  async function _getOwnedStudentStudyScheduleSession(sessionId: string, authUserId: string) {
    const session = await api.prisma.studentStudyScheduleSession.findUnique({ where: { id: sessionId } });

    if (!session || !api.canAccessStudentStudySession(session.studentId, authUserId)) return null;

    return session;
  }

  app.post("/api/me/avatar", requireAuth, requireRbac, async (req, res) => {
    const authUser = getAuthUser(req);

    const avatarUrl = api.sanitizeAvatarUrl(req.body?.avatarUrl);

    if (!avatarUrl) {
      if (api.isAvatarUrlFieldInvalid(req.body?.avatarUrl)) {
        res.status(400).json({ error: "URL de photo de profil non autorisée", code: "AVATAR_URL_INVALID" });

        return;
      }

      res.status(400).json({ error: api.PUBLIC_API_ERRORS.avatarUrlRequired });

      return;
    }

    await api.persistUserAvatarUrl(authUser, avatarUrl);

    if (api.canAccessAcademicProfile(authUser.role)) {
      const payload = await api.getAcademicProfileResponse(authUser);

      api.logSecurity("INFO", "Academic avatar updated", { userId: authUser.id, role: authUser.role });

      if (!payload) {
        res.json({ user: { ...authUser, avatarUrl }, message: "Photo de profil mise à jour" });

        return;
      }

      res.json({ ...payload, user: { ...payload.user, avatarUrl }, message: "Photo de profil mise à jour" });

      return;
    }

    const user = await api.prisma.user.findUnique({
      where: { id: authUser.id },

      include: { enrollments: true },
    });

    api.logSecurity("INFO", "User avatar updated", { userId: authUser.id, role: authUser.role });

    res.json({ user: user ? api.toAppUser(user) : { ...authUser, avatarUrl }, message: "Photo de profil mise à jour" });
  });

  // DELETE /api/me/avatar

  app.delete("/api/me/avatar", requireAuth, requireRbac, async (req, res) => {
    const authUser = getAuthUser(req);

    await api.prisma.user.update({
      where: { id: authUser.id },

      data: { avatarUrl: null },
    });

    if (api.canAccessAcademicProfile(authUser.role)) {
      await api.prisma.academicProfile.updateMany({
        where: { userId: authUser.id },

        data: { avatarUrl: null },
      });
    }

    const user = await api.prisma.user.findUnique({
      where: { id: authUser.id },

      include: { enrollments: true },
    });

    api.logSecurity("INFO", "User avatar removed", { userId: authUser.id, role: authUser.role });

    res.json({
      user: user ? api.toAppUser(user) : { ...authUser, avatarUrl: undefined },
      message: "Photo de profil supprimée",
    });
  });

  // POST /api/me/password

  app.post("/api/me/password", requireAuth, requireRbac, validateBody(api.passwordChangeSchema), async (req, res) => {
    const authUser = getAuthUser(req);

    if (!api.canAccessAcademicProfile(authUser.role)) {
      res.status(403).json({ error: "Profil académique réservé aux administrateurs, professeurs et chercheurs" });

      return;
    }

    const currentPassword = String(req.body?.currentPassword || "");

    const newPassword = String(req.body?.newPassword || "");

    const user = await api.prisma.user.findUnique({ where: { id: authUser.id } });

    if (!user) {
      res.status(404).json({ error: "Compte introuvable" });

      return;
    }

    const validPassword = await api.bcrypt.compare(currentPassword, user.passwordHash);

    if (!validPassword) {
      api.logSecurity("WARN", "Academic password update denied", {
        userId: authUser.id,
        reason: "invalid_current_password",
      });

      res.status(401).json({ error: "Mot de passe actuel incorrect" });

      return;
    }

    await api.prisma.user.update({
      where: { id: authUser.id },

      data: { passwordHash: await api.bcrypt.hash(newPassword, 10) },
    });

    await api.revokeAllUserRefreshTokens(authUser.id);

    api.logSecurity("INFO", "Academic password updated", { userId: authUser.id, role: authUser.role });

    res.json({ message: "Mot de passe mis à jour" });
  });
}
