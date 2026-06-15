import { prisma } from "./db";
import { logSecurity } from "./security-logger";

const DEFAULT_PURGE_INTERVAL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_RETENTION_DAYS = 30;

let purgeTimer: NodeJS.Timeout | null = null;

function getRetentionDays(): number {
  const raw = Number(process.env.REFRESH_TOKEN_RETENTION_DAYS);
  return Number.isInteger(raw) && raw > 0 ? raw : DEFAULT_RETENTION_DAYS;
}

function getPurgeIntervalMs(): number {
  const raw = Number(process.env.REFRESH_TOKEN_PURGE_INTERVAL_MS);
  return Number.isInteger(raw) && raw > 0 ? raw : DEFAULT_PURGE_INTERVAL_MS;
}

export async function purgeExpiredRefreshTokens() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - getRetentionDays());

  const result = await prisma.refreshToken.deleteMany({
    where: {
      OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { lt: cutoff } }],
    },
  });

  if (result.count > 0) {
    logSecurity("INFO", "Purged stale refresh tokens", { count: result.count });
  }

  return result.count;
}

export function startRefreshTokenCleanup() {
  if (purgeTimer) return;
  void purgeExpiredRefreshTokens();
  purgeTimer = setInterval(() => {
    void purgeExpiredRefreshTokens();
  }, getPurgeIntervalMs());
  if (purgeTimer && typeof purgeTimer === "object" && "unref" in purgeTimer) {
    purgeTimer.unref();
  }
}

export function stopRefreshTokenCleanup() {
  if (!purgeTimer) return;
  clearInterval(purgeTimer);
  purgeTimer = null;
}
