import { prisma } from "./db";
import { logSecurity } from "./security-logger";

const DEFAULT_PURGE_INTERVAL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_RETENTION_DAYS = 30;

let purgeTimer: NodeJS.Timeout | null = null;
let activePurge: Promise<number> | null = null;
let cleanupStopped = true;

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

function runRefreshTokenPurge(): Promise<number> {
  if (cleanupStopped) return Promise.resolve(0);
  if (activePurge) return activePurge;

  const task = purgeExpiredRefreshTokens();
  activePurge = task;
  const clearActivePurge = () => {
    if (activePurge === task) activePurge = null;
  };
  void task.then(clearActivePurge, clearActivePurge);
  return task;
}

async function runScheduledRefreshTokenPurge(signal?: AbortSignal) {
  if (cleanupStopped || signal?.aborted) return;
  try {
    await runRefreshTokenPurge();
  } catch (err) {
    if (!cleanupStopped && !signal?.aborted) {
      logSecurity("WARN", "Refresh token purge failed", { error: String(err) });
    }
  }
}

export async function startRefreshTokenCleanup(signal?: AbortSignal) {
  if (signal?.aborted) return;
  cleanupStopped = false;
  if (purgeTimer) return;
  purgeTimer = setInterval(() => {
    void runScheduledRefreshTokenPurge(signal);
  }, getPurgeIntervalMs());
  if (purgeTimer && typeof purgeTimer === "object" && "unref" in purgeTimer) {
    purgeTimer.unref();
  }
  await runScheduledRefreshTokenPurge(signal);
}

export async function stopRefreshTokenCleanup() {
  cleanupStopped = true;
  if (purgeTimer) {
    clearInterval(purgeTimer);
    purgeTimer = null;
  }
  if (activePurge) {
    try {
      await activePurge;
    } catch (err) {
      logSecurity("WARN", "Refresh token purge stopped after failure", { error: String(err) });
    }
  }
}
