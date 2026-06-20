import assert from "node:assert/strict";
import fs from "node:fs";
import { readServerBootstrapSources } from "./helpers/api-route-sources.ts";
import { buildPayPalCustomId, formatPayPalAmount } from "../src/paypal-server.ts";
import {
  extractPayPalCaptureContext,
  processPayPalCaptureEnrollment,
  toPayPalCaptureClientResponse,
} from "../src/paypal-enrollment.ts";
import {
  extractPayPalWebhookHeaders,
  getPayPalWebhookId,
  handlePayPalWebhookEvent,
  isHandledPayPalWebhookEvent,
  isPayPalWebhookConfigured,
  parsePayPalWebhookEvent,
  verifyPayPalWebhookSignature,
} from "../src/paypal-webhook.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("paypal-webhook", async () => {
  const bootstrapSource = readServerBootstrapSources();
  const serverSource = bootstrapSource + fs.readFileSync("src/routes/payments-routes.ts", "utf8");
  const paypalServerSource = fs.readFileSync("src/paypal-server.ts", "utf8");
  const paypalWebhookSource = fs.readFileSync("src/paypal-webhook.ts", "utf8");

  assert.match(serverSource, /app\.post\(\s*"\s*\/api\/paypal\/webhook"/);
  assert.match(serverSource, /express\.raw\(\{\s*type:\s*"application\/json"/);
  assert.match(bootstrapSource, /paypalWebhookRateLimiter/);
  assert.match(bootstrapSource, /registerPayPalWebhook\(app,\s*routeCtx,\s*paypalWebhookRateLimiter\)/);
  assert.match(serverSource, /PAYPAL_WEBHOOK_RATE_LIMIT_EXCEEDED/);
  assert.match(serverSource, /verifyPayPalWebhookSignature/);
  assert.match(serverSource, /handlePayPalWebhookEvent/);
  assert.match(serverSource, /processPayPalCaptureEnrollment/);
  assert.match(paypalServerSource, /export async function getPayPalOrder/);
  assert.match(paypalServerSource, /export async function getPayPalAccessTokenForWebhook/);
  assert.match(paypalServerSource, /signal:\s*getPayPalRequestSignal\(\)/);
  assert.match(paypalWebhookSource, /signal:\s*AbortSignal\.timeout/);

  const jsonIndex = bootstrapSource.indexOf("app.use(express.json({ limit: JSON_BODY_LIMIT }));");
  const webhookIndex = bootstrapSource.indexOf("registerPayPalWebhook(app, routeCtx, paypalWebhookRateLimiter)");
  assert.ok(
    webhookIndex > 0 && jsonIndex > 0 && webhookIndex < jsonIndex,
    "webhook route must be registered before express.json()",
  );

  assert.equal(getPayPalWebhookId({ PAYPAL_WEBHOOK_ID: " wh-123 " } as NodeJS.ProcessEnv), "wh-123");
  assert.equal(
    isPayPalWebhookConfigured({
      PAYPAL_CLIENT_ID: "cid",
      PAYPAL_CLIENT_SECRET: "sec",
      PAYPAL_WEBHOOK_ID: "wh-123",
    } as NodeJS.ProcessEnv),
    true,
  );
  assert.equal(
    isPayPalWebhookConfigured({
      PAYPAL_CLIENT_ID: "cid",
      PAYPAL_CLIENT_SECRET: "sec",
    } as NodeJS.ProcessEnv),
    false,
  );

  const validHeaders = extractPayPalWebhookHeaders({
    "paypal-auth-algo": "SHA256withRSA",
    "paypal-cert-url": "https://api.sandbox.paypal.com/cert",
    "paypal-transmission-id": "tx-1",
    "paypal-transmission-sig": "sig-1",
    "paypal-transmission-time": "2026-06-07T12:00:00Z",
  });
  assert.ok(validHeaders);
  assert.equal(extractPayPalWebhookHeaders({}), null);

  const eventBody = Buffer.from(JSON.stringify({ event_type: "PAYMENT.CAPTURE.COMPLETED", id: "evt-1" }));
  assert.deepEqual(parsePayPalWebhookEvent(eventBody), { event_type: "PAYMENT.CAPTURE.COMPLETED", id: "evt-1" });
  assert.equal(parsePayPalWebhookEvent(Buffer.from("")), null);

  assert.equal(isHandledPayPalWebhookEvent("CHECKOUT.ORDER.APPROVED"), true);
  assert.equal(isHandledPayPalWebhookEvent("PAYMENT.CAPTURE.COMPLETED"), true);
  assert.equal(isHandledPayPalWebhookEvent("BILLING.SUBSCRIPTION.CREATED"), false);

  let verifyPayload: Record<string, unknown> | null = null;
  let verifySignal: AbortSignal | null = null;
  const verified = await verifyPayPalWebhookSignature({
    headers: validHeaders!,
    webhookEvent: { event_type: "TEST" },
    webhookId: "wh-test",
    getAccessToken: async () => "token-test",
    fetchImpl: async (_url, init) => {
      verifyPayload = JSON.parse(String(init?.body));
      verifySignal = init?.signal ?? null;
      return {
        ok: true,
        json: async () => ({ verification_status: "SUCCESS" }),
      } as Response;
    },
  });
  assert.equal(verified, true);
  assert.equal(verifyPayload?.webhook_id, "wh-test");
  assert.equal(verifyPayload?.auth_algo, "SHA256withRSA");
  assert.ok(verifySignal instanceof AbortSignal);

  const rejected = await verifyPayPalWebhookSignature({
    headers: validHeaders!,
    webhookEvent: { event_type: "TEST" },
    webhookId: "wh-test",
    getAccessToken: async () => "token-test",
    fetchImpl: async () =>
      ({
        ok: true,
        json: async () => ({ verification_status: "FAILURE" }),
      }) as Response,
  });
  assert.equal(rejected, false);

  function buildCompletedCaptureOrder(userId: string, courseId: number, amountMad: number) {
    const payPalAmount = Math.round(amountMad * 0.1 * 100) / 100;
    const customId = buildPayPalCustomId(userId, courseId, payPalAmount, amountMad, "USD");
    return {
      status: "COMPLETED",
      purchase_units: [
        {
          custom_id: customId,
          payments: {
            captures: [
              {
                id: "CAPTURE12345678",
                status: "COMPLETED",
                amount: { value: formatPayPalAmount(payPalAmount), currency_code: "USD" },
              },
            ],
          },
        },
      ],
    };
  }

  const captureContext = extractPayPalCaptureContext(buildCompletedCaptureOrder("user-1", 7, 499));
  assert.ok(captureContext.metadata);
  assert.equal(captureContext.capture?.status, "COMPLETED");

  const persistCalls: Array<Record<string, unknown>> = [];
  const mockPersist = async (input: {
    userId: string;
    courseId: number;
    courseTitle: string;
    coursePrice: number;
    invoiceId: string;
    auditAction: string;
  }) => {
    persistCalls.push(input);
    return {
      duplicate: persistCalls.length > 1,
      user: { id: input.userId },
      invoice: { id: input.invoiceId },
    };
  };

  const ignored = await handlePayPalWebhookEvent(
    { event_type: "CUSTOMER.DISPUTE.CREATED" },
    { persistCoursePaymentEnrollment: mockPersist },
  );
  assert.deepEqual(ignored, { ok: true, ignored: true, eventType: "CUSTOMER.DISPUTE.CREATED" });

  const missingOrder = await handlePayPalWebhookEvent(
    { event_type: "CHECKOUT.ORDER.APPROVED", resource: {} },
    { persistCoursePaymentEnrollment: mockPersist },
  );
  assert.equal(missingOrder.ok, false);
  if (!missingOrder.ok) {
    assert.equal(missingOrder.code, "PAYPAL_WEBHOOK_INVALID");
  }

  const missingCaptureOrder = await handlePayPalWebhookEvent(
    { event_type: "PAYMENT.CAPTURE.COMPLETED", resource: { id: "CAP-ONLY" } },
    { persistCoursePaymentEnrollment: mockPersist },
  );
  assert.equal(missingCaptureOrder.ok, false);
  if (!missingCaptureOrder.ok) {
    assert.equal(missingCaptureOrder.code, "PAYPAL_WEBHOOK_INVALID");
  }

  const enrollmentResult = await processPayPalCaptureEnrollment(
    {
      orderId: "ORDER-CLIENT-1",
      captureResult: buildCompletedCaptureOrder("user-client", 999999999, 128),
      auditAction: "PAYMENT_PAYPAL_SUCCESS",
      expectedUserId: "user-client",
      expectedCourseId: 999999999,
    },
    mockPersist,
  );
  assert.equal(enrollmentResult.ok, false);
  if (!enrollmentResult.ok) {
    assert.equal(enrollmentResult.code, "COURSE_NOT_FOUND");
    assert.deepEqual(toPayPalCaptureClientResponse(enrollmentResult), {
      error: "Module non trouvé",
      code: "COURSE_NOT_FOUND",
    });
    assert.deepEqual(
      toPayPalCaptureClientResponse({
        ok: false,
        status: 500,
        error: "PayPal SDK: internal failure at https://api.paypal.com/v1/...",
        code: "UNKNOWN_SDK",
      }),
      { error: "Paiement PayPal invalide", code: "UNKNOWN_SDK" },
    );
  }
});
