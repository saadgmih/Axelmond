import { randomUUID } from "node:crypto";
import type {
  EmailPriority,
  SendEmailRequest,
  SendEmailResponse,
} from "../performance-academy-mail/packages/shared-types/index";

export interface PamSendOptions {
  from?: string;
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  template?: string;
  variables?: Record<string, any>;
  priority?: EmailPriority;
  replyTo?: string;
  idempotencyKey?: string;
}

export interface PamClientConfig {
  enabled: boolean;
  gatewayUrl: string;
  apiKey: string;
  timeoutMs: number;
}

export function getPamConfig(env: NodeJS.ProcessEnv = process.env): PamClientConfig {
  const isExplicitlyEnabled = String(env.USE_PAM || env.PAM_ENABLED || "").trim().toLowerCase() === "true";
  return {
    enabled: isExplicitlyEnabled,
    gatewayUrl: env.PAM_GATEWAY_URL || "http://127.0.0.1:4000",
    apiKey: env.PAM_API_KEY || "pam_live_master_key_perf_academy_2026",
    timeoutMs: Number(env.PAM_TIMEOUT_MS || 5000),
  };
}

export function isPamEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return getPamConfig(env).enabled;
}

/**
 * Sends an email through Performance Academy Mail (PAM) Gateway.
 * Returns the queued message ID or throws an error.
 */
export async function sendViaPam(
  options: PamSendOptions,
  config = getPamConfig()
): Promise<SendEmailResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  const payload: SendEmailRequest = {
    from: options.from || "Performance Académique <verification@perfacademy.ma>",
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
    template: options.template,
    variables: options.variables,
    priority: options.priority || "normal",
    replyTo: options.replyTo || "verification@perfacademy.ma",
    idempotencyKey: options.idempotencyKey || `pam_idem_${Date.now()}_${randomUUID().slice(0, 8)}`,
  };

  try {
    const res = await fetch(`${config.gatewayUrl.replace(/\/+$/, "")}/api/v1/emails/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-PAM-API-KEY": config.apiKey,
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      let errorMsg = `PAM Gateway responded with HTTP ${res.status}`;
      try {
        const errJson = await res.json();
        if (errJson?.error) errorMsg = errJson.error;
      } catch {}
      throw new Error(errorMsg);
    }

    const data: any = await res.json();
    return data?.data as SendEmailResponse;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Checks PAM Gateway health status.
 */
export async function checkPamHealth(config = getPamConfig()): Promise<{
  ok: boolean;
  status: string;
  details?: any;
  error?: string;
}> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);

  try {
    const res = await fetch(`${config.gatewayUrl.replace(/\/+$/, "")}/api/v1/health`, {
      method: "GET",
      signal: controller.signal,
    });

    if (!res.ok) {
      return { ok: false, status: `HTTP_${res.status}` };
    }

    const data = await res.json();
    return { ok: true, status: "HEALTHY", details: data };
  } catch (err: any) {
    return { ok: false, status: "UNREACHABLE", error: err.message };
  } finally {
    clearTimeout(timeout);
  }
}
