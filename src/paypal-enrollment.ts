import { prisma } from "./db";
import { formatPayPalAmount, logPayPalError, parsePayPalCustomId } from "./paypal-server";
import { convertMadAmountForPayPal, getPayPalCheckoutCurrency } from "./paypal-currency";
import { computeCourseCheckoutTotalMad, resolveEnrollmentHasAiAccess } from "./utils/ai-tutor-pricing";
import { PUBLIC_API_ERRORS } from "./public-api-errors";
import { ActiveEnrollmentExistsError } from "./module-subscription";
export type PayPalCaptureEnrollmentInput = {
  orderId: string;
  captureResult: any;
  reqIp?: string;
  auditAction: string;
  expectedUserId?: string;
  expectedCourseId?: number;
};

export type PayPalCaptureEnrollmentResult =
  | {
      ok: true;
      duplicate: boolean;
      userId: string;
      courseId: number;
      invoiceId: string;
      invoice: any;
      user: any;
    }
  | {
      ok: false;
      status: number;
      error: string;
      code?: string;
    };

type FindPayPalCourseById = (courseId: number) => Promise<{ title: string; price: number } | null>;

export function extractPayPalCaptureContext(captureResult: any) {
  const purchaseUnit = captureResult?.purchase_units?.[0];
  const metadata = parsePayPalCustomId(purchaseUnit?.custom_id);
  const capture = purchaseUnit?.payments?.captures?.[0];
  return { purchaseUnit, metadata, capture };
}

export const PAYPAL_CAPTURE_CLIENT_MESSAGES: Record<string, string> = {
  PAYPAL_METADATA_MISSING: "Commande PayPal invalide",
  PAYPAL_USER_MISMATCH: "Commande PayPal invalide pour ce compte",
  PAYPAL_COURSE_MISMATCH: "Commande PayPal invalide pour ce module",
  COURSE_NOT_FOUND: "Module non trouvé",
  PAYPAL_CAPTURE_INCOMPLETE: "Paiement PayPal non finalisé",
  PAYPAL_AMOUNT_MISMATCH: "Montant de paiement incorrect",
  USER_NOT_FOUND: "Paiement PayPal invalide",
  ALREADY_ENROLLED: "Ce module est déjà actif. Aucun nouveau paiement n'est nécessaire.",
};

export function toPayPalCaptureClientResponse(result: { ok: false; status: number; error: string; code?: string }) {
  const code = result.code || "PAYPAL_CAPTURE_FAILED";
  return {
    error: PAYPAL_CAPTURE_CLIENT_MESSAGES[code] || "Paiement PayPal invalide",
    code,
  };
}

