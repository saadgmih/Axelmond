import type { Request } from "express";
import {
  capturePayPalOrder,
  getPayPalOrder,
  getPayPalRuntimeEnv,
  isPayPalDonationCustomId,
  logPayPalError,
} from "./paypal-server";
import { processPayPalCaptureDonation } from "./paypal-charity-donation";
import { processPayPalCaptureEnrollment, type PayPalCaptureEnrollmentResult } from "./paypal-enrollment";
import { logSecurity } from "./security-logger";

const PAYPAL_WEBHOOK_VERIFY_TIMEOUT_MS = Number(process.env.PAYPAL_WEBHOOK_VERIFY_TIMEOUT_MS) || 15_000;

export type PayPalWebhookHeaders = {
  authAlgo: string;
  certUrl: string;
  transmissionId: string;
  transmissionSig: string;
  transmissionTime: string;
};

export function getPayPalWebhookId(env: NodeJS.ProcessEnv = process.env): string {
  return env.PAYPAL_WEBHOOK_ID?.trim() || "";
}

export function isPayPalWebhookConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  const clientId = env.PAYPAL_CLIENT_ID?.trim();
  const clientSecret = env.PAYPAL_CLIENT_SECRET?.trim();
  return Boolean(clientId && clientSecret) && Boolean(getPayPalWebhookId(env));
}

export function extractPayPalWebhookHeaders(headers: Request["headers"]): PayPalWebhookHeaders | null {
  const authAlgo = String(headers["paypal-auth-algo"] || "").trim();
  const certUrl = String(headers["paypal-cert-url"] || "").trim();
  const transmissionId = String(headers["paypal-transmission-id"] || "").trim();
  const transmissionSig = String(headers["paypal-transmission-sig"] || "").trim();
  const transmissionTime = String(headers["paypal-transmission-time"] || "").trim();

  if (!authAlgo || !certUrl || !transmissionId || !transmissionSig || !transmissionTime) {
    return null;
  }

  return { authAlgo, certUrl, transmissionId, transmissionSig, transmissionTime };
}

export async function verifyPayPalWebhookSignature(params: {
  headers: PayPalWebhookHeaders;
  webhookEvent: unknown;
  webhookId?: string;
  fetchImpl?: typeof fetch;
  getAccessToken?: () => Promise<string>;
}): Promise<boolean> {
  const webhookId = params.webhookId ?? getPayPalWebhookId();
  if (!webhookId) return false;

  const fetchImpl = params.fetchImpl ?? fetch;
  const getAccessToken =
    params.getAccessToken ??
    (async () => {
      const { getPayPalAccessTokenForWebhook } = await import("./paypal-server");
      return getPayPalAccessTokenForWebhook();
    });

  const accessToken = await getAccessToken();
  const baseUrl = getPayPalRuntimeEnv() === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

  const response = await fetchImpl(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      auth_algo: params.headers.authAlgo,
      cert_url: params.headers.certUrl,
      transmission_id: params.headers.transmissionId,
      transmission_sig: params.headers.transmissionSig,
      transmission_time: params.headers.transmissionTime,
      webhook_id: webhookId,
      webhook_event: params.webhookEvent,
    }),
    signal: AbortSignal.timeout(PAYPAL_WEBHOOK_VERIFY_TIMEOUT_MS),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    logPayPalError("PayPal webhook signature verification failed", {
      status: response.status,
      payload,
    });
    return false;
  }

  return payload?.verification_status === "SUCCESS";
}

