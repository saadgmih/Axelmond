const UNSAFE_CLIENT_ERROR_PATTERNS = [
  /https?:\/\//i,
  /\bat\s+\S+\(/,
  /:\d+:\d+/,
  /ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN/i,
  /\b(prisma|paypal|openai|livekit|postgres|sql|stack trace|LIVEKIT_)\b/i,
];

export function sanitizeClientErrorMessage(message: unknown, fallback: string, status?: number): string {
  if (status !== undefined && status >= 500) return fallback;
  if (typeof message !== "string") return fallback;
  const trimmed = message.trim();
  if (!trimmed || trimmed.length > 280) return fallback;
  if (UNSAFE_CLIENT_ERROR_PATTERNS.some((pattern) => pattern.test(trimmed))) return fallback;
  return trimmed;
}

export function isMfaSetupRequiredError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const record = err as Record<string, unknown>;
  return record.code === "MFA_SETUP_REQUIRED" || record.mfaSetupRequired === true;
}

export function getClientErrorMessage(err: unknown, fallback: string): string {
  if (isMfaSetupRequiredError(err)) return "";
  if (!err || typeof err !== "object") return fallback;
  const record = err as Record<string, unknown>;
  const status = typeof record.status === "number" ? record.status : undefined;
  const message =
    typeof record.message === "string" ? record.message : typeof record.error === "string" ? record.error : fallback;
  return sanitizeClientErrorMessage(message, fallback, status);
}
