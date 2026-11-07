import { Queue, type JobsOptions } from "bullmq";
import type {
  EmailDeliveryResult,
  EmailJobPayload,
  EmailMessageStatus,
  EmailPriority,
  QueueStats,
} from "../../packages/shared-types/index";

export interface MessageTrackingRecord {
  messageId: string;
  status: EmailMessageStatus;
  priority: EmailPriority;
  recipient: string;
  queuedAt: Date;
  deliveredAt?: Date | null;
  lastAttemptAt?: Date;
  attemptCount: number;
  responseCode?: number;
  lastResponse?: string;
  lastError?: string;
}

export class QueueService {
  private criticalQueue: Queue | null = null;
  private transactionalQueue: Queue | null = null;
  private notificationQueue: Queue | null = null;
  private deadLetterQueue: Queue | null = null;

  // In-memory queues for tests or fallback
  private inMemoryCritical: EmailJobPayload[] = [];
  private inMemoryTransactional: EmailJobPayload[] = [];
  private inMemoryNotification: EmailJobPayload[] = [];
  private inMemoryDlq: EmailJobPayload[] = [];

  // Idempotency tracking (key -> messageId)
  private idempotencyStore = new Map<string, string>();

  // Message Tracking database / cache (messageId -> Record)
  private trackingStore = new Map<string, MessageTrackingRecord>();

  private useRedis: boolean = false;

  constructor(options?: { redisUrl?: string; forceInMemory?: boolean }) {
    const redisUrl = options?.redisUrl || process.env.REDIS_URL;
    const forceInMemory = options?.forceInMemory ?? (!redisUrl || process.env.NODE_ENV === "test");

    if (!forceInMemory && redisUrl) {
      try {
        const connection = { url: redisUrl };
        this.criticalQueue = new Queue("pam-critical-queue", { connection });
        this.transactionalQueue = new Queue("pam-transactional-queue", { connection });
        this.notificationQueue = new Queue("pam-notification-queue", { connection });
        this.deadLetterQueue = new Queue("pam-dead-letter-queue", { connection });
        this.useRedis = true;
      } catch (err) {
        console.warn("[PAM QueueService] Redis connection failed, falling back to in-memory queues:", err);
        this.useRedis = false;
      }
    }
  }