export function parsePayPalWebhookEvent(rawBody: Buffer | string): any | null {
  try {
    const text = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
    if (!text.trim()) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

const HANDLED_EVENTS = new Set(["CHECKOUT.ORDER.APPROVED", "PAYMENT.CAPTURE.COMPLETED"]);

export function isHandledPayPalWebhookEvent(eventType: string): boolean {
  return HANDLED_EVENTS.has(eventType);
}

async function processWebhookCaptureResult(
  orderId: string,
  captureResult: any,
  deps: {
    reqIp?: string;
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
    }) => Promise<{ duplicate: boolean; user: any; invoice: any }>;
  },
  auditAction: string,
): Promise<PayPalCaptureEnrollmentResult | Awaited<ReturnType<typeof processPayPalCaptureDonation>>> {
  const customId = captureResult?.purchase_units?.[0]?.custom_id;
  if (isPayPalDonationCustomId(customId)) {
    return processPayPalCaptureDonation({
      orderId,
      captureResult,
      reqIp: deps.reqIp,
      auditAction,
    });
  }

  return processPayPalCaptureEnrollment(
    {
      orderId,
      captureResult,
      reqIp: deps.reqIp,
      auditAction,
    },
    deps.persistCoursePaymentEnrollment,
  );
}

export async function handlePayPalWebhookEvent(
  event: any,
  deps: {
    reqIp?: string;
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
    }) => Promise<{ duplicate: boolean; user: any; invoice: any }>;
    captureOrder?: (orderId: string) => Promise<any>;
    getOrder?: (orderId: string) => Promise<any>;
  },
): Promise<PayPalCaptureEnrollmentResult | { ok: true; ignored: true; eventType: string }> {
  const eventType = String(event?.event_type || "");
  if (!isHandledPayPalWebhookEvent(eventType)) {
    return { ok: true, ignored: true, eventType };
  }

  const captureOrder = deps.captureOrder ?? capturePayPalOrder;
  const getOrder = deps.getOrder ?? getPayPalOrder;

  if (eventType === "CHECKOUT.ORDER.APPROVED") {
    const orderId = String(event?.resource?.id || "").trim();
    if (!orderId) {
      return { ok: false, status: 400, error: "Webhook PayPal sans orderId", code: "PAYPAL_WEBHOOK_INVALID" };
    }

    const existingOrder = await getOrder(orderId);
    if (existingOrder?.status === "COMPLETED") {
      return processWebhookCaptureResult(
        orderId,
        existingOrder,
        deps,
        "PAYMENT_PAYPAL_WEBHOOK_ORDER_COMPLETED",
      );
    }

    const captureResult = await captureOrder(orderId);
    const result = await processWebhookCaptureResult(orderId, captureResult, deps, "PAYMENT_PAYPAL_WEBHOOK_CAPTURE");

    if (result.ok) {
      logSecurity("INFO", "PayPal webhook captured approved order", {
        orderId,
        duplicate: result.duplicate,
        ...( "donationId" in result
          ? { donationId: result.donationId, userId: result.userId }
          : { userId: result.userId, courseId: result.courseId, invoiceId: result.invoiceId }),
      });
    }

    return result;
  }

  const captureResource = event?.resource;
  const captureId = String(captureResource?.id || "").trim();
  const orderId = String(
    captureResource?.supplementary_data?.related_ids?.order_id ||
      captureResource?.links
        ?.find?.((link: any) => link?.rel === "up")
        ?.href?.split("/")
        .pop() ||
      "",
  ).trim();

  if (!orderId) {
    logPayPalError("PayPal capture webhook missing order id", { captureId, eventType });
    return { ok: false, status: 400, error: "Webhook PayPal incomplet", code: "PAYPAL_WEBHOOK_INVALID" };
  }

  const captureResult = await getOrder(orderId);
  const result = await processWebhookCaptureResult(
    orderId,
    captureResult,
    deps,
    "PAYMENT_PAYPAL_WEBHOOK_RECONCILE",
  );

  if (result.ok) {
    logSecurity("INFO", "PayPal webhook reconciled capture", {
      orderId,
      captureId,
      duplicate: result.duplicate,
      ...( "donationId" in result
        ? { donationId: result.donationId, userId: result.userId }
        : { userId: result.userId, courseId: result.courseId, invoiceId: result.invoiceId }),
    });
  }

  return result;
}
