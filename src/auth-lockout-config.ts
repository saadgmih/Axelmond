/** Canonical login lockout policy — do not override in production. */
export const LOGIN_LOCKOUT_MAX_ATTEMPTS = 10;
export const LOGIN_LOCKOUT_WINDOW_MS = 30_000;
export const LOGIN_LOCKOUT_WINDOW_SECONDS = 30;

export function getLoginLockoutMaxAttempts(): number {
  if (process.env.SECURITY_RUNTIME_TEST === "1" && process.env.AUTH_MAX_ATTEMPTS) {
    const parsed = Number(process.env.AUTH_MAX_ATTEMPTS);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return LOGIN_LOCKOUT_MAX_ATTEMPTS;
}

export function getLoginLockoutWindowMs(): number {
  if (process.env.SECURITY_RUNTIME_TEST === "1" && process.env.AUTH_LOCKOUT_WINDOW_MS) {
    const parsed = Number(process.env.AUTH_LOCKOUT_WINDOW_MS);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return LOGIN_LOCKOUT_WINDOW_MS;
}

export function getLoginLockoutWindowSeconds(): number {
  return Math.ceil(getLoginLockoutWindowMs() / 1000);
}
