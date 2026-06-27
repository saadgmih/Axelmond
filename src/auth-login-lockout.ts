import type { Response } from "express";
import {
  getLoginLockoutMaxAttempts,
  getLoginLockoutWindowMs,
  getLoginLockoutWindowSeconds,
} from "./auth-lockout-config";

export interface LoginLockoutStatus {
  locked: boolean;
  retryAfter: number;
  maxAttempts: number;
  lockoutWindowSeconds: number;
}

export interface AccountLoginFailureUpdate {
  failedLoginAttempts: number;
  lockoutUntil: Date | null;
  status: LoginLockoutStatus;
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

function buildLoginLockoutStatus(retryAfter: number): LoginLockoutStatus {
  return {
    locked: retryAfter > 0,
    retryAfter,
    maxAttempts: getLoginLockoutMaxAttempts(),
    lockoutWindowSeconds: getLoginLockoutWindowSeconds(),
  };
}

export function getAccountLoginLockoutStatus(dbLockoutUntil?: Date | null): LoginLockoutStatus {
  const now = Date.now();
  return buildLoginLockoutStatus(retryAfterFromDbLockout(dbLockoutUntil, now));
}

export function getEmailLoginLockoutStatus(email: string): LoginLockoutStatus {
  const key = normalizeLoginEmail(email);
  const now = Date.now();
  let record = emailLockouts.get(key);
  if (record) {
    const active = purgeExpiredRecord(key, record, now);
    record = active ?? undefined;
  }

  let retryAfter = 0;
  if (record?.lockoutUntil && record.lockoutUntil > now) {
    retryAfter = Math.ceil((record.lockoutUntil - now) / 1000);
  }

  return buildLoginLockoutStatus(retryAfter);
}

export function recordEmailLoginFailure(email: string): LoginLockoutStatus {
  const key = normalizeLoginEmail(email);
  const now = Date.now();
  const current = getEmailLoginLockoutStatus(email);
  if (current.locked) return current;

  let record = emailLockouts.get(key);
  if (record) {
    const active = purgeExpiredRecord(key, record, now);
    record = active ?? { attempts: 0, lockoutUntil: null };
  } else {
    record = { attempts: 0, lockoutUntil: null };
  }

  record.attempts += 1;
  if (record.attempts >= getLoginLockoutMaxAttempts()) {
    record.lockoutUntil = now + getLoginLockoutWindowMs();
  }

  emailLockouts.set(key, record);
  return getEmailLoginLockoutStatus(email);
}

export function buildAccountLoginFailureUpdate(
  previousFailedLoginAttempts: number,
  dbLockoutUntil?: Date | null,
): AccountLoginFailureUpdate {
  const now = Date.now();
  const activeLockout = getAccountLoginLockoutStatus(dbLockoutUntil);
  if (activeLockout.locked) {
    return {
      failedLoginAttempts: Math.max(previousFailedLoginAttempts, getLoginLockoutMaxAttempts()),
      lockoutUntil: dbLockoutUntil ?? new Date(now + getLoginLockoutWindowMs()),
      status: activeLockout,
    };
  }

  const expiredLockout = Boolean(dbLockoutUntil && dbLockoutUntil.getTime() <= now);
  const baseAttempts = expiredLockout ? 0 : Math.max(0, previousFailedLoginAttempts);
  const failedLoginAttempts = Math.min(baseAttempts + 1, getLoginLockoutMaxAttempts());
  const lockoutUntil =
    failedLoginAttempts >= getLoginLockoutMaxAttempts() ? new Date(now + getLoginLockoutWindowMs()) : null;
  const retryAfter = lockoutUntil ? Math.ceil((lockoutUntil.getTime() - now) / 1000) : 0;

  return {
    failedLoginAttempts,
    lockoutUntil,
    status: buildLoginLockoutStatus(retryAfter),
  };
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
