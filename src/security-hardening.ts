import crypto from "node:crypto";

/** SHA-256 hash for refresh tokens stored at rest (never store raw tokens in DB). */
export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(String(token).trim()).digest("hex");
}

export const JSON_BODY_LIMIT = "256kb";

export const CHAT_TUTOR_MAX_PROMPT_CHARS = 4000;
export const CHAT_TUTOR_MAX_HISTORY_MESSAGES = 20;

export const REFRESH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const REFRESH_RATE_LIMIT_MAX = 30;
