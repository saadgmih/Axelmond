import express, { type Request, type Response, type NextFunction } from "express";
import { randomUUID } from "node:crypto";
import {
  sendEmailSchema,
  bulkEmailSchema,
  suppressionSchema,
} from "../../packages/validation/index";
import { verifyApiKey, hashApiKey } from "../../packages/security/index";
import type {
  EmailJobPayload,
  EmailPriority,
  SendEmailRequest,
  SendEmailResponse,
} from "../../packages/shared-types/index";
import { QueueService } from "../../services/queue-service/index";
import { SuppressionService } from "../../services/suppression-service/index";
import { DeliveryWorker } from "../delivery-workers/index";

export interface ApiGatewayOptions {
  queueService: QueueService;
  suppressionService: SuppressionService;
  worker?: DeliveryWorker;
  allowedApiKeys?: Set<string>; // Hashed API keys or plaintext for dev
}

export function createPamApiGateway(options: ApiGatewayOptions): express.Express {
  const app = express();
  app.use(express.json({ limit: "5mb" }));

  const queueService = options.queueService;
  const suppressionService = options.suppressionService;
  const worker = options.worker;

  // Set of authorized API keys (hashes)
  const masterKey = process.env.PAM_API_KEY || "pam_live_master_key_perf_academy_2026";
  const validKeyHashes = new Set<string>();
  validKeyHashes.add(hashApiKey(masterKey));

  if (options.allowedApiKeys) {
    for (const k of options.allowedApiKeys) {
      validKeyHashes.add(k.startsWith("pam_live_") ? hashApiKey(k) : k);
    }
  }

  // Rate Limiting Map (in-memory sliding window per API key)
  const clientCallTimestamps = new Map<string, number[]>();
  const RATE_LIMIT_MAX_PER_MINUTE = 1000;

  // ─── Middleware: API Key Authentication ──────────────────────────────────
  const requireApiKey = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    const customHeader = req.headers["x-pam-api-key"] as string | undefined;

    let providedKey = "";
    if (customHeader) {
      providedKey = customHeader.trim();
    } else if (authHeader && authHeader.startsWith("Bearer ")) {
      providedKey = authHeader.slice(7).trim();
    }

    if (!providedKey) {
      res.status(401).json({
        error: "Non autorisé: En-tête X-PAM-API-KEY ou Bearer manquant.",
        code: "UNAUTHORIZED",
      });
      return;
    }

    const isMatch = verifyApiKey(providedKey, validKeyHashes);
    if (!isMatch) {
      res.status(403).json({
        error: "Accès refusé: Clé API PAM invalide ou révoquée.",
        code: "FORBIDDEN",
      });
      return;
    }

    // Rate limiting check
    const now = Date.now();
    const timestamps = clientCallTimestamps.get(providedKey) || [];
    const validTimestamps = timestamps.filter((t) => now - t < 60_000);
    if (validTimestamps.length >= RATE_LIMIT_MAX_PER_MINUTE) {
      res.status(429).json({
        error: "Trop de requêtes vers l'API PAM. Limite de 1000 requêtes/minute atteinte.",
        code: "RATE_LIMIT_EXCEEDED",
      });
      return;
    }
    validTimestamps.push(now);
    clientCallTimestamps.set(providedKey, validTimestamps);

    next();
  };

  // ─── 1. Health Endpoint ──────────────────────────────────────────────────
  app.get("/api/v1/health", async (_req: Request, res: Response) => {
    const queueStats = await queueService.getAllQueueStats();
    const workerStats = worker ? worker.getStats() : null;

    res.status(200).json({
      status: "HEALTHY",
      service: "Performance Academy Mail (PAM)",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      mta: {
        targetHost: "mail.perfacademy.ma",
        localSubmissionPort: 25,
        status: "CONFIGURED",
        port25OutboundExternal: "PENDING_HETZNER_UNBLOCK",
      },
      queues: queueStats,
      worker: workerStats,
    });
  });

  // ─── 2. Metrics Endpoint (JSON / Prometheus format) ──────────────────────
  app.get("/api/v1/metrics", async (_req: Request, res: Response) => {
    const queueStats = await queueService.getAllQueueStats();
    const workerStats = worker ? worker.getStats() : null;

    res.status(200).json({
      timestamp: Date.now(),
      metrics: {
        pam_processed_total: workerStats?.processedCount || 0,
        pam_delivered_total: workerStats?.deliveredCount || 0,
        pam_deferred_total: workerStats?.deferredCount || 0,
        pam_bounced_total: workerStats?.bouncedCount || 0,
        pam_suppressed_total: workerStats?.suppressedCount || 0,
        pam_queue_critical_waiting: queueStats.critical.waiting,
        pam_queue_transactional_waiting: queueStats.transactional.waiting,
        pam_queue_notification_waiting: queueStats.notification.waiting,
        pam_queue_dlq_waiting: queueStats.dlq.waiting,
        pam_suppression_list_size: suppressionService.getAllSuppressed().length,
      },
    });
  });

  // ─── 3. Send Single Email (POST /api/v1/emails/send) ─────────────────────
  app.post("/api/v1/emails/send", requireApiKey, async (req: Request, res: Response): Promise<void> => {
    const parseResult = sendEmailSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: "Validation des données du message échouée.",
        code: "INVALID_REQUEST",
        details: parseResult.error.issues,
      });
      return;
    }

    const data = parseResult.data;
    const recipients = Array.isArray(data.to) ? data.to : [data.to];

    const responses: SendEmailResponse[] = [];

    for (const recipient of recipients) {
      const messageId = `pam_msg_${Date.now()}_${randomUUID().slice(0, 12)}`;
      const priority: EmailPriority = data.priority || "normal";

      const job: EmailJobPayload = {
        messageId,
        from: data.from,
        to: recipient,
        subject: data.subject,
        text: data.text,
        html: data.html,
        template: data.template,
        variables: data.variables,
        replyTo: data.replyTo,
        priority,
        attachments: data.attachments,
        idempotencyKey: data.idempotencyKey,
        attempt: 0,
        maxRetries: priority === "critical" ? 5 : 3,
        queuedAt: new Date(),
      };

      const enqueuedRecord = await queueService.enqueueEmail(job);

      responses.push({
        messageId: enqueuedRecord.messageId,
        status: enqueuedRecord.status,
        priority: enqueuedRecord.priority,
        recipient: enqueuedRecord.recipient,
        queuedAt: enqueuedRecord.queuedAt,
      });
    }

    res.status(202).json({
      success: true,
      data: responses.length === 1 ? responses[0] : responses,
    });
  });

  // ─── 4. Bulk Send (POST /api/v1/emails/bulk) ────────────────────────────
  app.post("/api/v1/emails/bulk", requireApiKey, async (req: Request, res: Response): Promise<void> => {
    const parseResult = bulkEmailSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: "Validation du lot d'e-mails échouée.",
        code: "INVALID_BULK_REQUEST",
        details: parseResult.error.issues,
      });
      return;
    }

    const data = parseResult.data;
    const batchId = `pam_batch_${Date.now()}_${randomUUID().slice(0, 8)}`;
    const results: Array<{ recipient: string; messageId: string }> = [];

    for (const recipient of data.recipients) {
      const messageId = `pam_msg_${Date.now()}_${randomUUID().slice(0, 12)}`;
      const job: EmailJobPayload = {
        messageId,
        from: data.from,
        to: recipient,
        subject: data.subject,
        text: data.text,
        html: data.html,
        template: data.template,
        variables: data.variables,
        priority: data.priority,
        attempt: 0,
        maxRetries: 3,
        queuedAt: new Date(),
      };

      await queueService.enqueueEmail(job);
      results.push({ recipient, messageId });
    }

    res.status(202).json({
      success: true,
      batchId,
      enqueuedCount: results.length,
      messages: results,
    });
  });

  // ─── 5. Query Message Status (GET /api/v1/emails/:id) ───────────────────
  app.get("/api/v1/emails/:id", requireApiKey, async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const status = await queueService.getMessageStatus(id);

    if (!status) {
      res.status(404).json({
        error: `Message ${id} introuvable dans l'historique PAM.`,
        code: "MESSAGE_NOT_FOUND",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: status,
    });
  });

  // ─── 6. Suppression List Management ─────────────────────────────────────
  app.get("/api/v1/suppressions/:email", requireApiKey, (req: Request, res: Response): void => {
    const { email } = req.params;
    const isSuppressed = suppressionService.isSuppressed(email);

    res.status(200).json({
      email,
      isSuppressed,
    });
  });

  app.post("/api/v1/suppressions", requireApiKey, (req: Request, res: Response): void => {
    const parseResult = suppressionSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: "Adresse e-mail invalide pour suppression.",
        code: "INVALID_SUPPRESSION_INPUT",
      });
      return;
    }

    suppressionService.addSuppression(parseResult.data.email, parseResult.data.reason);

    res.status(201).json({
      success: true,
      message: `Adresse ${parseResult.data.email} ajoutée à la liste de suppression (${parseResult.data.reason}).`,
    });
  });

  app.delete("/api/v1/suppressions/:email", requireApiKey, (req: Request, res: Response): void => {
    const { email } = req.params;
    suppressionService.removeSuppression(email);

    res.status(200).json({
      success: true,
      message: `Adresse ${email} retirée de la liste de suppression.`,
    });
  });

  return app;
}
