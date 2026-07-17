import type { Express, Request, Response } from "express";
import type { CenterPaymentMethod, CenterPaymentStatus } from "@prisma/client";
import type { RouteContext } from "../server/route-context";
import { getAuthUser } from "../server/route-types";
import { getCenterPaymentConfig } from "../center-payment-config";
import {
  addCenterPaymentAdminNote,
  adminCancelCenterPaymentRequest,
  cancelStudentCenterPaymentRequest,
  CenterPaymentError,
  createCenterPaymentRequest,
  getAdminCenterPaymentRequest,
  getStudentCenterPaymentRequest,
  listAdminCenterPaymentRequests,
  listStudentCenterPaymentRequests,
  refundCenterPaymentRequest,
  rejectCenterPaymentRequest,
  reviewCenterPaymentRequest,
  validateCenterPaymentRequest,
} from "../center-payments";
import {
  CENTER_PAYMENT_METHODS,
  CENTER_PAYMENT_STATUSES,
  isCenterPaymentReference,
  isValidCenterPaymentIdempotencyKey,
  normalizeCenterPaymentNote,
} from "../center-payment-domain";

function handleCenterPaymentError(error: unknown, res: Response) {
  if (error instanceof CenterPaymentError) {
    res.status(error.statusCode).json({ error: error.message, code: error.code });
    return;
  }
  console.error("[center-payment] request failed", error);
  res.status(500).json({ error: "Traitement du paiement au centre impossible" });
}

function readReference(req: Request) {
  const reference = String(req.params.reference || "")
    .trim()
    .toUpperCase();
  if (!isCenterPaymentReference(reference)) {
    throw new CenterPaymentError("INVALID_REFERENCE", 400, "Référence de paiement invalide");
  }
  return reference;
}

function requireStudent(req: Request) {
  const authUser = getAuthUser(req);
  if (authUser.role !== "STUDENT") {
    throw new CenterPaymentError("STUDENT_ACCESS_REQUIRED", 403, "Accès réservé aux étudiants");
  }
  return authUser;
}

