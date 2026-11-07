/**
 * Performance Academy Mail (PAM) - Shared Types
 */

export type EmailPriority = 'critical' | 'high' | 'normal' | 'low';

export type EmailMessageStatus =
  | 'ACCEPTED'      // Accepted by PAM API Gateway
  | 'QUEUED'        // Persisted in BullMQ queue
  | 'PROCESSING'    // Picked up by worker
  | 'DELIVERING'    // SMTP connection in progress
  | 'DELIVERED'     // Accepted by recipient MTA (250 OK)
  | 'DEFERRED'      // Temporary failure (4xx), queued for retry
  | 'BOUNCED'       // Permanent failure (5xx hard bounce)
  | 'REJECTED'      // Policy/spam rejection
  | 'SUPPRESSED'    // Blocked before sending (on suppression list)
  | 'FAILED';       // Exhausted max attempts / dead-letter

export type BounceType = 'HARD' | 'SOFT' | 'POLICY' | 'SPAM_COMPLAINT' | 'UNKNOWN';

export interface EmailAttachment {
  filename: string;
  content: string; // Base64 encoded
  contentType: string;
}

export interface SendEmailRequest {
  from?: string;
  to: string | string[];
  replyTo?: string;
  subject: string;
  text?: string;
  html?: string;
  template?: string;
  variables?: Record<string, any>;
  priority?: EmailPriority;
  attachments?: EmailAttachment[];
  idempotencyKey?: string;
  metadata?: Record<string, any>;
}

export interface SendEmailResponse {
  success: boolean;
  messageId: string;
  status: EmailMessageStatus;
  enqueuedAt: string;
  priority: EmailPriority;
  recipientsCount: number;
}

export interface EmailEvent {
  id: string;
  messageId: string;
  type: EmailMessageStatus;
  timestamp: string;
  code?: number;
  response?: string;
  details?: Record<string, any>;
}

export interface EmailMessageRecord {
  id: string;
  appId: string;
  from: string;
  to: string[];
  replyTo?: string;
  subject: string;
  status: EmailMessageStatus;
  priority: EmailPriority;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  enqueuedAt: Date;
  processedAt?: Date;
  deliveredAt?: Date;
  metadata?: Record<string, any>;
}

export interface SuppressionRecord {
  email: string;
  reason: BounceType;
  details?: string;
  createdAt: Date;
}

export interface MtaHostConfig {
  id: string;
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  heloHostname: string;
  maxConnections: number;
  isFallback?: boolean;
}

export interface DomainDeliveryPolicy {
  domain: string;
  maxConcurrentConnections: number;
  rateLimitPerMinute: number;
  backoffDelayMs: number;
}
