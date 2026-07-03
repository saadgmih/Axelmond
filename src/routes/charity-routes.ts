import type { Express } from "express";
import type { RouteContext } from "../server/route-context";
import { getAuthUser } from "../server/route-types";
import * as api from "../server/route-deps";
import {
  CharityAccessCodeError,
  consumeCharityAccessCode,
  isCharityPageEnabled,
  userHasCharityAccess,
} from "../charity-access-code";
import {
  charityEventSnapshot,
  donationCampaignSnapshot,
  donationSnapshot,
} from "../server/mappers/charity-mappers";

function charityErrorStatus(err: CharityAccessCodeError): number {
  if (err.code === "PAGE_DISABLED") return 403;
  if (err.code === "ALREADY_USED") return 409;
  return 400;
}

export function registerCharityRoutes(app: Express, ctx: RouteContext): void {
  const { requireAuth } = ctx.middleware;

  app.get("/api/charity/access-status", requireAuth, async (req, res) => {
    const authUser = getAuthUser(req);
    const [pageEnabled, hasAccess] = await Promise.all([
      isCharityPageEnabled(),
      userHasCharityAccess(authUser.id),
    ]);
    res.json({
      pageEnabled,
      hasAccess,
      needsCode: pageEnabled && !hasAccess,
    });
  });

  app.post("/api/charity/verify-code", requireAuth, async (req, res) => {
    const authUser = getAuthUser(req);
    const code = typeof req.body?.code === "string" ? req.body.code : "";

    try {
      await consumeCharityAccessCode(authUser.id, code);
      res.json({ ok: true, hasAccess: true });
    } catch (err) {
      if (err instanceof CharityAccessCodeError) {
        res.status(charityErrorStatus(err)).json({ error: err.message, code: err.code });
        return;
      }
      api.logDb("ERROR", "Charity code verification failed", { error: String(err) });
      res.status(500).json({ error: "Vérification du code impossible" });
    }
  });

  app.get("/api/charity/content", requireAuth, async (req, res) => {
    const authUser = getAuthUser(req);
    const hasAccess = await userHasCharityAccess(authUser.id);
    if (!hasAccess) {
      res.status(403).json({ error: "Accès non autorisé. Un code d'accès valide est requis." });
      return;
    }

    const [campaigns, events, donations] = await Promise.all([
      api.prisma.donationCampaign.findMany({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
      }),
      api.prisma.charityEvent.findMany({
        where: { isActive: true },
        orderBy: { eventDateTime: "asc" },
      }),
      api.prisma.donation.findMany({
        where: { userId: authUser.id },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { campaign: { select: { id: true, title: true } } },
      }),
    ]);

    res.json({
      campaigns: campaigns.map(donationCampaignSnapshot),
      events: events.map(charityEventSnapshot),
      donations: donations.map(donationSnapshot),
      paymentNotice:
        "Le paiement en ligne des dons sera activé après validation juridique et mise en place d'un prestataire conforme.",
    });
  });

  app.post("/api/charity/donations", requireAuth, async (req, res) => {
    const authUser = getAuthUser(req);
    const hasAccess = await userHasCharityAccess(authUser.id);
    if (!hasAccess) {
      res.status(403).json({ error: "Accès non autorisé" });
      return;
    }

    const campaignId = String(req.body?.campaignId || "").trim();
    const amount = Number(req.body?.amount);
    if (!campaignId || !Number.isFinite(amount) || amount <= 0) {
      res.status(400).json({ error: "Montant ou campagne invalide" });
      return;
    }

    const campaign = await api.prisma.donationCampaign.findFirst({
      where: { id: campaignId, isActive: true },
      select: { id: true },
    });
    if (!campaign) {
      res.status(404).json({ error: "Campagne de don introuvable" });
      return;
    }

    const donation = await api.prisma.donation.create({
      data: {
        userId: authUser.id,
        campaignId,
        amount: Math.round(amount * 100) / 100,
        status: "PENDING",
      },
      include: { campaign: { select: { id: true, title: true } } },
    });

    res.status(201).json({
      donation: donationSnapshot(donation),
      notice:
        "Votre intention de don a été enregistrée. Le paiement en ligne sera disponible prochainement, après conformité légale.",
    });
  });
}
