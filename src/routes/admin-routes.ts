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

export function registerAdminRoutes(app: Express, ctx: RouteContext): void {
  const { requireAuth, requireAdmin } = ctx.middleware;

  app.get("/api/admin/professor-invites", requireAuth, requireAdmin, async (_req, res) => {
    const invitations = await api.prisma.professorInviteCode.findMany({
      orderBy: { createdAt: "desc" },
      include: { usedBy: true },
    });
    api.logInvitation("INFO", "Admin listed professor invitations");
    res.json(invitations.map(api.professorInviteSnapshot));
  });

  app.post("/api/admin/professor-invites", requireAuth, requireAdmin, async (req, res) => {
    const authUser = getAuthUser(req);
    const code = api.normalizeProfessorInviteCode(req.body?.code || api.generateProfessorInviteCode(true));
    if (!code) {
      res.status(400).json({ error: "Code d'invitation absent" });
      return;
    }

    try {
      const invite = await api.prisma.professorInviteCode.create({
        data: { code, createdById: authUser.id },
      });
      api.logInvitation("INFO", "Admin created professor invitation", { codeSuffix: invite.code.slice(-4) });
      res.status(201).json({ code: invite.code });
    } catch (err: unknown) {
      const prismaCode = (err as { code?: string })?.code;
      if (prismaCode === "P2002") {
        res.status(409).json({ error: "Code d'invitation déjà existant" });
        return;
      }
      api.logDb("ERROR", "Professor invitation creation failed", { codeSuffix: code.slice(-4), error: String(err) });
      res.status(500).json({ error: "Création du code impossible" });
    }
  });

  app.delete("/api/admin/professor-invites/:code", requireAuth, requireAdmin, async (req, res) => {
    const code = api.normalizeProfessorInviteCode(req.params.code);
    const invite = await api.prisma.professorInviteCode.findUnique({ where: { code } });
    if (!invite || invite.revokedAt) {
      res.status(404).json({ error: "Code d'invitation introuvable ou déjà révoqué" });
      return;
    }

    await api.prisma.professorInviteCode.update({
      where: { code },
      data: { revokedAt: new Date() },
    });
    api.logInvitation("INFO", "Admin revoked professor invitation", { codeSuffix: code.slice(-4) });
    res.json({ ok: true });
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
      res.json({ ok: true, message: "E-mail de diagnostic envoyé", delivery: delivery.delivery });
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
