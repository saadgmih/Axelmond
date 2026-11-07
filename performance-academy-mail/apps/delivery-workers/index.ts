import net from "node:net";
import nodemailer from "nodemailer";
import type {
  EmailDeliveryResult,
  EmailJobPayload,
  EmailMessageStatus,
  EmailPriority,
  MtaHostConfig,
} from "../../packages/shared-types/index";
import { QueueService } from "../../services/queue-service/index";
import { DeliveryController } from "../../services/delivery-controller/index";
import { SuppressionService } from "../../services/suppression-service/index";
import { BounceProcessor } from "../../services/bounce-processor/index";
import { TemplateEngine } from "../../services/template-engine/index";

export interface DeliveryWorkerOptions {
  queueService: QueueService;
  deliveryController?: DeliveryController;
  suppressionService?: SuppressionService;
  bounceProcessor?: BounceProcessor;
  templateEngine?: TemplateEngine;
  mtaConfig?: MtaHostConfig;
  concurrency?: number;
  workerName?: string;
}

export interface WorkerStats {
  workerName: string;
  uptimeSeconds: number;
  processedCount: number;
  deliveredCount: number;
  deferredCount: number;
  bouncedCount: number;
  suppressedCount: number;
  lastProcessedAt: Date | null;
}

export class DeliveryWorker {
  private queueService: QueueService;
  private deliveryController: DeliveryController;
  private suppressionService: SuppressionService;
  private bounceProcessor: BounceProcessor;
  private templateEngine: TemplateEngine;
  private mtaConfig: MtaHostConfig;
  private concurrency: number;
  private workerName: string;

  private isRunning: boolean = false;
  private startedAt: Date | null = null;
  private processedCount: number = 0;
  private deliveredCount: number = 0;
  private deferredCount: number = 0;
  private bouncedCount: number = 0;
  private suppressedCount: number = 0;
  private lastProcessedAt: Date | null = null;

  // Active BullMQ workers or fallback loop timers
  private activeLoops: Array<{ stop: () => void }> = [];
  private transporter: nodemailer.Transporter | null = null;

  constructor(options: DeliveryWorkerOptions) {
    this.queueService = options.queueService;
    this.deliveryController = options.deliveryController || new DeliveryController();
    this.suppressionService = options.suppressionService || new SuppressionService();
    this.bounceProcessor = options.bounceProcessor || new BounceProcessor(this.suppressionService);
    this.templateEngine = options.templateEngine || new TemplateEngine();
    this.concurrency = options.concurrency || 5;
    this.workerName = options.workerName || `pam-worker-${Math.random().toString(36).slice(2, 7)}`;

    this.mtaConfig = options.mtaConfig || {
      host: process.env.PAM_MTA_HOST || "127.0.0.1",
      port: Number(process.env.PAM_MTA_PORT || 25),
      secure: false,
      auth: process.env.PAM_MTA_USER ? {
        user: process.env.PAM_MTA_USER,
        pass: process.env.PAM_MTA_PASS || "",
      } : undefined,
      tls: {
        rejectUnauthorized: false,
      },
    };
  }

  public getStats(): WorkerStats {
    const uptime = this.startedAt ? Math.floor((Date.now() - this.startedAt.getTime()) / 1000) : 0;
    return {
      workerName: this.workerName,
      uptimeSeconds: uptime,
      processedCount: this.processedCount,
      deliveredCount: this.deliveredCount,
      deferredCount: this.deferredCount,
      bouncedCount: this.bouncedCount,
      suppressedCount: this.suppressedCount,
      lastProcessedAt: this.lastProcessedAt,
    };
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    this.startedAt = new Date();

    // Initialize SMTP Transporter to local MTA
    this.transporter = nodemailer.createTransport({
      host: this.mtaConfig.host,
      port: this.mtaConfig.port,
      secure: this.mtaConfig.secure,
      auth: this.mtaConfig.auth,
      tls: this.mtaConfig.tls,
      connectionTimeout: 10_000,
      greetingTimeout: 5_000,
      socketTimeout: 30_000,
    });

    // Start worker listeners for priority queues: Critical, Transactional, Notification
    const priorities: EmailPriority[] = ["critical", "high", "normal", "low"];

    for (let c = 0; c < this.concurrency; c++) {
      let active = true;
      let timeoutId: NodeJS.Timeout | null = null;
      const pollNext = async () => {
        if (!active || !this.isRunning) return;
        try {
          // Poll priority order: critical first, then high, normal, low
          let job: EmailJobPayload | null = null;
          for (const prio of priorities) {
            job = await this.queueService.dequeueNext(prio);
            if (job) break;
          }

          if (job) {
            await this.processJob(job);
          }
        } catch (err) {
          console.error(`[${this.workerName}] Worker loop error:`, err);
        }

        if (active && this.isRunning) {
          // Rapid polling when busy, slight rest when idle
          timeoutId = setTimeout(pollNext, 50);
          if (timeoutId.unref) timeoutId.unref();
        }
      };

      timeoutId = setTimeout(pollNext, c * 20);
      if (timeoutId.unref) timeoutId.unref();
      this.activeLoops.push({
        stop: () => {
          active = false;
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
        },
      });
    }
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    for (const loop of this.activeLoops) {
      loop.stop();
    }
    this.activeLoops = [];
    if (this.transporter) {
      try {
        this.transporter.close();
      } catch {}
      this.transporter = null;
    }
  }

