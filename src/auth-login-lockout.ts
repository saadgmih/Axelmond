import type { Response } from "express";
import { AUTH_LOCKOUT_WINDOW_MS, AUTH_MAX_ATTEMPTS } from "./server/route-schemas";

function resolveAuthMaxAttempts(): number {
  return Number(process.env.AUTH_MAX_ATTEMPTS) || AUTH_MAX_ATTEMPTS;
}

function resolveAuthLockoutWindowMs(): number {
  return Number(process.env.AUTH_LOCKOUT_WINDOW_MS) || AUTH_LOCKOUT_WINDOW_MS;
}

export function authLockoutWindowSeconds(): number {
  return Math.ceil(resolveAuthLockoutWindowMs() / 1000);
}

export interface LoginLockoutStatus {
  locked: boolean;
  retryAfter: number;
  maxAttempts: number;
  lockoutWindowSeconds: number;
}

type EmailLockoutRecord = {
  attempts: number;
  lockoutUntil: number | null;
};

const emailLockouts = new Map<string, EmailLockoutRecord>();

export function normalizeLoginEmail(email: string): string {
  return email.trim().toLowerCase();
}

function purgeExpiredRecord(key: string, record: EmailLockoutRecord, now: number): EmailLockoutRecord | null {
  if (record.lockoutUntil !== null && record.lockoutUntil <= now) {
    emailLockouts.delete(key);
    return null;
  }
  return record;
}

function retryAfterFromDbLockout(dbLockoutUntil: Date | null | undefined, now: number): number {
  if (!dbLockoutUntil || dbLockoutUntil.getTime() <= now) return 0;
  return Math.ceil((dbLockoutUntil.getTime() - now) / 1000);
}

export function getEmailLoginLockoutStatus(
  email: string,
  dbLockoutUntil?: Date | null,
): LoginLockoutStatus {
  const key = normalizeLoginEmail(email);
  const now = Date.now();
  let retryAfter = retryAfterFromDbLockout(dbLockoutUntil, now);

  let record = emailLockouts.get(key);
  if (record) {
    const active = purgeExpiredRecord(key, record, now);
    record = active ?? undefined;
  }

  if (record?.lockoutUntil && record.lockoutUntil > now) {
    retryAfter = Math.max(retryAfter, Math.ceil((record.lockoutUntil - now) / 1000));
  }

  return {
    locked: retryAfter > 0,
    retryAfter,
    maxAttempts: resolveAuthMaxAttempts(),
    lockoutWindowSeconds: authLockoutWindowSeconds(),
  };
}

export function recordEmailLoginFailure(
  email: string,
  dbLockoutUntil?: Date | null,
): LoginLockoutStatus {
  const key = normalizeLoginEmail(email);
  const now = Date.now();
  const current = getEmailLoginLockoutStatus(email, dbLockoutUntil);
  if (current.locked) return current;

  let record = emailLockouts.get(key);
  if (record) {
    const active = purgeExpiredRecord(key, record, now);
    record = active ?? { attempts: 0, lockoutUntil: null };
  } else {
    record = { attempts: 0, lockoutUntil: null };
  }

  record.attempts += 1;
  if (record.attempts >= resolveAuthMaxAttempts()) {
    record.lockoutUntil = now + resolveAuthLockoutWindowMs();
  }

  emailLockouts.set(key, record);
  return getEmailLoginLockoutStatus(email, dbLockoutUntil);
}

export function clearEmailLoginLockout(email: string): void {
  emailLockouts.delete(normalizeLoginEmail(email));
}

export function sendLoginLockoutResponse(res: Response, status: LoginLockoutStatus): void {
  res.setHeader("Retry-After", String(Math.max(1, status.retryAfter)));
  res.status(429).json({
    error: "Compte temporairement verrouillé pour cause de tentatives excessives. Veuillez réessayer plus tard.",
    isRateLimit: true,
    retryAfter: status.retryAfter,
    maxAttempts: status.maxAttempts,
    lockoutWindowSeconds: status.lockoutWindowSeconds,
    code: "AUTH_RATE_LIMIT_EXCEEDED",
  });
}

/** @internal Test helper */
export function resetEmailLoginLockoutsForTests(): void {
  emailLockouts.clear();
}