  /**
   * Enqueues an email job into the appropriate queue based on priority.
   * Handles idempotency keys to strictly avoid duplicate sends.
   */
  public async enqueueEmail(job: EmailJobPayload): Promise<MessageTrackingRecord> {
    // Idempotency check: if key already exists, return existing tracking record
    if (job.idempotencyKey) {
      const existingId = this.idempotencyStore.get(job.idempotencyKey);
      if (existingId && this.trackingStore.has(existingId)) {
        return this.trackingStore.get(existingId)!;
      }
      this.idempotencyStore.set(job.idempotencyKey, job.messageId);
    }

    const record: MessageTrackingRecord = {
      messageId: job.messageId,
      status: "QUEUED",
      priority: job.priority,
      recipient: job.to,
      queuedAt: job.queuedAt,
      attemptCount: job.attempt,
    };
    this.trackingStore.set(job.messageId, record);

    if (this.useRedis) {
      const targetQueue = this.getBullQueue(job.priority);
      if (targetQueue) {
        const opts: JobsOptions = {
          jobId: job.messageId,
          priority: job.priority === "critical" ? 1 : job.priority === "high" ? 2 : 5,
          attempts: job.maxRetries,
          backoff: {
            type: "exponential",
            delay: 2000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        };
        await targetQueue.add("send-email", job, opts);
        return record;
      }
    }

    // In-Memory routing
    if (job.priority === "critical") {
      this.inMemoryCritical.push(job);
    } else if (job.priority === "high" || job.priority === "normal") {
      this.inMemoryTransactional.push(job);
    } else {
      this.inMemoryNotification.push(job);
    }

    return record;
  }

  /**
   * Dequeues the next available job prioritizing Critical > Transactional > Notification.
   */
  public async dequeueNext(preferredPriority?: EmailPriority): Promise<EmailJobPayload | null> {
    if (preferredPriority === "critical") {
      return this.inMemoryCritical.shift() || null;
    }
    if (preferredPriority === "high" || preferredPriority === "normal") {
      return this.inMemoryTransactional.shift() || null;
    }
    if (preferredPriority === "low") {
      return this.inMemoryNotification.shift() || null;
    }

    // Default priority order
    return (
      this.inMemoryCritical.shift() ||
      this.inMemoryTransactional.shift() ||
      this.inMemoryNotification.shift() ||
      null
    );
  }

  /**
   * Re-enqueues a deferred job with exponential backoff delay.
   */
  public async reEnqueueWithDelay(job: EmailJobPayload, delayMs: number): Promise<void> {
    const existing = this.trackingStore.get(job.messageId);
    if (existing) {
      existing.status = "DEFERRED";
      existing.attemptCount = job.attempt;
      existing.lastAttemptAt = new Date();
    }

    setTimeout(() => {
      if (job.priority === "critical") {
        this.inMemoryCritical.unshift(job); // re-insert at top
      } else {
        this.inMemoryTransactional.push(job);
      }
    }, Math.min(delayMs, 10_000));
  }

  /**
   * Records successful message delivery.
   */
  public async recordJobCompletion(messageId: string, result: EmailDeliveryResult): Promise<void> {
    const record = this.trackingStore.get(messageId);
    if (record) {
      record.status = result.status;
      record.deliveredAt = result.deliveredAt;
      record.responseCode = result.responseCode;
      record.lastResponse = result.smtpResponse;
      record.lastError = result.status === "BOUNCED" ? result.smtpResponse : undefined;
      record.lastAttemptAt = new Date();
      record.attemptCount = result.attempt;
    }
  }

  /**
   * Records job failure or hard bounce.
   */
  public async recordJobFailure(messageId: string, result: EmailDeliveryResult, moveToDlq = false): Promise<void> {
    const record = this.trackingStore.get(messageId);
    if (record) {
      record.status = result.status;
      record.responseCode = result.responseCode;
      record.lastResponse = result.smtpResponse;
      record.lastError = result.smtpResponse;
      record.lastAttemptAt = new Date();
      record.attemptCount = result.attempt;
    }

    if (moveToDlq) {
      this.inMemoryDlq.push({
        messageId,
        from: "system",
        to: result.recipient,
        subject: "DLQ Message",
        priority: "low",
        attempt: result.attempt,
        maxRetries: 0,
        queuedAt: new Date(),
      });
    }
  }

  /**
   * Queries message status by messageId.
   */
  public async getMessageStatus(messageId: string): Promise<MessageTrackingRecord | null> {
    return this.trackingStore.get(messageId) || null;
  }

  /**
   * Returns current queue lengths and metrics across all priority tiers.
   */
  public async getAllQueueStats(): Promise<QueueStats> {
    return {
      critical: {
        waiting: this.inMemoryCritical.length,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
      },
      transactional: {
        waiting: this.inMemoryTransactional.length,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
      },
      notification: {
        waiting: this.inMemoryNotification.length,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
      },
      dlq: {
        waiting: this.inMemoryDlq.length,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
      },
    };
  }

  private getBullQueue(priority: EmailPriority): Queue | null {
    if (priority === "critical") return this.criticalQueue;
    if (priority === "high" || priority === "normal") return this.transactionalQueue;
    return this.notificationQueue;
  }

  public async close(): Promise<void> {
    await this.criticalQueue?.close();
    await this.transactionalQueue?.close();
    await this.notificationQueue?.close();
    await this.deadLetterQueue?.close();
    this.inMemoryCritical = [];
    this.inMemoryTransactional = [];
    this.inMemoryNotification = [];
    this.inMemoryDlq = [];
    this.idempotencyStore.clear();
    this.trackingStore.clear();
  }
}
