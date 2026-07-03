import type { Express } from "express";
import type { RouteContext } from "../server/route-context";
import { getAuthUser } from "../server/route-types";
import * as api from "../server/route-deps";
import {
  createCharityAccessCode,
  deactivateCharityAccessCode,
  isCharityPageEnabled,
  setCharityPageEnabled,
} from "../charity-access-code";
import {
  buildCharityEventDateTime,
  charityAccessCodeSnapshot,
  charityCodeUsageSnapshot,
  charityEventSnapshot,
  donationCampaignSnapshot,
  donationSnapshot,
} from "../server/mappers/charity-mappers";

function parseEventParts(body: Record<string, unknown>) {
  const year = Number(body.year);
  const month = Number(body.month);
  const day = Number(body.day);
  const hour = Number(body.hour);
  const minute = Number(body.minute);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }
  return { year, month, day, hour, minute };
}

export function registerCharityAdminRoutes(app: Express, ctx: RouteContext): void {
  const { requireAuth, requireAdmin } = ctx.middleware;

  app.get("/api/admin/charity/settings", requireAuth, requireAdmin, async (_req, res) => {
    const pageEnabled = await isCharityPageEnabled();
    const [activeCodes, totalUsages, activeCampaigns, upcomingEvents, pendingDonations] = await Promise.all([
      api.prisma.charityAccessCode.count({ where: { isActive: true } }),
      api.prisma.charityCodeUsage.count(),
      api.prisma.donationCampaign.count({ where: { isActive: true } }),
      api.prisma.charityEvent.count({ where: { isActive: true, eventDateTime: { gte: new Date() } } }),
      api.prisma.donation.count({ where: { status: "PENDING" } }),
    ]);
    res.json({
      pageEnabled,
      stats: { activeCodes, totalUsages, activeCampaigns, upcomingEvents, pendingDonations },
    });
  });

  app.put("/api/admin/charity/settings", requireAuth, requireAdmin, async (req, res) => {
    const authUser = getAuthUser(req);
    const pageEnabled = req.body?.pageEnabled;
    if (typeof pageEnabled !== "boolean") {
      res.status(400).json({ error: "Paramètre pageEnabled invalide" });
      return;
    }
    await setCharityPageEnabled(pageEnabled);
    await api.logAudit(
      authUser.id,
      authUser.email,
      pageEnabled ? "ADMIN_ENABLE_CHARITY_PAGE" : "ADMIN_DISABLE_CHARITY_PAGE",
      "CharitySettings",
      "charityPageEnabled",
      { pageEnabled },
      req.ip,
    );
    res.json({ pageEnabled });
  });

  app.get("/api/admin/charity/access-codes", requireAuth, requireAdmin, async (_req, res) => {
    const codes = await api.prisma.charityAccessCode.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { usages: true } } },
    });
    res.json(codes.map(charityAccessCodeSnapshot));
  });

  app.post("/api/admin/charity/access-codes", requireAuth, requireAdmin, async (req, res) => {
    const authUser = getAuthUser(req);
    const deactivateOthers = req.body?.deactivateOthers === true;

    try {
      const { record, plaintext } = await createCharityAccessCode(authUser.id, { deactivateOthers });
      await api.logAudit(
        authUser.id,
        authUser.email,
        "ADMIN_CREATE_CHARITY_CODE",
        "CharityAccessCode",
        record.id,
        { codeSuffix: record.codeSuffix, deactivateOthers },
        req.ip,
      );
      res.status(201).json({
        ...charityAccessCodeSnapshot({ ...record, _count: { usages: 0 } }),
        code: plaintext,
      });
    } catch (err) {
      api.logDb("ERROR", "Charity access code creation failed", { error: String(err) });
      res.status(500).json({ error: "Création du code impossible" });
    }
  });

  app.patch("/api/admin/charity/access-codes/:id/deactivate", requireAuth, requireAdmin, async (req, res) => {
    const authUser = getAuthUser(req);
    const codeId = String(req.params.id || "").trim();
    const ok = await deactivateCharityAccessCode(codeId);
    if (!ok) {
      res.status(404).json({ error: "Code introuvable ou déjà désactivé" });
      return;
    }
    await api.logAudit(
      authUser.id,
      authUser.email,
      "ADMIN_DEACTIVATE_CHARITY_CODE",
      "CharityAccessCode",
      codeId,
      {},
      req.ip,
    );
    res.json({ ok: true });
  });

  app.get("/api/admin/charity/access-codes/:id/usages", requireAuth, requireAdmin, async (req, res) => {
    const codeId = String(req.params.id || "").trim();
    const code = await api.prisma.charityAccessCode.findUnique({ where: { id: codeId }, select: { id: true } });
    if (!code) {
      res.status(404).json({ error: "Code introuvable" });
      return;
    }
    const usages = await api.prisma.charityCodeUsage.findMany({
      where: { codeId },
      orderBy: { usedAt: "desc" },
      include: { user: { select: { id: true, fullName: true, email: true } } },
    });
    res.json(usages.map(charityCodeUsageSnapshot));
  });

  app.get("/api/admin/charity/events", requireAuth, requireAdmin, async (_req, res) => {
    const events = await api.prisma.charityEvent.findMany({ orderBy: { eventDateTime: "desc" } });
    res.json(events.map(charityEventSnapshot));
  });

  app.post("/api/admin/charity/events", requireAuth, requireAdmin, async (req, res) => {
    const authUser = getAuthUser(req);
    const title = String(req.body?.title || "").trim();
    const description = String(req.body?.description || "").trim();
    const location = String(req.body?.location || "Au centre Performance Académique").trim();
    const parts = parseEventParts(req.body || {});
    if (!title || !description || !parts) {
      res.status(400).json({ error: "Événement invalide" });
      return;
    }

    const event = await api.prisma.charityEvent.create({
      data: {
        title,
        description,
        location: location || "Au centre Performance Académique",
        eventDateTime: buildCharityEventDateTime(parts),
        isActive: req.body?.isActive !== false,
      },
    });
    await api.logAudit(authUser.id, authUser.email, "ADMIN_CREATE_CHARITY_EVENT", "CharityEvent", event.id, { title }, req.ip);
    res.status(201).json(charityEventSnapshot(event));
  });

  app.put("/api/admin/charity/events/:id", requireAuth, requireAdmin, async (req, res) => {
    const authUser = getAuthUser(req);
    const eventId = String(req.params.id || "").trim();
    const existing = await api.prisma.charityEvent.findUnique({ where: { id: eventId } });
    if (!existing) {
      res.status(404).json({ error: "Événement introuvable" });
      return;
    }

    const title = req.body?.title !== undefined ? String(req.body.title).trim() : existing.title;
    const description =
      req.body?.description !== undefined ? String(req.body.description).trim() : existing.description;
    const location = req.body?.location !== undefined ? String(req.body.location).trim() : existing.location;
    const parts = parseEventParts(req.body || {});
    const eventDateTime = parts ? buildCharityEventDateTime(parts) : existing.eventDateTime;
    const isActive = req.body?.isActive !== undefined ? Boolean(req.body.isActive) : existing.isActive;

    if (!title || !description) {
      res.status(400).json({ error: "Événement invalide" });
      return;
    }

    const event = await api.prisma.charityEvent.update({
      where: { id: eventId },
      data: { title, description, location, eventDateTime, isActive },
    });
    await api.logAudit(authUser.id, authUser.email, "ADMIN_UPDATE_CHARITY_EVENT", "CharityEvent", event.id, { title }, req.ip);
    res.json(charityEventSnapshot(event));
  });

  app.delete("/api/admin/charity/events/:id", requireAuth, requireAdmin, async (req, res) => {
    const authUser = getAuthUser(req);
    const eventId = String(req.params.id || "").trim();
    const existing = await api.prisma.charityEvent.findUnique({ where: { id: eventId }, select: { id: true, title: true } });
    if (!existing) {
      res.status(404).json({ error: "Événement introuvable" });
      return;
    }
    await api.prisma.charityEvent.delete({ where: { id: eventId } });
    await api.logAudit(
      authUser.id,
      authUser.email,
      "ADMIN_DELETE_CHARITY_EVENT",
      "CharityEvent",
      eventId,
      { title: existing.title },
      req.ip,
    );
    res.json({ ok: true });
  });

  app.get("/api/admin/charity/campaigns", requireAuth, requireAdmin, async (_req, res) => {
    const campaigns = await api.prisma.donationCampaign.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { donations: true } } },
    });
    res.json(campaigns.map(donationCampaignSnapshot));
  });

  app.post("/api/admin/charity/campaigns", requireAuth, requireAdmin, async (req, res) => {
    const authUser = getAuthUser(req);
    const title = String(req.body?.title || "").trim();
    const description = String(req.body?.description || "").trim();
    if (!title || !description) {
      res.status(400).json({ error: "Campagne invalide" });
      return;
    }
    const campaign = await api.prisma.donationCampaign.create({
      data: { title, description, isActive: req.body?.isActive !== false },
    });
    await api.logAudit(
      authUser.id,
      authUser.email,
      "ADMIN_CREATE_DONATION_CAMPAIGN",
      "DonationCampaign",
      campaign.id,
      { title },
      req.ip,
    );
    res.status(201).json(donationCampaignSnapshot({ ...campaign, _count: { donations: 0 } }));
  });

  app.put("/api/admin/charity/campaigns/:id", requireAuth, requireAdmin, async (req, res) => {
    const authUser = getAuthUser(req);
    const campaignId = String(req.params.id || "").trim();
    const existing = await api.prisma.donationCampaign.findUnique({ where: { id: campaignId } });
    if (!existing) {
      res.status(404).json({ error: "Campagne introuvable" });
      return;
    }
    const title = req.body?.title !== undefined ? String(req.body.title).trim() : existing.title;
    const description =
      req.body?.description !== undefined ? String(req.body.description).trim() : existing.description;
    const isActive = req.body?.isActive !== undefined ? Boolean(req.body.isActive) : existing.isActive;
    if (!title || !description) {
      res.status(400).json({ error: "Campagne invalide" });
      return;
    }
    const campaign = await api.prisma.donationCampaign.update({
      where: { id: campaignId },
      data: { title, description, isActive },
      include: { _count: { select: { donations: true } } },
    });
    await api.logAudit(
      authUser.id,
      authUser.email,
      "ADMIN_UPDATE_DONATION_CAMPAIGN",
      "DonationCampaign",
      campaign.id,
      { title },
      req.ip,
    );
    res.json(donationCampaignSnapshot(campaign));
  });

  app.delete("/api/admin/charity/campaigns/:id", requireAuth, requireAdmin, async (req, res) => {
    const authUser = getAuthUser(req);
    const campaignId = String(req.params.id || "").trim();
    const existing = await api.prisma.donationCampaign.findUnique({
      where: { id: campaignId },
      select: { id: true, title: true },
    });
    if (!existing) {
      res.status(404).json({ error: "Campagne introuvable" });
      return;
    }
    await api.prisma.donationCampaign.delete({ where: { id: campaignId } });
    await api.logAudit(
      authUser.id,
      authUser.email,
      "ADMIN_DELETE_DONATION_CAMPAIGN",
      "DonationCampaign",
      campaignId,
      { title: existing.title },
      req.ip,
    );
    res.json({ ok: true });
  });

  app.get("/api/admin/charity/donations", requireAuth, requireAdmin, async (_req, res) => {
    const donations = await api.prisma.donation.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        campaign: { select: { id: true, title: true } },
      },
    });
    res.json(donations.map(donationSnapshot));
  });
}
