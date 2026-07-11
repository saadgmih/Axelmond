const UNSAFE_CLIENT_ERROR_PATTERNS = [
  /https?:\/\//i,
  /\bat\s+\S+\(/,
  /:\d+:\d+/,
  /ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN/i,
  /\b(prisma|paypal|openai|livekit|postgres|sql|stack trace|LIVEKIT_)\b/i,
];

export function sanitizeClientErrorMessage(message: unknown, fallback: string, status?: number): string {
  if (typeof message !== "string") {
    return status !== undefined && status >= 500 ? fallback : fallback;
  }
  const trimmed = message.trim();
  if (!trimmed || trimmed.length > 500) return fallback;
  if (status !== undefined && status >= 500) return fallback;
  if (UNSAFE_CLIENT_ERROR_PATTERNS.some((pattern) => pattern.test(trimmed))) return fallback;
  return trimmed;
}

export function isMfaSetupRequiredError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const record = err as Record<string, unknown>;
  return record.code === "MFA_SETUP_REQUIRED" || record.mfaSetupRequired === true;
}

export function isTransientCatalogError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const record = err as Record<string, unknown>;
  const status = typeof record.status === "number" ? record.status : undefined;
  if (status === 0 || status === 502 || status === 503 || status === 504 || status === 429) return true;
  return record.code === "CATALOG_TIMEOUT";
}

export function getClientErrorMessage(err: unknown, fallback: string): string {
  if (isMfaSetupRequiredError(err)) return "";
  if (!err || typeof err !== "object") return fallback;
  const record = err as Record<string, unknown>;
  const status = typeof record.status === "number" ? record.status : undefined;

  if (record.code === "VALIDATION_ERROR" && Array.isArray(record.details)) {
    const detailMessages = record.details.map((d: any) => d.message).filter(Boolean);
    if (detailMessages.length > 0) {
      return sanitizeClientErrorMessage(detailMessages.join(" • "), fallback, status);
    }
  }

  const message =
    typeof record.message === "string" ? record.message : typeof record.error === "string" ? record.error : fallback;
  return sanitizeClientErrorMessage(message, fallback, status);
}
