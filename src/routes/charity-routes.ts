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
import { processPayPalCaptureDonation, toPayPalDonationCaptureClientResponse } from "../paypal-charity-donation";
import { charityEventSnapshot, donationCampaignSnapshot, donationSnapshot } from "../server/mappers/charity-mappers";

async function requireCharityAccess(userId: string): Promise<boolean> {
  const hasAccess = await userHasCharityAccess(userId);
  return hasAccess;
}

function charityErrorStatus(err: CharityAccessCodeError): number {
  if (err.code === "PAGE_DISABLED") return 403;
  if (err.code === "ALREADY_USED") return 409;
  return 400;
}

export function registerCharityRoutes(app: Express, ctx: RouteContext): void {
  const { requireAuth } = ctx.middleware;

  app.get("/api/charity/access-status", requireAuth, async (req, res) => {
    const authUser = getAuthUser(req);
    const [pageEnabled, hasAccess] = await Promise.all([isCharityPageEnabled(), userHasCharityAccess(authUser.id)]);
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
      paymentEnabled: api.isPayPalConfigured(),
      paymentNotice: api.isPayPalConfigured()
        ? "Les dons sont encaissés en ligne via PayPal (carte ou compte PayPal). Le montant affiché en MAD peut être converti selon la devise PayPal configurée."
        : "Le paiement en ligne des dons sera activé dès que PayPal sera configuré sur la plateforme.",
    });
  });

  app.post("/api/charity/donations/paypal/create-order", requireAuth, async (req, res) => {
    const authUser = getAuthUser(req);
    if (!(await requireCharityAccess(authUser.id))) {
      res.status(403).json({ error: "Accès non autorisé" });
      return;
    }

    if (!api.isPayPalConfigured()) {
      res.status(503).json({ error: api.PUBLIC_API_ERRORS.paymentServiceUnavailable });
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
      select: { id: true, title: true },
    });
    if (!campaign) {
      res.status(404).json({ error: "Campagne de don introuvable" });
      return;
    }

    const roundedAmount = Math.round(amount * 100) / 100;

    try {
      const donation = await api.prisma.donation.create({
        data: {
          userId: authUser.id,
          campaignId,
          amount: roundedAmount,
          status: "PENDING",
        },
        include: { campaign: { select: { id: true, title: true } } },
      });

      const order = await api.createPayPalDonationOrder({
        donationId: donation.id,
        campaignTitle: campaign.title,
        amountMad: roundedAmount,
        userId: authUser.id,
      });

      res.json({
        id: order.id,
        currency: order.currency,
        amount: order.amount,
        amountMad: order.amountMad,
        donation: donationSnapshot(donation),
      });
    } catch (err: any) {
      api.logPayPalError("Charity PayPal create-order failed", {
        userId: authUser.id,
        campaignId,
        error: String(err?.message || err),
      });
      res.status(500).json({ error: api.PUBLIC_API_ERRORS.paypalCreateOrderFailed });
    }
  });

  app.post("/api/charity/donations/paypal/capture-order", requireAuth, async (req, res) => {
    const authUser = getAuthUser(req);
    if (!(await requireCharityAccess(authUser.id))) {
      res.status(403).json({ error: "Accès non autorisé" });
      return;
    }

    const orderId = String(req.body?.orderId || "").trim();
    const donationId = String(req.body?.donationId || "").trim();
    if (!orderId || !donationId) {
      res.status(400).json({ error: "orderId et donationId requis" });
      return;
    }

    if (!api.isPayPalConfigured()) {
      res.status(503).json({ error: api.PUBLIC_API_ERRORS.paymentServiceUnavailable });
      return;
    }

    try {
      const captureResult = await api.capturePayPalOrder(orderId);
      const result = await processPayPalCaptureDonation({
        orderId,
        captureResult,
        reqIp: req.ip,
        auditAction: "CHARITY_DONATION_PAYPAL_SUCCESS",
        expectedUserId: authUser.id,
        expectedDonationId: donationId,
      });

      if (result.ok === false) {
        res.status(result.status).json(toPayPalDonationCaptureClientResponse(result));
        return;
      }

      await api.logAudit(
        authUser.id,
        authUser.email,
        "CHARITY_DONATION_PAYPAL_SUCCESS",
        "Donation",
        result.donationId,
        { amountMad: result.donation.amount, captureOrderId: orderId },
        req.ip,
      );

      res.json({
        ok: true,
        message: "Don confirmé",
        donation: result.donation,
        duplicate: result.duplicate,
      });
    } catch (err: any) {
      api.logPayPalError("Charity PayPal capture-order failed", {
        userId: authUser.id,
        donationId,
        orderId,
        error: String(err?.message || err),
      });
      res.status(500).json({ error: api.PUBLIC_API_ERRORS.paypalCaptureFailed });
    }
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
