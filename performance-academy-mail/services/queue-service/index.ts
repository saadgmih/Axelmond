/**
 * Performance Academy Mail (PAM) - Queue Service
 * BullMQ-backed distributed queue engine with graceful in-memory test fallback.
 */

import { Queue, type JobsOptions } from "bullmq";
import type { EmailPriority, SendEmailRequest } from "../../packages/shared-types";

export interface EnqueuedJobData {
  id: string;
  appId: string;
  request: SendEmailRequest;
  attempts: number;
  enqueuedAt: string;
}

export interface QueueJobStatus {
  id: string;
  status: "waiting" | "active" | "completed" | "failed" | "delayed";
  data: EnqueuedJobData;
  failedReason?: string;
}

const REDIS_HOST = process.env.REDIS_HOST || "127.0.0.1";
const REDIS_PORT = Number(process.env.REDIS_PORT || 6379);

const redisConnection = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  maxRetriesPerRequest: null,
};

export class QueueService {
  private static criticalQueue: Queue | null = null;
  private static transactionalQueue: Queue | null = null;
  private static notificationQueue: Queue | null = null;
  private static deadLetterQueue: Queue | null = null;

  // In-memory fallback queue for offline / test environments
  private static inMemoryQueue: EnqueuedJobData[] = [];
  private static inMemoryDlq: EnqueuedJobData[] = [];
  private static isMockMode: boolean = process.env.NODE_ENV === "test" || process.env.PAM_USE_MEMORY_QUEUE === "true";

  public static setMockMode(enabled: boolean): void {
    this.isMockMode = enabled;
  }

  private static getQueueForPriority(priority: EmailPriority = "normal"): Queue | null {
    if (this.isMockMode) return null;

    try {
      if (priority === "critical") {
        if (!this.criticalQueue) {
          this.criticalQueue = new Queue("pam-critical-queue", { connection: redisConnection });
        }
        return this.criticalQueue;
      }

      if (priority === "high") {
        if (!this.transactionalQueue) {
          this.transactionalQueue = new Queue("pam-transactional-queue", { connection: redisConnection });
        }
        return this.transactionalQueue;
      }

      if (!this.notificationQueue) {
        this.notificationQueue = new Queue("pam-notification-queue", { connection: redisConnection });
      }
      return this.notificationQueue;
    } catch {
      return null;
    }
  }

  public static async enqueue(jobData: EnqueuedJobData): Promise<string> {
    const priority = jobData.request.priority || "normal";

    if (this.isMockMode) {
      if (priority === "critical" || priority === "high") {
        this.inMemoryQueue.unshift(jobData);
      } else {
        this.inMemoryQueue.push(jobData);
      }
      return jobData.id;
    }

    const queue = this.getQueueForPriority(priority);
    if (!queue) {
      this.inMemoryQueue.push(jobData);
      return jobData.id;
    }

    const jobOptions: JobsOptions = {
      jobId: jobData.id,
      priority: priority === "critical" ? 1 : priority === "high" ? 2 : 5,
      attempts: 4,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    };

    await queue.add("send-email", jobData, jobOptions);
    return jobData.id;
  }

  public static async moveToDeadLetter(jobData: EnqueuedJobData, reason: string): Promise<void> {
    if (this.isMockMode || !this.deadLetterQueue) {
      this.inMemoryDlq.push({ ...jobData, request: { ...jobData.request, metadata: { ...jobData.request.metadata, dlqReason: reason } } });
      return;
    }

    try {
      if (!this.deadLetterQueue) {
        this.deadLetterQueue = new Queue("pam-dead-letter-queue", { connection: redisConnection });
      }
      await this.deadLetterQueue.add("dead-letter-email", { ...jobData, dlqReason: reason });
    } catch {
      this.inMemoryDlq.push(jobData);
    }
  }

  public static getNextInMemoryJob(): EnqueuedJobData | null {
    return this.inMemoryQueue.shift() || null;
  }

  public static getInMemoryQueueLength(): number {
    return this.inMemoryQueue.length;
  }

  public static getInMemoryDlqLength(): number {
    return this.inMemoryDlq.length;
  }

  public static clear(): void {
    this.inMemoryQueue = [];
    this.inMemoryDlq = [];
  }

  public static async close(): Promise<void> {
    await this.criticalQueue?.close();
    await this.transactionalQueue?.close();
    await this.notificationQueue?.close();
    await this.deadLetterQueue?.close();
    this.criticalQueue = null;
    this.transactionalQueue = null;
    this.notificationQueue = null;
    this.deadLetterQueue = null;
    this.clear();
  }
}