export async function processPayPalCaptureEnrollment(
  params: PayPalCaptureEnrollmentInput,
  persistCoursePaymentEnrollment: (input: {
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
  }) => Promise<{ duplicate: boolean; user: any; invoice: any }>,
  findCourseById: FindPayPalCourseById = (courseId) => prisma.course.findUnique({ where: { id: courseId } }),
): Promise<PayPalCaptureEnrollmentResult> {
  const { orderId, captureResult, reqIp, auditAction, expectedUserId, expectedCourseId } = params;
  const { metadata, capture } = extractPayPalCaptureContext(captureResult);

  if (!metadata) {
    logPayPalError("PayPal capture missing metadata", { orderId, auditAction });
    return { ok: false, status: 400, error: "Commande PayPal invalide", code: "PAYPAL_METADATA_MISSING" };
  }

  if (expectedUserId && metadata.userId !== expectedUserId) {
    logPayPalError("PayPal capture user mismatch", { orderId, expectedUserId, metadata });
    return { ok: false, status: 400, error: "Commande PayPal invalide pour ce compte", code: "PAYPAL_USER_MISMATCH" };
  }

  if (expectedCourseId != null && metadata.courseId !== expectedCourseId) {
    logPayPalError("PayPal capture course mismatch", { orderId, expectedCourseId, metadata });
    return { ok: false, status: 400, error: "Commande PayPal invalide pour ce module", code: "PAYPAL_COURSE_MISMATCH" };
  }

  const course = await findCourseById(metadata.courseId);
  if (!course) {
    return { ok: false, status: 404, error: "Module non trouvé", code: "COURSE_NOT_FOUND" };
  }

  if (captureResult?.status !== "COMPLETED" || capture?.status !== "COMPLETED") {
    logPayPalError("PayPal capture incomplete", {
      orderId,
      orderStatus: captureResult?.status,
      captureStatus: capture?.status,
      auditAction,
    });
    return { ok: false, status: 400, error: "Paiement PayPal non finalisé", code: "PAYPAL_CAPTURE_INCOMPLETE" };
  }

  const paidAmount = String(capture?.amount?.value || "");
  const paidCurrency = String(capture?.amount?.currency_code || "").toUpperCase();
  const expectedCurrency = (metadata.payPalCurrency || getPayPalCheckoutCurrency()).toUpperCase();
  const expectedAmount = metadata.expectedAmount ?? formatPayPalAmount(convertMadAmountForPayPal(course.price));

  if (paidCurrency !== expectedCurrency || paidAmount !== expectedAmount) {
    logPayPalError("PayPal capture amount mismatch", {
      orderId,
      courseId: metadata.courseId,
      expectedAmount,
      paidAmount,
      paidCurrency,
      auditAction,
    });
    return { ok: false, status: 400, error: "Montant de paiement incorrect", code: "PAYPAL_AMOUNT_MISMATCH" };
  }

  const captureId = String(capture?.id || orderId);
  const invoiceId = `INV-PAYPAL-${captureId.slice(-8).toUpperCase()}`;
  const coursePricePaid = metadata.amountMad
    ? Number.parseFloat(metadata.amountMad)
    : Number.parseFloat(expectedAmount);
  const promoUsage = metadata.promoReservationReference
    ? await prisma.promoCodeUsage.findUnique({ where: { publicReference: metadata.promoReservationReference } })
    : await prisma.promoCodeUsage.findUnique({ where: { externalReference: orderId } });
  if (metadata.promoReservationReference && !promoUsage) {
    return {
      ok: false,
      status: 409,
      error: "Réservation promotionnelle introuvable",
      code: "PROMO_RESERVATION_NOT_FOUND",
    };
  }
  if (promoUsage) {
    const expectedMad = computeCourseCheckoutTotalMad({
      modulePriceMad: Number(promoUsage.finalPriceSnapshot),
      includeAiAssistant: Boolean(metadata.includeAiAssistant),
      isFreeModule: Number(promoUsage.finalPriceSnapshot) <= 0,
    });
    if (!metadata.amountMad || Math.abs(Number(metadata.amountMad) - expectedMad) > 0.001) {
      logPayPalError("PayPal promo reservation amount mismatch", { orderId, courseId: metadata.courseId });
      return { ok: false, status: 400, error: "Montant de paiement incorrect", code: "PAYPAL_AMOUNT_MISMATCH" };
    }
  }

  try {
    const enrollmentResult = await persistCoursePaymentEnrollment({
      userId: metadata.userId,
      courseId: metadata.courseId,
      courseTitle: course.title,
      coursePrice: Number.isFinite(coursePricePaid) ? coursePricePaid : course.price,
      invoiceId,
      provider: "PAYPAL",
      externalId: captureId,
      auditAction,
      reqIp,
      hasAiAccess: resolveEnrollmentHasAiAccess(Boolean(metadata.includeAiAssistant)),
      promoUsageId: promoUsage?.id,
    });

    return {
      ok: true,
      duplicate: enrollmentResult.duplicate,
      userId: metadata.userId,
      courseId: metadata.courseId,
      invoiceId,
      invoice: enrollmentResult.invoice,
      user: enrollmentResult.user,
    };
  } catch (err: any) {
    if (err instanceof ActiveEnrollmentExistsError || err?.message === "ACTIVE_ENROLLMENT_EXISTS") {
      return {
        ok: false,
        status: 409,
        error: "Ce module est déjà actif",
        code: "ALREADY_ENROLLED",
      };
    }
    if (err?.message === "USER_NOT_FOUND") {
      return { ok: false, status: 404, error: PUBLIC_API_ERRORS.accountNotFound, code: "USER_NOT_FOUND" };
    }
    throw err;
  }
}
