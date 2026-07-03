import type { Express } from "express";
import type { RouteContext } from "../server/route-context";
import { getAuthUser } from "../server/route-types";
import * as api from "../server/route-deps";
import {
  auditLogSnapshot,
  buildAuditLogCsv,
  fetchAuditLogsForExport,
  listAuditLogs,
  parseAuditLogDate,
} from "../audit-log-service";

function slugifyAcademicLabel(value: string, fallback: string) {
  const source = (value || fallback).trim() || fallback;
  const slug = source
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140);
  return slug || fallback;
}

async function nextFacultyDomainId() {
  const aggregate = await api.prisma.facultyDomain.aggregate({ _max: { id: true } });
  return (aggregate._max.id || 0) + 1;
}

async function nextDisciplineId() {
  const aggregate = await api.prisma.discipline.aggregate({ _max: { id: true } });
  return (aggregate._max.id || 0) + 1;
}

function taxonomyConflictMessage(err: unknown, fallback: string) {
  const code = (err as { code?: string })?.code;
  if (code === "P2002") return "Un domaine ou sous-domaine utilise déjà ce nom ou ce slug";
  return fallback;
}

export function registerAdminRoutes(app: Express, ctx: RouteContext): void {
  const { requireAuth, requireAdmin, validateBody } = ctx.middleware;

  app.get("/api/admin/site-settings", requireAuth, requireAdmin, async (_req, res) => {
    try {
      const settings = await api.getSiteSettings();
      res.json(settings);
    } catch (err) {
      api.logDb("ERROR", "Admin site settings read failed", { error: String(err) });
      res.status(503).json({ error: "Réglages du site indisponibles" });
    }
  });

  app.put("/api/admin/site-settings", requireAuth, requireAdmin, async (req, res) => {
    const authUser = getAuthUser(req);
    const forceDesktopMode = req.body?.forceDesktopMode;
    if (typeof forceDesktopMode !== "boolean") {
      res.status(400).json({ error: "Paramètre d'affichage invalide" });
      return;
    }

    try {
      const settings = await api.setForceDesktopMode(forceDesktopMode);
      await api.logAudit(
        authUser.id,
        authUser.email,
        "ADMIN_UPDATE_SITE_SETTINGS",
        "SiteSetting",
        "forceDesktopMode",
        { forceDesktopMode: settings.forceDesktopMode },
        req.ip,
      );
      api.logSecurity("INFO", "Admin updated site display settings", {
        userId: authUser.id,
        forceDesktopMode: settings.forceDesktopMode,
      });

      res.json(settings);
    } catch (err) {
      const status = Number((err as { status?: number })?.status) || 503;
      api.logDb("ERROR", "Admin site settings update failed", { error: String(err), forceDesktopMode });
      res.status(status).json({ error: "Modification du réglage d'affichage impossible" });
    }
  });

  app.get("/api/admin/professor-invites", requireAuth, requireAdmin, async (_req, res) => {
    const invitations = await api.prisma.professorInviteCode.findMany({
      orderBy: { createdAt: "desc" },
      include: { usedBy: { select: { id: true, fullName: true, email: true } } },
    });
    api.logInvitation("INFO", "Admin listed access keys");
    res.json(invitations.map(api.professorInviteSnapshot));
  });

  app.post("/api/admin/professor-invites", requireAuth, requireAdmin, async (req, res) => {
    const authUser = getAuthUser(req);
    const code = api.normalizeProfessorInviteCode(req.body?.code || api.generateProfessorInviteCode(true));
    if (!code) {
      res.status(400).json({ error: "Clé d'accès absente" });
      return;
    }

    try {
      const invite = await api.prisma.professorInviteCode.create({
        data: { code, createdById: authUser.id },
      });
      api.logInvitation("INFO", "Admin created access key", { codeSuffix: invite.code.slice(-4) });
      res.status(201).json(api.professorInviteSnapshot(invite));
    } catch (err: unknown) {
      const prismaCode = (err as { code?: string })?.code;
      if (prismaCode === "P2002") {
        res.status(409).json({ error: "Clé d'accès déjà existante" });
        return;
      }
      api.logDb("ERROR", "Access key creation failed", { codeSuffix: code.slice(-4), error: String(err) });
      res.status(500).json({ error: "Création de la clé impossible" });
    }
  });

  app.delete("/api/admin/professor-invites/:code", requireAuth, requireAdmin, async (req, res) => {
    const code = api.normalizeProfessorInviteCode(req.params.code);
    const invite = await api.prisma.professorInviteCode.findUnique({ where: { code } });
    if (!invite) {
      res.status(404).json({ error: "Clé d'accès introuvable" });
      return;
    }

    await api.prisma.professorInviteCode.delete({
      where: { code },
    });
    api.logInvitation("INFO", "Admin deleted access key", {
      codeSuffix: code.slice(-4),
      used: Boolean(invite.usedAt),
    });
    res.json({ ok: true });
  });

  app.delete("/api/admin/courses/:courseId/enrollments/:studentId", requireAuth, requireAdmin, async (req, res) => {
    const authUser = getAuthUser(req);
    const courseId = api.parsePositiveInt(req.params.courseId);
    const studentId = String(req.params.studentId || "").trim();

    if (!courseId || !studentId) {
      res.status(400).json({ error: "Inscription à retirer invalide" });
      return;
    }

    const [course, student, enrollment, paymentCount] = await Promise.all([
      api.prisma.course.findUnique({
        where: { id: courseId },
        select: { id: true, title: true },
      }),
      api.prisma.user.findUnique({
        where: { id: studentId },
        select: { id: true, fullName: true, email: true, role: true },
      }),
      api.prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: studentId, courseId } },
        select: { id: true, active: true },
      }),
      api.prisma.payment.count({
        where: { userId: studentId, courseId },
      }),
    ]);

    if (!course) {
      res.status(404).json({ error: api.PUBLIC_API_ERRORS.courseNotFound });
      return;
    }

    if (!student || student.role !== "STUDENT") {
      res.status(404).json({ error: "Étudiant introuvable" });
      return;
    }

    if (!enrollment || !enrollment.active) {
      res.status(404).json({ error: "Inscription introuvable ou déjà retirée" });
      return;
    }

    await api.prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        active: false,
        endDate: new Date(),
      },
    });

    api.invalidateAuthUserCache(student.id);
    await api.invalidateStudentCatalogCache(student.id);
    await api.logAudit(
      authUser.id,
      authUser.email,
      "ADMIN_REMOVE_COURSE_ENROLLMENT",
      "Enrollment",
      enrollment.id,
      {
        courseId: course.id,
        courseTitle: course.title,
        studentId: student.id,
        studentEmail: student.email,
        studentName: student.fullName,
        paidEnrollment: paymentCount > 0,
      },
      req.ip,
    );

    api.logSecurity("WARN", "Admin removed student enrollment", {
      adminId: authUser.id,
      studentId: student.id,
      courseId: course.id,
      paidEnrollment: paymentCount > 0,
    });

    res.json({
      ok: true,
      courseId: course.id,
      studentId: student.id,
      removedEnrollmentId: enrollment.id,
      paidEnrollment: paymentCount > 0,
    });
  });

  app.post(
    "/api/admin/academic-domains",
    requireAuth,
    requireAdmin,
    validateBody(api.academicDomainSchema),
    async (req, res) => {
      const authUser = getAuthUser(req);
      const id = await nextFacultyDomainId();
      const name = req.body.name;
      const slug = slugifyAcademicLabel(req.body.slug || name, `domaine-${id}`);

      try {
        const domain = await api.prisma.facultyDomain.create({
          data: {
            id,
            name,
            slug,
            iconName: req.body.iconName || "Layers",
            color: req.body.color || "from-teal-600 to-emerald-600",
            description: req.body.description || "Domaine académique personnalisé.",
            order: req.body.order ?? id,
          },
          include: { disciplines: { orderBy: { order: "asc" } } },
        });

        await api.invalidatePublicCatalogCache();
        await api.logAudit(
          authUser.id,
          authUser.email,
          "ADMIN_CREATE_ACADEMIC_DOMAIN",
          "FacultyDomain",
          String(domain.id),
          { name: domain.name, slug: domain.slug },
          req.ip,
        );

        res.status(201).json(api.toDomain({ ...domain, courseCount: 0 }));
      } catch (err: unknown) {
        api.logDb("ERROR", "Academic domain creation failed", { error: String(err), name });
        res.status((err as { code?: string })?.code === "P2002" ? 409 : 500).json({
          error: taxonomyConflictMessage(err, "Création du domaine impossible"),
        });
      }
    },
  );

  app.put(
    "/api/admin/academic-domains/:domainId",
    requireAuth,
    requireAdmin,
    validateBody(api.academicDomainPatchSchema),
    async (req, res) => {
      const authUser = getAuthUser(req);
      const domainId = api.parsePositiveInt(req.params.domainId);
      if (!domainId) {
        res.status(400).json({ error: "Domaine académique invalide" });
        return;
      }

      const existing = await api.prisma.facultyDomain.findUnique({ where: { id: domainId } });
      if (!existing) {
        res.status(404).json({ error: "Domaine académique introuvable" });
        return;
      }

      const data: Record<string, unknown> = {};
      if (req.body.name !== undefined) data.name = req.body.name;
      if (req.body.slug !== undefined)
        data.slug = slugifyAcademicLabel(req.body.slug || req.body.name || existing.name, existing.slug);
      if (req.body.iconName !== undefined) data.iconName = req.body.iconName || existing.iconName;
      if (req.body.color !== undefined) data.color = req.body.color || existing.color;
      if (req.body.description !== undefined) data.description = req.body.description || existing.description;
      if (req.body.order !== undefined) data.order = req.body.order;

      try {
        const domain = await api.prisma.facultyDomain.update({
          where: { id: domainId },
          data,
          include: { disciplines: { orderBy: { order: "asc" } } },
        });

        await api.invalidatePublicCatalogCache();
        await api.logAudit(
          authUser.id,
          authUser.email,
          "ADMIN_UPDATE_ACADEMIC_DOMAIN",
          "FacultyDomain",
          String(domain.id),
          { name: domain.name, slug: domain.slug },
          req.ip,
        );

        res.json(api.toDomain(domain));
      } catch (err: unknown) {
        api.logDb("ERROR", "Academic domain update failed", { error: String(err), domainId });
        res.status((err as { code?: string })?.code === "P2002" ? 409 : 500).json({
          error: taxonomyConflictMessage(err, "Modification du domaine impossible"),
        });
      }
    },
  );

  app.delete("/api/admin/academic-domains/:domainId", requireAuth, requireAdmin, async (req, res) => {
    const authUser = getAuthUser(req);
    const domainId = api.parsePositiveInt(req.params.domainId);
    if (!domainId) {
      res.status(400).json({ error: "Domaine académique invalide" });
      return;
    }

    const domain = await api.prisma.facultyDomain.findUnique({
      where: { id: domainId },
      include: { _count: { select: { disciplines: true } } },
    });
    if (!domain) {
      res.status(404).json({ error: "Domaine académique introuvable" });
      return;
    }
    if (domain._count.disciplines > 0) {
      res.status(409).json({ error: "Supprimez d'abord les sous-domaines de ce domaine" });
      return;
    }

    await api.prisma.facultyDomain.delete({ where: { id: domainId } });
    await api.invalidatePublicCatalogCache();
    await api.logAudit(
      authUser.id,
      authUser.email,
      "ADMIN_DELETE_ACADEMIC_DOMAIN",
      "FacultyDomain",
      String(domain.id),
      { name: domain.name, slug: domain.slug },
      req.ip,
    );

    res.json({ ok: true, domainId });
  });

  app.post(
    "/api/admin/academic-domains/:domainId/disciplines",
    requireAuth,
    requireAdmin,
    validateBody(api.academicDisciplineSchema),
    async (req, res) => {
      const authUser = getAuthUser(req);
      const domainId = api.parsePositiveInt(req.params.domainId);
      if (!domainId) {
        res.status(400).json({ error: "Domaine académique invalide" });
        return;
      }

      const domain = await api.prisma.facultyDomain.findUnique({ where: { id: domainId } });
      if (!domain) {
        res.status(404).json({ error: "Domaine académique introuvable" });
        return;
      }

      const id = await nextDisciplineId();
      const name = req.body.name;
      const slug = slugifyAcademicLabel(req.body.slug || name, `sous-domaine-${id}`);

      try {
        const discipline = await api.prisma.discipline.create({
          data: {
            id,
            domainId,
            name,
            slug,
            order: req.body.order ?? id,
          },
          include: { domain: true },
        });

        await api.invalidatePublicCatalogCache();
        await api.logAudit(
          authUser.id,
          authUser.email,
          "ADMIN_CREATE_ACADEMIC_DISCIPLINE",
          "Discipline",
          String(discipline.id),
          { name: discipline.name, slug: discipline.slug, domainId },
          req.ip,
        );

        res.status(201).json(api.toDiscipline({ ...discipline, courseCount: 0 }));
      } catch (err: unknown) {
        api.logDb("ERROR", "Academic discipline creation failed", { error: String(err), domainId, name });
        res.status((err as { code?: string })?.code === "P2002" ? 409 : 500).json({
          error: taxonomyConflictMessage(err, "Création du sous-domaine impossible"),
        });
      }
    },
  );

  app.put(
    "/api/admin/academic-disciplines/:disciplineId",
    requireAuth,
    requireAdmin,
    validateBody(api.academicDisciplinePatchSchema),
    async (req, res) => {
      const authUser = getAuthUser(req);
      const disciplineId = api.parsePositiveInt(req.params.disciplineId);
      if (!disciplineId) {
        res.status(400).json({ error: "Sous-domaine académique invalide" });
        return;
      }

      const existing = await api.prisma.discipline.findUnique({ where: { id: disciplineId } });
      if (!existing) {
        res.status(404).json({ error: "Sous-domaine académique introuvable" });
        return;
      }

      if (req.body.domainId !== undefined) {
        const domain = await api.prisma.facultyDomain.findUnique({ where: { id: Number(req.body.domainId) } });
        if (!domain) {
          res.status(404).json({ error: "Domaine cible introuvable" });
          return;
        }
      }

      const data: Record<string, unknown> = {};
      if (req.body.name !== undefined) data.name = req.body.name;
      if (req.body.slug !== undefined) {
        data.slug = slugifyAcademicLabel(req.body.slug || req.body.name || existing.name, existing.slug);
      }
      if (req.body.order !== undefined) data.order = req.body.order;
      if (req.body.domainId !== undefined) data.domainId = Number(req.body.domainId);

      try {
        const discipline = await api.prisma.discipline.update({
          where: { id: disciplineId },
          data,
          include: { domain: true },
        });

        await api.invalidatePublicCatalogCache();
        await api.logAudit(
          authUser.id,
          authUser.email,
          "ADMIN_UPDATE_ACADEMIC_DISCIPLINE",
          "Discipline",
          String(discipline.id),
          { name: discipline.name, slug: discipline.slug, domainId: discipline.domainId },
          req.ip,
        );

        res.json(api.toDiscipline(discipline));
      } catch (err: unknown) {
        api.logDb("ERROR", "Academic discipline update failed", { error: String(err), disciplineId });
        res.status((err as { code?: string })?.code === "P2002" ? 409 : 500).json({
          error: taxonomyConflictMessage(err, "Modification du sous-domaine impossible"),
        });
      }
    },
  );

  app.delete("/api/admin/academic-disciplines/:disciplineId", requireAuth, requireAdmin, async (req, res) => {
    const authUser = getAuthUser(req);
    const disciplineId = api.parsePositiveInt(req.params.disciplineId);
    if (!disciplineId) {
      res.status(400).json({ error: "Sous-domaine académique invalide" });
      return;
    }

    const discipline = await api.prisma.discipline.findUnique({
      where: { id: disciplineId },
      include: { _count: { select: { courses: true } } },
    });
    if (!discipline) {
      res.status(404).json({ error: "Sous-domaine académique introuvable" });
      return;
    }
    if (discipline._count.courses > 0) {
      res.status(409).json({ error: "Déplacez ou supprimez les modules attachés avant de supprimer ce sous-domaine" });
      return;
    }

    await api.prisma.discipline.delete({ where: { id: disciplineId } });
    await api.invalidatePublicCatalogCache();
    await api.logAudit(
      authUser.id,
      authUser.email,
      "ADMIN_DELETE_ACADEMIC_DISCIPLINE",
      "Discipline",
      String(discipline.id),
      { name: discipline.name, slug: discipline.slug, domainId: discipline.domainId },
      req.ip,
    );

    res.json({ ok: true, disciplineId });
  });

  app.get("/api/admin/email-delivery-logs", requireAuth, requireAdmin, async (_req, res) => {
    const logs = await api.prisma.emailDeliveryLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    api.logEmail("INFO", "Admin listed email delivery logs", { count: logs.length });
    res.json(logs.map(api.emailDeliveryLogSnapshot));
  });

  app.get("/api/admin/email-delivery-summary", requireAuth, requireAdmin, async (_req, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const logs = await api.prisma.emailDeliveryLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    const summary = api.buildEmailDeliverySummary(logs, api.getSmtpPublicConfig().configured);
    const emailsSentToday = await api.prisma.emailDeliveryLog.count({
      where: {
        providerStatus: "QUEUED",
        createdAt: { gte: today },
      },
    });

    api.logEmail("INFO", "Admin listed email delivery summary", { emailsSentToday });
    res.json({
      smtpConfigured: summary.smtpConfigured,
      lastEmailSent: summary.lastEmailSent ? api.emailDeliveryLogSnapshot(summary.lastEmailSent) : null,
      emailsSentToday,
      lastSmtpError: summary.lastSmtpError ? api.emailDeliveryLogSnapshot(summary.lastSmtpError) : null,
    });
  });

  app.post("/api/test-email", requireAuth, requireAdmin, async (req, res) => {
    const authUser = getAuthUser(req);
    const to = String(req.body?.to || "")
      .trim()
      .toLowerCase();
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      res.status(400).json({ error: "Adresse e-mail destinataire invalide" });
      return;
    }

    api.logEmail("INFO", "Admin SMTP test requested", {
      userId: authUser.id,
      recipientDomain: api.getEmailDomain(to),
      smtp: api.getSmtpPublicConfig(),
    });

    try {
      const delivery = await api.sendAdminTestEmail(to);
      if (!delivery.sent) {
        api.logEmail("WARN", "Admin SMTP test not sent", {
          userId: authUser.id,
          recipientDomain: api.getEmailDomain(to),
          reason: delivery.reason,
          smtp: api.getSmtpPublicConfig(),
        });
        await api.recordEmailDeliveryLog(
          "admin_test",
          authUser.id,
          to,
          api.buildFailedEmailDelivery(to, delivery.reason),
        );
        res.status(503).json({ error: api.PUBLIC_API_ERRORS.smtpNotConfigured, code: "SMTP_NOT_CONFIGURED" });
        return;
      }

      await api.recordEmailDeliveryLog("admin_test", authUser.id, to, delivery.delivery);
      api.logEmail("INFO", "Admin SMTP test sent", {
        userId: authUser.id,
        recipientDomain: api.getEmailDomain(to),
        delivery: delivery.delivery,
      });
      res.json({ ok: true, message: "E-mail de test envoyé", delivery: delivery.delivery });
    } catch (err: unknown) {
      const details = api.getEmailErrorDetails(err);
      api.logEmail("ERROR", "Admin SMTP test failed", {
        userId: authUser.id,
        recipientDomain: api.getEmailDomain(to),
        smtp: api.getSmtpPublicConfig(),
        error: details,
      });
      await api.recordEmailDeliveryLog("admin_test", authUser.id, to, api.buildFailedEmailDelivery(to, details));
      res.status(502).json({ error: api.PUBLIC_API_ERRORS.smtpSendFailed, code: "SMTP_SEND_FAILED" });
    }
  });

  app.get("/api/admin/audit-logs", requireAuth, requireAdmin, async (req, res) => {
    const limit = Number(req.query.limit) || 50;
    const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
    const action = typeof req.query.action === "string" ? req.query.action.trim() : undefined;
    const userId = typeof req.query.userId === "string" ? req.query.userId.trim() : undefined;
    const since = parseAuditLogDate(req.query.since);
    const until = parseAuditLogDate(req.query.until);

    if ((req.query.since && !since) || (req.query.until && !until)) {
      res.status(400).json({ error: "Plage de dates invalide" });
      return;
    }

    const page = await listAuditLogs({ limit, cursor, action, userId, since, until });
    api.logSecurity("INFO", "Admin listed audit logs", { count: page.items.length, action, userId });
    res.json({
      items: page.items.map(auditLogSnapshot),
      nextCursor: page.nextCursor,
    });
  });

  app.get("/api/admin/audit-logs/export", requireAuth, requireAdmin, async (req, res) => {
    const authUser = getAuthUser(req);
    const format = req.query.format === "json" ? "json" : "csv";
    const action = typeof req.query.action === "string" ? req.query.action.trim() : undefined;
    const userId = typeof req.query.userId === "string" ? req.query.userId.trim() : undefined;
    const since = parseAuditLogDate(req.query.since);
    const until = parseAuditLogDate(req.query.until);

    if ((req.query.since && !since) || (req.query.until && !until)) {
      res.status(400).json({ error: "Plage de dates invalide" });
      return;
    }

    const logs = await fetchAuditLogsForExport({ action, userId, since, until });
    const items = logs.map(auditLogSnapshot);

    await api.logAudit(
      authUser.id,
      authUser.email,
      "AUDIT_LOG_EXPORT",
      "AuditLog",
      null,
      { format, count: items.length, action, userId, since: since?.toISOString(), until: until?.toISOString() },
      req.ip,
    );

    if (format === "json") {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="audit-logs.json"');
      res.json(items);
      return;
    }

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="audit-logs.csv"');
    res.send(buildAuditLogCsv(items));
  });

  app.get("/api/admin/academic-profiles", requireAuth, requireAdmin, async (_req, res) => {
    const users = await api.prisma.user.findMany({
      where: { role: { in: ["PROFESSOR", "RESEARCHER", "ADMIN"] } },
      include: { academicProfile: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    res.json(
      users.map((user) => ({
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
        },
        profile: user.academicProfile ? api.toAcademicProfile(user.academicProfile) : null,
      })),
    );
  });
}
