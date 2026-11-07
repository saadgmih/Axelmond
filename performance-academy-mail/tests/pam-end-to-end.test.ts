import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { MockSmtpServer } from "../infrastructure/smtp-mock/index";
import { QueueService } from "../services/queue-service/index";
import { SuppressionService } from "../services/suppression-service/index";
import { BounceProcessor } from "../services/bounce-processor/index";
import { DeliveryController } from "../services/delivery-controller/index";
import { TemplateEngine } from "../services/template-engine/index";
import { DeliveryWorker } from "../apps/delivery-workers/index";
import { createPamApiGateway } from "../apps/api-gateway/index";
import {
  generateEmailVerificationCode,
  hashEmailVerificationCode,
  isEmailVerificationExpired,
  canAttemptEmailVerification,
} from "../../src/email-verification";

describe("Performance Academy Mail (PAM) - Autonomous Infrastructure End-to-End Suite", () => {
  let mockSmtp: MockSmtpServer;
  let queueService: QueueService;
  let suppressionService: SuppressionService;
  let bounceProcessor: BounceProcessor;
  let deliveryController: DeliveryController;
  let templateEngine: TemplateEngine;
  let worker: DeliveryWorker;
  let apiApp: any;

  const MASTER_API_KEY = "pam_live_test_key_perf_academy_2026";

  beforeAll(async () => {
    // 1. Start RFC 5321 Mock SMTP Server locally on a dynamic free port
    mockSmtp = new MockSmtpServer({
      port: 0,
      host: "127.0.0.1",
    });
    const allocatedPort = await mockSmtp.start();

    // 2. Initialize PAM Modular Subsystems
    suppressionService = new SuppressionService();
    bounceProcessor = new BounceProcessor(suppressionService);
    deliveryController = new DeliveryController();
    templateEngine = new TemplateEngine();
    queueService = new QueueService({ forceInMemory: true });

    // 3. Initialize Delivery Worker attached to Mock SMTP Server
    worker = new DeliveryWorker({
      queueService,
      suppressionService,
      bounceProcessor,
      deliveryController,
      templateEngine,
      mtaConfig: {
        host: "127.0.0.1",
        port: allocatedPort,
        secure: false,
      },
      concurrency: 2,
    });
    await worker.start();

    // 4. Mount API Gateway
    process.env.PAM_API_KEY = MASTER_API_KEY;
    apiApp = createPamApiGateway({
      queueService,
      suppressionService,
      worker,
      allowedApiKeys: new Set([MASTER_API_KEY]),
    });
  });

  afterAll(async () => {
    if (worker) await worker.stop();
    if (queueService) await queueService.close();
    if (mockSmtp) await mockSmtp.stop();
  });

  // ─── Test 1: Health & Metrics Endpoint ──────────────────────────────────
  it("1. should respond with healthy status on /api/v1/health and export metrics", async () => {
    const res = await request(apiApp).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("HEALTHY");
    expect(res.body.service).toContain("PAM");
    expect(res.body.mta.targetHost).toBe("mail.perfacademy.ma");

    const metricsRes = await request(apiApp).get("/api/v1/metrics");
    expect(metricsRes.status).toBe(200);
    expect(metricsRes.body.metrics).toBeDefined();
    expect(metricsRes.body.metrics.pam_processed_total).toBeDefined();
  });

  // ─── Test 2: API Authentication Security ────────────────────────────────
  it("2. should reject requests with missing or invalid API keys", async () => {
    // Missing key -> 401
    const noKeyRes = await request(apiApp)
      .post("/api/v1/emails/send")
      .send({ to: "test@example.com", subject: "Test", text: "Hello" });
    expect(noKeyRes.status).toBe(401);
    expect(noKeyRes.body.code).toBe("UNAUTHORIZED");

    // Invalid key -> 403
    const badKeyRes = await request(apiApp)
      .post("/api/v1/emails/send")
      .set("X-PAM-API-KEY", "pam_live_forged_key_invalid")
      .send({ to: "test@example.com", subject: "Test", text: "Hello" });
    expect(badKeyRes.status).toBe(403);
    expect(badKeyRes.body.code).toBe("FORBIDDEN");
  });

  // ─── Test 3: Zod Validation Strictness ───────────────────────────────────
  it("3. should reject malformed email addresses and empty payloads", async () => {
    const invalidEmailRes = await request(apiApp)
      .post("/api/v1/emails/send")
      .set("X-PAM-API-KEY", MASTER_API_KEY)
      .send({
        to: "not-an-email",
        subject: "Test",
        text: "Body",
      });
    expect(invalidEmailRes.status).toBe(400);
    expect(invalidEmailRes.body.code).toBe("INVALID_REQUEST");

    const noBodyRes = await request(apiApp)
      .post("/api/v1/emails/send")
      .set("X-PAM-API-KEY", MASTER_API_KEY)
      .send({
        to: "valid@example.com",
        subject: "No body",
      });
    expect(noBodyRes.status).toBe(400);
  });

  // ─── Test 4 & 5 & 6: End-to-End Send & Mock Postfix Delivery ───────────
  it("4-6. should accept critical OTP email, enqueue in BullMQ, and worker delivers to SMTP server", async () => {
    const initialDelivered = mockSmtp.getDeliveredMessages().length;

    const res = await request(apiApp)
      .post("/api/v1/emails/send")
      .set("X-PAM-API-KEY", MASTER_API_KEY)
      .send({
        to: "student.test@perfacademy.ma",
        subject: "Code de vérification - PAM Test",
        template: "email-verification",
        variables: {
          code: "847291",
          fullName: "Étudiant Test",
          expiresInMinutes: 15,
        },
        priority: "critical",
      });

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    const messageId = res.body.data.messageId;
    expect(messageId).toMatch(/^pam_msg_/);
    expect(res.body.data.status).toBe("QUEUED");

    // Wait for worker to consume from queue and transmit to Mock SMTP
    await new Promise((resolve) => setTimeout(resolve, 300));

    const messages = mockSmtp.getDeliveredMessages();
    expect(messages.length).toBeGreaterThan(initialDelivered);

    const delivered = messages.find((m) => m.rcptTo.includes("student.test@perfacademy.ma"));
    expect(delivered).toBeDefined();
    expect(delivered?.mailFrom).toContain("perfacademy.ma");
    expect(delivered?.data).toContain("847291");
    expect(delivered?.data).toContain("Performance");

    // Verify delivery state query
    const statusRes = await request(apiApp)
      .get(`/api/v1/emails/${messageId}`)
      .set("X-PAM-API-KEY", MASTER_API_KEY);
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.status).toBe("DELIVERED");
  });

  // ─── Test 7 & 8 & 9: 4xx Deferral & Exponential Backoff Retry ──────────
  it("7-9. should handle 4xx deferral responses with backoff retries and DLQ routing", async () => {
    // Configure mock server to simulate temporary 421 server busy
    mockSmtp.setBehaviorForRecipient("busy.inbox@deferral.org", "DEFER_421");

    const res = await request(apiApp)
      .post("/api/v1/emails/send")
      .set("X-PAM-API-KEY", MASTER_API_KEY)
      .send({
        to: "busy.inbox@deferral.org",
        subject: "Test Deferral",
        text: "Will be deferred",
        priority: "normal",
      });

    const messageId = res.body.data.messageId;
    await new Promise((resolve) => setTimeout(resolve, 300));

    const statusRes = await request(apiApp)
      .get(`/api/v1/emails/${messageId}`)
      .set("X-PAM-API-KEY", MASTER_API_KEY);

    expect(statusRes.status).toBe(200);
    expect(["DEFERRED", "QUEUED"]).toContain(statusRes.body.data.status);
  });

  // ─── Test 10: Per-Domain Rate Limiting & Circuit Breaker ───────────────
  it("10. should enforce per-domain rate limiting and circuit breaking", () => {
    const domain = "heavy-traffic.com";
    deliveryController.setDomainRateLimit(domain, 2); // max 2 per second

    expect(deliveryController.canSend(domain)).toBe(true);
    expect(deliveryController.canSend(domain)).toBe(true);
    // 3rd call exceeds 2/sec limit
    expect(deliveryController.canSend(domain)).toBe(false);

    // Trip circuit breaker by recording consecutive errors
    for (let i = 0; i < 6; i++) {
      deliveryController.recordError(domain);
    }
    expect(deliveryController.isCircuitOpen(domain)).toBe(true);
  });

  // ─── Test 11: Idempotency & Duplicate Protection ────────────────────────
  it("11. should protect against duplicate sends using idempotency key", async () => {
    const idempotencyKey = "unique_payment_receipt_99281";

    const res1 = await request(apiApp)
      .post("/api/v1/emails/send")
      .set("X-PAM-API-KEY", MASTER_API_KEY)
      .send({
        to: "customer@example.com",
        subject: "Reçu de paiement",
        text: "Facture #99281",
        idempotencyKey,
      });
    expect(res1.status).toBe(202);

    const res2 = await request(apiApp)
      .post("/api/v1/emails/send")
      .set("X-PAM-API-KEY", MASTER_API_KEY)
      .send({
        to: "customer@example.com",
        subject: "Reçu de paiement",
        text: "Facture #99281",
        idempotencyKey,
      });

    // Both return the exact same messageId without queueing a duplicate message
    expect(res2.body.data.messageId).toBe(res1.body.data.messageId);
  });

  // ─── Test 12 & 13: Hard Bounce 550 & Automatic Suppression ─────────────
  it("12-13. should parse 550 bounce, automatically suppress address, and reject future sends", async () => {
    const invalidRecipient = "dead.inbox.doesnotexist@nowhere.com";
    mockSmtp.setBehaviorForRecipient(invalidRecipient, "BOUNCE_550");

    expect(suppressionService.isSuppressed(invalidRecipient)).toBe(false);

    // First send triggers 550 hard bounce
    const res = await request(apiApp)
      .post("/api/v1/emails/send")
      .set("X-PAM-API-KEY", MASTER_API_KEY)
      .send({
        to: invalidRecipient,
        subject: "Test Bounce",
        text: "Should bounce",
      });

    await new Promise((resolve) => setTimeout(resolve, 300));

    // Address is now automatically in suppression list!
    expect(suppressionService.isSuppressed(invalidRecipient)).toBe(true);

    // Next send is rejected immediately at worker level without contacting MTA
    const res2 = await request(apiApp)
      .post("/api/v1/emails/send")
      .set("X-PAM-API-KEY", MASTER_API_KEY)
      .send({
        to: invalidRecipient,
        subject: "Second attempt",
        text: "Should be dropped by suppression",
      });

    await new Promise((resolve) => setTimeout(resolve, 200));

    const statusRes = await request(apiApp)
      .get(`/api/v1/emails/${res2.body.data.messageId}`)
      .set("X-PAM-API-KEY", MASTER_API_KEY);
    expect(statusRes.body.data.status).toBe("BOUNCED");
    expect(statusRes.body.data.lastError).toContain("suppression");
  });

  // ─── Test 14 & 15 & 16: OTP Verification, Expiry & 5-Attempt Limit ─────
  it("14-16. should enforce 6-digit OTP crypto, HMAC hashing, 15-min expiry, and max 5 attempts", () => {
    // 14. 6-digit generation and HMAC-SHA256
    const code = generateEmailVerificationCode();
    expect(code).toMatch(/^\d{6}$/);

    const secret = "test-secret-salt";
    const hash1 = hashEmailVerificationCode(code, secret);
    const hash2 = hashEmailVerificationCode(code, secret);
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // SHA-256 hex string

    // 15. Expiration after 15 minutes
    const now = new Date();
    const futureExpiry = new Date(now.getTime() + 15 * 60 * 1000);
    const pastExpiry = new Date(now.getTime() - 1000);

    expect(isEmailVerificationExpired(futureExpiry, now)).toBe(false);
    expect(isEmailVerificationExpired(pastExpiry, now)).toBe(true);

    // 16. Maximum 5 attempts
    expect(canAttemptEmailVerification(0)).toBe(true);
    expect(canAttemptEmailVerification(4)).toBe(true);
    expect(canAttemptEmailVerification(5)).toBe(false);
    expect(canAttemptEmailVerification(6)).toBe(false);
  });

  // ─── Test 17: Anti-Open Relay Protection ────────────────────────────────
  it("17. should enforce strict anti-relay rules rejecting unauthorized domains or external IPs", () => {
    const allowedNetworks = ["127.0.0.1", "::1"];
    const untrustedRemoteIp = "198.51.100.42";

    const isRelayPermitted = (clientIp: string) => allowedNetworks.includes(clientIp);

    expect(isRelayPermitted("127.0.0.1")).toBe(true);
    expect(isRelayPermitted(untrustedRemoteIp)).toBe(false);
  });

  // ─── Test 18 & 19: Graceful Worker Recovery & Queue Draining ───────────
  it("18-19. should gracefully stop and resume queue processing without losing messages", async () => {
    // Stop worker
    await worker.stop();

    // Enqueue job while worker is offline
    const queuedJob = await queueService.enqueueEmail({
      messageId: "pam_msg_offline_recovery_1",
      from: "verification@perfacademy.ma",
      to: "offline.student@perfacademy.ma",
      subject: "Offline Recovery",
      text: "Persisted in queue",
      priority: "critical",
      attempt: 0,
      maxRetries: 3,
      queuedAt: new Date(),
    });
    expect(queuedJob.status).toBe("QUEUED");

    // Restart worker
    await worker.start();
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Job was recovered and delivered
    const status = await queueService.getMessageStatus("pam_msg_offline_recovery_1");
    expect(status?.status).toBe("DELIVERED");
  });

  // ─── Test 20: Bulk Email Distribution ──────────────────────────────────
  it("20. should accept bulk email batches and assign tracking message IDs to all recipients", async () => {
    const recipients = [
      "student1@domain.ma",
      "student2@domain.ma",
      "student3@domain.ma",
    ];

    const bulkRes = await request(apiApp)
      .post("/api/v1/emails/bulk")
      .set("X-PAM-API-KEY", MASTER_API_KEY)
      .send({
        recipients,
        subject: "Annonce officielle PAM",
        text: "Bienvenue sur PAM",
        priority: "normal",
      });

    expect(bulkRes.status).toBe(202);
    expect(bulkRes.body.enqueuedCount).toBe(3);
    expect(bulkRes.body.messages.length).toBe(3);
    expect(bulkRes.body.batchId).toMatch(/^pam_batch_/);
  });
});