export function registerCenterPaymentRoutes(app: Express, ctx: RouteContext): void {
  const { requireAuth, requireAdmin } = ctx.middleware;

  app.get("/api/center-payment/config", requireAuth, (req, res) => {
    try {
      requireStudent(req);
      res.json(getCenterPaymentConfig());
    } catch (error) {
      handleCenterPaymentError(error, res);
    }
  });

  app.post("/api/courses/:courseId/center-payment-requests", requireAuth, async (req, res) => {
    try {
      const authUser = requireStudent(req);
      const courseId = Number(req.params.courseId);
      if (!Number.isInteger(courseId) || courseId <= 0) {
        throw new CenterPaymentError("INVALID_COURSE_ID", 400, "Module invalide");
      }
      const result = await createCenterPaymentRequest({
        userId: authUser.id,
        courseId,
        includeAiAssistant: req.body?.includeAiAssistant === true,
        promoCode: String(req.body?.promoCode || "").trim(),
        studentNote: req.body?.studentNote,
      });
      await ctx.deps
        .logAudit(
          authUser.id,
          authUser.email,
          result.duplicate ? "CENTER_PAYMENT_REQUEST_REUSED" : "CENTER_PAYMENT_REQUEST_CREATED",
          "CenterPaymentRequest",
          result.request.reference,
          { courseId },
          req.ip,
        )
        .catch(() => undefined);
      res.status(result.duplicate ? 200 : 201).json(result);
    } catch (error) {
      handleCenterPaymentError(error, res);
    }
  });

  app.get("/api/me/center-payment-requests", requireAuth, async (req, res) => {
    try {
      const authUser = requireStudent(req);
      res.json(await listStudentCenterPaymentRequests(authUser.id));
    } catch (error) {
      handleCenterPaymentError(error, res);
    }
  });

  app.get("/api/me/center-payment-requests/:reference", requireAuth, async (req, res) => {
    try {
      const authUser = requireStudent(req);
      res.json(await getStudentCenterPaymentRequest(authUser.id, readReference(req)));
    } catch (error) {
      handleCenterPaymentError(error, res);
    }
  });

  app.post("/api/me/center-payment-requests/:reference/cancel", requireAuth, async (req, res) => {
    try {
      const authUser = requireStudent(req);
      const reference = readReference(req);
      const result = await cancelStudentCenterPaymentRequest(authUser.id, reference);
      await ctx.deps
        .logAudit(
          authUser.id,
          authUser.email,
          "CENTER_PAYMENT_REQUEST_CANCELLED_BY_STUDENT",
          "CenterPaymentRequest",
          reference,
          {},
          req.ip,
        )
        .catch(() => undefined);
      res.json(result);
    } catch (error) {
      handleCenterPaymentError(error, res);
    }
  });

  app.get("/api/admin/center-payment-requests", requireAuth, requireAdmin, async (req, res) => {
    try {
      const requestedStatus = String(req.query.status || "").trim() as CenterPaymentStatus;
      const status = CENTER_PAYMENT_STATUSES.includes(requestedStatus) ? requestedStatus : undefined;
      const courseId = Number(req.query.courseId);
      const amount = Number(req.query.amount);
      const from = req.query.from ? new Date(String(req.query.from)) : undefined;
      const to = req.query.to ? new Date(String(req.query.to)) : undefined;
      const result = await listAdminCenterPaymentRequests({
        status,
        query: String(req.query.q || ""),
        courseId: Number.isInteger(courseId) && courseId > 0 ? courseId : undefined,
        amount: Number.isFinite(amount) && amount >= 0 ? amount : undefined,
        validatedByUserId: String(req.query.validatedBy || "").trim() || undefined,
        from: from && !Number.isNaN(from.getTime()) ? from : undefined,
        to: to && !Number.isNaN(to.getTime()) ? to : undefined,
      });
      res.json(result);
    } catch (error) {
      handleCenterPaymentError(error, res);
    }
  });

  app.get("/api/admin/center-payment-requests/:reference", requireAuth, requireAdmin, async (req, res) => {
    try {
      res.json(await getAdminCenterPaymentRequest(readReference(req)));
    } catch (error) {
      handleCenterPaymentError(error, res);
    }
  });

  app.post("/api/admin/center-payment-requests/:reference/review", requireAuth, requireAdmin, async (req, res) => {
    try {
      const admin = getAuthUser(req);
      const reference = readReference(req);
      const result = await reviewCenterPaymentRequest(admin.id, reference, req.body?.internalNote);
      await auditAdminAction(ctx, req, admin, "CENTER_PAYMENT_REVIEW_STARTED", reference);
      res.json(result);
    } catch (error) {
      handleCenterPaymentError(error, res);
    }
  });

  app.post("/api/admin/center-payment-requests/:reference/validate", requireAuth, requireAdmin, async (req, res) => {
    try {
      const admin = getAuthUser(req);
      const reference = readReference(req);
      const receivedAmount = Number(req.body?.receivedAmount);
      const paymentMethod = String(req.body?.paymentMethod || "") as CenterPaymentMethod;
      const idempotencyKey = String(req.body?.idempotencyKey || req.header("Idempotency-Key") || "").trim();
      if (!Number.isFinite(receivedAmount) || receivedAmount <= 0) {
        throw new CenterPaymentError("INVALID_RECEIVED_AMOUNT", 400, "Montant reçu invalide");
      }
      if (!CENTER_PAYMENT_METHODS.includes(paymentMethod)) {
        throw new CenterPaymentError("INVALID_PAYMENT_METHOD", 400, "Moyen de paiement invalide");
      }
      if (!isValidCenterPaymentIdempotencyKey(idempotencyKey)) {
        throw new CenterPaymentError("INVALID_IDEMPOTENCY_KEY", 400, "Clé d'idempotence invalide");
      }
      const result = await validateCenterPaymentRequest({
        adminId: admin.id,
        reference,
        receivedAmount,
        paymentMethod,
        physicalReceiptReference: req.body?.physicalReceiptReference,
        internalNote: req.body?.internalNote,
        idempotencyKey,
      });
      const studentId = (result.request as any).student?.id;
      if (studentId) ctx.deps.invalidateAuthUserCache(studentId);
      await auditAdminAction(ctx, req, admin, "CENTER_PAYMENT_VALIDATED", reference, {
        paymentMethod,
        receivedAmount,
        idempotent: result.idempotent,
      });
      res.json(result);
    } catch (error) {
      handleCenterPaymentError(error, res);
    }
  });

  app.post("/api/admin/center-payment-requests/:reference/reject", requireAuth, requireAdmin, async (req, res) => {
    try {
      const admin = getAuthUser(req);
      const reference = readReference(req);
      const publicReason = normalizeCenterPaymentNote(req.body?.publicReason, 500);
      if (!publicReason) throw new CenterPaymentError("PUBLIC_REASON_REQUIRED", 400, "Motif public requis");
      const result = await rejectCenterPaymentRequest(admin.id, reference, publicReason, req.body?.internalNote);
      await auditAdminAction(ctx, req, admin, "CENTER_PAYMENT_REJECTED", reference);
      res.json(result);
    } catch (error) {
      handleCenterPaymentError(error, res);
    }
  });

  app.post("/api/admin/center-payment-requests/:reference/cancel", requireAuth, requireAdmin, async (req, res) => {
    try {
      const admin = getAuthUser(req);
      const reference = readReference(req);
      const publicReason = normalizeCenterPaymentNote(req.body?.publicReason, 500) || "Demande annulée par le centre";
      const result = await adminCancelCenterPaymentRequest(admin.id, reference, publicReason, req.body?.internalNote);
      await auditAdminAction(ctx, req, admin, "CENTER_PAYMENT_CANCELLED_BY_ADMIN", reference);
      res.json(result);
    } catch (error) {
      handleCenterPaymentError(error, res);
    }
  });

  app.post("/api/admin/center-payment-requests/:reference/refund", requireAuth, requireAdmin, async (req, res) => {
    try {
      const admin = getAuthUser(req);
      const reference = readReference(req);
      const publicReason = normalizeCenterPaymentNote(req.body?.publicReason, 500);
      if (!publicReason) throw new CenterPaymentError("PUBLIC_REASON_REQUIRED", 400, "Motif du remboursement requis");
      const result = await refundCenterPaymentRequest(admin.id, reference, publicReason, req.body?.internalNote);
      const studentId = (result as any).student?.id;
      if (studentId) ctx.deps.invalidateAuthUserCache(studentId);
      await auditAdminAction(ctx, req, admin, "CENTER_PAYMENT_REFUNDED", reference);
      res.json(result);
    } catch (error) {
      handleCenterPaymentError(error, res);
    }
  });

  app.post("/api/admin/center-payment-requests/:reference/note", requireAuth, requireAdmin, async (req, res) => {
    try {
      const admin = getAuthUser(req);
      const reference = readReference(req);
      const result = await addCenterPaymentAdminNote(admin.id, reference, String(req.body?.note || ""));
      await auditAdminAction(ctx, req, admin, "CENTER_PAYMENT_NOTE_ADDED", reference);
      res.json(result);
    } catch (error) {
      handleCenterPaymentError(error, res);
    }
  });
}

async function auditAdminAction(
  ctx: RouteContext,
  req: Request,
  admin: ReturnType<typeof getAuthUser>,
  action: string,
  reference: string,
  details: Record<string, unknown> = {},
) {
  await ctx.deps
    .logAudit(admin.id, admin.email, action, "CenterPaymentRequest", reference, details, req.ip)
    .catch(() => undefined);
}