  /**
   * Main processing pipeline for a single email job
   */
  public async processJob(job: EmailJobPayload): Promise<EmailDeliveryResult> {
    this.processedCount++;
    this.lastProcessedAt = new Date();

    const recipient = job.to;
    const recipientDomain = recipient.split("@")[1]?.toLowerCase() || "unknown";

    // 1. Suppression Check: Never send to bounced/complained addresses
    if (await this.suppressionService.isSuppressed(recipient)) {
      this.suppressedCount++;
      const result: EmailDeliveryResult = {
        messageId: job.messageId,
        recipient,
        domain: recipientDomain,
        status: "BOUNCED",
        responseCode: 550,
        smtpResponse: "550 5.1.1 Recipient is in suppression list",
        deliveredAt: null,
        durationMs: 0,
        attempt: job.attempt + 1,
        transient: false,
      };
      await this.queueService.recordJobCompletion(job.messageId, result);
      return result;
    }

    // 2. Delivery Controller: Check Domain Circuit Breaker & Rate Limiter
    const canSend = this.deliveryController.canSend(recipientDomain);
    if (!canSend) {
      this.deferredCount++;
      // Domain is backed off or circuit breaker is open: re-enqueue with delay
      const backoffMs = this.deliveryController.getBackoffDelay(recipientDomain);
      job.attempt += 1;
      await this.queueService.reEnqueueWithDelay(job, backoffMs);
      return {
        messageId: job.messageId,
        recipient,
        domain: recipientDomain,
        status: "DEFERRED",
        responseCode: 421,
        smtpResponse: `421 4.7.0 Rate limit or circuit open for domain ${recipientDomain}`,
        deliveredAt: null,
        durationMs: 0,
        attempt: job.attempt,
        transient: true,
      };
    }

    // 3. Template Resolution: Render HTML/text if template is requested
    let finalHtml = job.html || "";
    let finalText = job.text || "";

    if (job.template) {
      try {
        const rendered = this.templateEngine.render(job.template, job.variables || {});
        finalHtml = rendered.html;
        finalText = rendered.text;
      } catch (tmplErr: any) {
        console.error(`[${this.workerName}] Template render error:`, tmplErr);
        finalText = finalText || `[Notification Performance Académique] Code: ${job.variables?.code || ""}`;
      }
    }

    // 4. Transmission via SMTP (Local Postfix MTA or Mock Server)
    const startTime = Date.now();
    try {
      if (!this.transporter) {
        throw new Error("SMTP Transporter is not initialized");
      }

      const defaultFrom = process.env.PAM_DEFAULT_FROM || "Performance Académique <verification@perfacademy.ma>";
      const from = job.from || defaultFrom;

      const info = await this.transporter.sendMail({
        from,
        to: recipient,
        subject: job.subject,
        text: finalText,
        html: finalHtml || undefined,
        replyTo: job.replyTo || "verification@perfacademy.ma",
        headers: {
          "X-PAM-Message-ID": job.messageId,
          "X-Entity-Ref-ID": `${Date.now()}-${job.messageId}`,
          "Auto-Submitted": "auto-generated",
          "X-Auto-Response-Suppress": "All",
        },
      });

      const durationMs = Date.now() - startTime;
      this.deliveredCount++;
      this.deliveryController.recordSuccess(recipientDomain);

      const result: EmailDeliveryResult = {
        messageId: job.messageId,
        recipient,
        domain: recipientDomain,
        status: "DELIVERED",
        responseCode: 250,
        smtpResponse: info?.response || "250 2.0.0 OK Message queued for delivery",
        deliveredAt: new Date(),
        durationMs,
        attempt: job.attempt + 1,
        transient: false,
      };

      await this.queueService.recordJobCompletion(job.messageId, result);
      return result;
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      const smtpErr = this.bounceProcessor.parseSmtpError(err);

      if (smtpErr.isPermanent) {
        // Hard bounce / permanent rejection: suppress and do not retry
        this.bouncedCount++;
        this.deliveryController.recordError(recipientDomain);
        this.bounceProcessor.processBounce({
          messageId: job.messageId,
          recipient,
          recipientDomain,
          status: "BOUNCED",
          responseCode: smtpErr.code,
          smtpResponse: smtpErr.rawResponse,
          isPermanent: true,
          actionTaken: "SUPPRESSED",
          timestamp: new Date(),
        });

        const result: EmailDeliveryResult = {
          messageId: job.messageId,
          recipient,
          domain: recipientDomain,
          status: "BOUNCED",
          responseCode: smtpErr.code,
          smtpResponse: smtpErr.rawResponse,
          deliveredAt: null,
          durationMs,
          attempt: job.attempt + 1,
          transient: false,
        };

        await this.queueService.recordJobFailure(job.messageId, result, true);
        return result;
      } else {
        // Soft bounce / temporary deferral (4xx)
        this.deferredCount++;
        this.deliveryController.recordError(recipientDomain);

        const newAttempt = job.attempt + 1;
        const isMaxRetriesReached = newAttempt >= job.maxRetries;

        const result: EmailDeliveryResult = {
          messageId: job.messageId,
          recipient,
          domain: recipientDomain,
          status: isMaxRetriesReached ? "FAILED" : "DEFERRED",
          responseCode: smtpErr.code,
          smtpResponse: smtpErr.rawResponse,
          deliveredAt: null,
          durationMs,
          attempt: newAttempt,
          transient: !isMaxRetriesReached,
        };

        if (isMaxRetriesReached) {
          await this.queueService.recordJobFailure(job.messageId, result, true);
        } else {
          // Exponential backoff: 2^attempt * 2000ms
          const backoffDelay = Math.min(Math.pow(2, newAttempt) * 2000, 300_000);
          job.attempt = newAttempt;
          await this.queueService.reEnqueueWithDelay(job, backoffDelay);
        }

        return result;
      }
    }
  }
}
