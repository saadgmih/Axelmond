import type { Express, RequestHandler } from "express";
import express from "express";
import { getAuthUser } from "../server/route-types";
import type { RouteContext } from "../server/route-context";
import * as api from "../server/route-deps";
import { isMockEnrollmentAllowed, JSON_BODY_LIMIT } from "../security-hardening";
import {
  extractPayPalWebhookHeaders,
  handlePayPalWebhookEvent,
  isPayPalWebhookConfigured,
  parsePayPalWebhookEvent,
  verifyPayPalWebhookSignature,
} from "../paypal-webhook";
import { logPayPalError } from "../paypal-server";
import { registerPayPalConfigRoute } from "../paypal-routes";
import {
  assertPayPalPromoReservationUsable,
  attachPromoReservationExternalReference,
  PromoCodeError,
  releasePromoCodeReservationByExternalReference,
  releasePromoCodeReservationById,
  reservePromoCodeUsage,
  validatePromoCodeEligibility,
} from "../promo-code-service";

function buildPersistCoursePaymentEnrollment(ctx: RouteContext) {
  const d = ctx.deps;
  return (params: {
    userId: string;
    courseId: number;
    courseTitle: string;
    coursePrice: number;
    invoiceId: string;
    provider: "PAYPAL" | "MOCK";
    externalId: string;
    auditAction: string;
    reqIp?: string;
    hasAiAccess?: boolean;
    promoUsageId?: string;
  }) =>
    api.persistCoursePaymentEnrollment(params, {
      logAudit: d.logAudit,
      invalidateAuthUserCache: d.invalidateAuthUserCache,
    });
}

export function registerPayPalWebhook(app: Express, ctx: RouteContext, rateLimiter?: RequestHandler): void {
  const persistCoursePaymentEnrollment = buildPersistCoursePaymentEnrollment(ctx);

  app.post(
    "/api/paypal/webhook",
    ...(rateLimiter ? [rateLimiter] : []),
    express.raw({ type: "application/json", limit: JSON_BODY_LIMIT }),
    async (req, res) => {
      if (!isPayPalWebhookConfigured()) {
        res.status(503).json({ error: "Webhook PayPal non configuré" });
        return;
      }

      const headers = extractPayPalWebhookHeaders(req.headers);
      const event = parsePayPalWebhookEvent(req.body as Buffer);
      if (!headers || !event) {
        res.status(400).json({ error: "Webhook PayPal invalide" });
        return;
      }

      const verified = await verifyPayPalWebhookSignature({ headers, webhookEvent: event });
      if (!verified) {
        logPayPalError("PayPal webhook signature rejected", { transmissionId: headers.transmissionId });
        res.status(401).json({ error: "Signature PayPal invalide" });
        return;
      }

      try {
        const result = await handlePayPalWebhookEvent(event, {
          reqIp: req.ip,
          persistCoursePaymentEnrollment,
        });

        if ("ignored" in result) {
          res.status(200).json({ ok: true, ignored: true, eventType: result.eventType });
          return;
        }

        if (result.ok === false) {
          res.status(result.status).json(api.toPayPalCaptureClientResponse(result));
          return;
        }

        if ("donationId" in result) {
          res.status(200).json({
            ok: true,
            duplicate: result.duplicate,
            donationId: result.donationId,
            userId: result.userId,
          });
          return;
        }

        res.status(200).json({
          ok: true,
          duplicate: result.duplicate,
          invoiceId: result.invoiceId,
          userId: result.userId,
          courseId: result.courseId,
        });
      } catch (err: any) {
        logPayPalError("PayPal webhook handler failed", { error: String(err?.message || err) });
        res.status(500).json({ error: "Traitement webhook PayPal impossible" });
      }
    },
  );
}

