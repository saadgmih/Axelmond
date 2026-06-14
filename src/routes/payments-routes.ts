import type { Express, RequestHandler } from "express";
import express from "express";
import { getAuthUser } from "../server/route-types";
import type { RouteContext } from "../server/route-context";
import type { AppUser } from "../server/route-deps";
import * as api from "../server/route-deps";
import { JSON_BODY_LIMIT } from "../security-hardening";
import {
  extractPayPalWebhookHeaders,
  handlePayPalWebhookEvent,
  isPayPalWebhookConfigured,
  parsePayPalWebhookEvent,
  verifyPayPalWebhookSignature,
} from "../paypal-webhook";
import { logPayPalError } from "../paypal-server";
import { registerPayPalConfigRoute } from "../paypal-routes";

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
  const { requireAuth, requireRbac, requireAdmin, validateBody } = ctx.middleware;
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

    if (existing?.active) {
      res.status(400).json({ error: "Déjà inscrit à ce module" });

      return;
    }

    const promoCode = String(req.body?.promoCode || "").trim();

    const chargePricing = api.resolveCourseChargeAmount(course.price, promoCode);

    if (chargePricing.error) {
      res.status(400).json({ error: chargePricing.error });

      return;
    }

    try {
      const order = await api.createPayPalOrder({
        courseId,

        courseTitle: course.title,

        courseDescription: course.description,

        amountMad: chargePricing.amount,

        userId: authUser.id,
      });

      res.json({
        id: order.id,

        currency: order.currency,

        amount: order.amount,

        amountMad: order.amountMad,
      });
    } catch (err: any) {
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

  // POST /api/payments/enroll-mock - Mock enrollment backend validation

  app.post("/api/payments/enroll-mock", requireAuth, async (req, res) => {
    if (process.env.NODE_ENV === "production") {
      res.status(403).json({ error: "Inscription mock indisponible en production" });

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

    if (existing && existing.active) {
      res.status(400).json({ error: "Déjà inscrit à ce module" });

      return;
    }

    const invoiceId = api.buildCourseInvoiceId("MOCK");
    const chargePricing = api.resolveCourseChargeAmount(course.price, "");

    try {
      const result = await persistCoursePaymentEnrollment({
        userId: authUser.id,
        courseId,
        courseTitle: course.title,
        coursePrice: chargePricing.amount,
        invoiceId,
        provider: "MOCK",
        externalId: `mock-${authUser.id}-${courseId}`,
        auditAction: "ENROLL_MOCK",
        reqIp: req.ip,
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
