import crypto from "node:crypto";

/** SHA-256 hash for refresh tokens stored at rest (never store raw tokens in DB). */
export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

/** SHA-256 hash for CSRF tokens bound to refresh sessions (mobile native clients). */
export function hashCsrfToken(token: string): string {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

export const JSON_BODY_LIMIT = "256kb";

export const REFRESH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const REFRESH_RATE_LIMIT_MAX = 30;

/** Bcrypt cost factor — 12 is the project default (override via BCRYPT_ROUNDS). */
export function getBcryptRounds(env: NodeJS.ProcessEnv = process.env): number {
  const parsed = Number(env.BCRYPT_ROUNDS);
  if (Number.isInteger(parsed) && parsed >= 10 && parsed <= 15) return parsed;
  return 12;
}

/** Mock enrollment is never allowed in production and requires an explicit dev flag. */
export function isMockEnrollmentAllowed(env: NodeJS.ProcessEnv = process.env): boolean {
  if (String(env.NODE_ENV || "").toLowerCase() === "production") return false;
  return env.ALLOW_MOCK_ENROLLMENT === "true";
}

const PRODUCTION_DATABASE_SSL_PATTERN = /sslmode=(require|verify-full|verify-ca)/i;

export function isProductionDatabaseUrlSecure(databaseUrl: string): boolean {
  return PRODUCTION_DATABASE_SSL_PATTERN.test(databaseUrl);
}

export function getAuthMaxAttempts(env: NodeJS.ProcessEnv = process.env): number {
  const parsed = Number(env.AUTH_MAX_ATTEMPTS);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 20;
}

export function getAuthLockoutWindowMs(env: NodeJS.ProcessEnv = process.env): number {
  const parsed = Number(env.AUTH_LOCKOUT_WINDOW_MS);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 60_000;
}