export function registerPaymentsRoutes(app: Express, ctx: RouteContext): void {
  const { requireAuth } = ctx.middleware;
  const persistCoursePaymentEnrollment = buildPersistCoursePaymentEnrollment(ctx);

  registerPayPalConfigRoute(app);

  // POST /api/paypal/create-order - Create a PayPal checkout order

  app.post("/api/paypal/create-order", requireAuth, async (req, res) => {
    const authUser = getAuthUser(req);

    const courseId = Number(req.body?.courseId);

    if (!courseId || Number.isNaN(courseId)) {
      res.status(400).json({ error: "courseId requis" });

      return;
    }

    if (!api.isPayPalConfigured()) {
      res.status(503).json({ error: api.PUBLIC_API_ERRORS.paymentServiceUnavailable });

      return;
    }

    const course = await api.prisma.course.findUnique({ where: { id: courseId } });

    if (!course) {
      res.status(404).json({ error: "Module non trouvé" });

      return;
    }

    const existing = await api.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: authUser.id, courseId } },
    });

    const isExpired = existing?.endDate && new Date(existing.endDate) < new Date();
    if (existing?.active && !isExpired) {
      res.status(400).json({ error: "Déjà inscrit à ce module" });

      return;
    }

    const promoCode = String(req.body?.promoCode || "").trim();
    const includeAiAssistant = Boolean(req.body?.includeAiAssistant);

    let moduleAmountMad = course.price;
    let promoReservation: Awaited<ReturnType<typeof reservePromoCodeUsage>> = null;
    if (promoCode) {
      try {
        const preview = await validatePromoCodeEligibility({
          code: promoCode,
          userId: authUser.id,
          courseId,
          originalAmount: course.price,
        });
        if (api.isFreeCourseCharge(preview.finalAmount)) {
          res.status(400).json({
            error: "Utilisez l'inscription gratuite pour ce module.",
            code: "FREE_ENROLLMENT_REQUIRED",
          });
          return;
        }
        promoReservation = await reservePromoCodeUsage({
          code: promoCode,
          userId: authUser.id,
          courseId,
          originalAmount: course.price,
          provider: "PAYPAL",
          expiresAt: new Date(Date.now() + 30 * 60_000),
        });
        moduleAmountMad = promoReservation?.quote.finalAmount ?? course.price;
      } catch (error) {
        if (error instanceof PromoCodeError) {
          res.status(error.statusCode).json({ error: error.message, code: error.code });
          return;
        }
        throw error;
      }
    }

    if (api.isFreeCourseCharge(moduleAmountMad)) {
      res.status(400).json({
        error: "Utilisez l'inscription gratuite pour ce module.",
        code: "FREE_ENROLLMENT_REQUIRED",
      });

      return;
    }

    if (promoReservation) {
      api.logSecurity("INFO", "PayPal order promo applied", {
        userId: authUser.id,
        courseId,
        promoUsageId: promoReservation.usage.id,
        amountMad: moduleAmountMad,
      });
    }

    try {
      const checkoutTotalMad = api.computeCourseCheckoutTotalMad({
        modulePriceMad: moduleAmountMad,
        includeAiAssistant,
        isFreeModule: false,
      });

      const order = await api.createPayPalOrder({
        courseId,

        courseTitle: course.title,

        courseDescription: course.description,

        amountMad: checkoutTotalMad,

        userId: authUser.id,

        includeAiAssistant,
        promoReservationReference: promoReservation?.usage.publicReference,
      });

      if (promoReservation) {
        const attached = await attachPromoReservationExternalReference(promoReservation.usage.id, order.id);
        if (attached.count !== 1) {
          await releasePromoCodeReservationById(promoReservation.usage.id, true);
          throw new Error("PROMO_PAYPAL_RESERVATION_ATTACH_FAILED");
        }
      }

      res.json({
        id: order.id,

        currency: order.currency,

        amount: order.amount,

        amountMad: order.amountMad,
        promotion: promoReservation
          ? {
              code: promoReservation.promo.code,
              originalAmount: promoReservation.quote.originalAmount,
              discountAmount: promoReservation.quote.discountAmount,
              finalAmount: promoReservation.quote.finalAmount,
              provisional: true,
            }
          : null,
      });
    } catch (err: any) {
      if (promoReservation)
        await releasePromoCodeReservationById(promoReservation.usage.id, true).catch(() => undefined);
      api.logPayPalError("PayPal create-order route failed", {
        userId: authUser.id,

        courseId,

        error: String(err?.message || err),
      });

      res.status(500).json({ error: api.PUBLIC_API_ERRORS.paypalCreateOrderFailed });
    }
  });

  // POST /api/paypal/capture-order - Capture payment and enroll student

  app.post("/api/paypal/capture-order", requireAuth, async (req, res) => {
    const authUser = getAuthUser(req);

    const orderId = String(req.body?.orderId || "").trim();

    const courseId = Number(req.body?.courseId);

    if (!orderId) {
      res.status(400).json({ error: "orderId requis" });

      return;
    }

    if (!courseId || Number.isNaN(courseId)) {
      res.status(400).json({ error: "courseId requis" });

      return;
    }

    if (!api.isPayPalConfigured()) {
      res.status(503).json({ error: api.PUBLIC_API_ERRORS.paymentServiceUnavailable });

      return;
    }

    try {
      try {
        await assertPayPalPromoReservationUsable(orderId);
      } catch (error) {
        if (error instanceof PromoCodeError) {
          res.status(error.statusCode).json({ error: error.message, code: error.code });
          return;
        }
        throw error;
      }
      const captureResult = await api.capturePayPalOrder(orderId);

      const result = await api.processPayPalCaptureEnrollment(
        {
          orderId,

          captureResult,

          reqIp: req.ip,

          auditAction: "PAYMENT_PAYPAL_SUCCESS",

          expectedUserId: authUser.id,

          expectedCourseId: courseId,
        },

        persistCoursePaymentEnrollment,
      );

      if (result.ok === false) {
        res.status(result.status).json(api.toPayPalCaptureClientResponse(result));

        return;
      }

      if (result.duplicate) {
        api.logSecurity("INFO", "PayPal capture duplicate ignored", {
          userId: authUser.id,

          courseId,

          invoiceId: result.invoiceId,

          orderId,
        });
      }

      res.json({
        ok: true,

        message: "Paiement confirmé",

        invoice: result.invoice,

        user: api.toAppUser(result.user!),
      });
    } catch (err: any) {
      api.logPayPalError("PayPal capture-order route failed", {
        userId: authUser.id,

        courseId,

        orderId,

        error: String(err?.message || err),
      });

      if (err?.message === "USER_NOT_FOUND") {
        res.status(500).json({ error: api.PUBLIC_API_ERRORS.paypalCaptureFailed });

        return;
      }

      res.status(500).json({ error: api.PUBLIC_API_ERRORS.paypalCaptureFailed });
    }
  });

  app.post("/api/paypal/cancel-order", requireAuth, async (req, res) => {
    const orderId = String(req.body?.orderId || "").trim();
    if (!orderId) {
      res.status(400).json({ error: "orderId requis" });
      return;
    }
    const usage = await api.prisma.promoCodeUsage.findUnique({
      where: { externalReference: orderId },
      select: { userId: true },
    });
    if (usage && usage.userId !== getAuthUser(req).id) {
      res.status(403).json({ error: "Commande PayPal invalide" });
      return;
    }
    res.json(await releasePromoCodeReservationByExternalReference(orderId, true));
  });

  // POST /api/payments/enroll-mock - Mock enrollment backend validation

  app.post("/api/payments/enroll-mock", requireAuth, async (req, res) => {
    if (!isMockEnrollmentAllowed()) {
      api.logSecurity("WARN", "Mock enrollment blocked", {
        userId: getAuthUser(req).id,
        nodeEnv: process.env.NODE_ENV || "development",
      });
      res.status(403).json({ error: "Inscription mock indisponible" });

      return;
    }

    const authUser = getAuthUser(req);

    const courseId = Number(req.body?.courseId);

    if (!courseId || isNaN(courseId)) {
      res.status(400).json({ error: "courseId requis" });

      return;
    }

    const course = await api.prisma.course.findUnique({ where: { id: courseId } });

    if (!course) {
      res.status(404).json({ error: "Module non trouvé" });

      return;
    }

    // Vérifier si déjà inscrit

    const existing = await api.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: authUser.id, courseId } },
    });

    const isExpired = existing?.endDate && new Date(existing.endDate) < new Date();
    if (existing && existing.active && !isExpired) {
      res.status(400).json({ error: "Déjà inscrit à ce module" });

      return;
    }

    const invoiceId = api.buildCourseInvoiceId("MOCK");
    const chargePricing = api.resolveCourseChargeAmount(course.price, "");
    const includeAiAssistant = Boolean(req.body?.includeAiAssistant);
    const checkoutTotalMad = api.computeCourseCheckoutTotalMad({
      modulePriceMad: chargePricing.amount,
      includeAiAssistant,
      isFreeModule: api.isFreeCourseCharge(chargePricing.amount),
    });

    try {
      const result = await persistCoursePaymentEnrollment({
        userId: authUser.id,
        courseId,
        courseTitle: course.title,
        coursePrice: checkoutTotalMad,
        invoiceId,
        provider: "MOCK",
        externalId: `mock-${authUser.id}-${courseId}`,
        auditAction: "ENROLL_MOCK",
        reqIp: req.ip,
        hasAiAccess: api.resolveEnrollmentHasAiAccess(includeAiAssistant),
      });

      api.logDb("INFO", "Student enrollment synchronized", {
        userId: authUser.id,
        courseId,
        invoiceId,
        duplicate: result.duplicate,
      });

      res.json({
        ok: true,
        message: "Inscription réussie",
        invoice: result.invoice,
        user: api.toAppUser(result.user),
      });
    } catch (err) {
      api.logDb("ERROR", "Mock enrollment failed", { userId: authUser.id, courseId, error: String(err) });
      if ((err as Error)?.message === "USER_NOT_FOUND") {
        res.status(500).json({ error: "Erreur lors de l'inscription" });
        return;
      }
      res.status(500).json({ error: "Erreur lors de l'inscription" });
    }
  });
}
