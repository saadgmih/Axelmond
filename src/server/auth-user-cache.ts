import { prisma } from "../db";
import { AUTH_USER_INCLUDE } from "../course-payments";

const AUTH_USER_CACHE_MS = Number(process.env.AUTH_USER_CACHE_MS) || 5000;
const configuredMaxEntries = Number(process.env.AUTH_USER_CACHE_MAX_ENTRIES);
const AUTH_USER_CACHE_MAX_ENTRIES =
  Number.isInteger(configuredMaxEntries) && configuredMaxEntries > 0 ? configuredMaxEntries : 200;

interface CachedAuthUser {
  dbUser: Awaited<ReturnType<typeof fetchAuthUserFromDb>>;
  expiresAt: number;
  authTokenVersion: number;
}

const authUserCache = new Map<string, CachedAuthUser>();
let pruneTimer: ReturnType<typeof setInterval> | null = null;

async function fetchAuthUserFromDb(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: AUTH_USER_INCLUDE,
  });
}

function evictAuthUserCacheOverflow() {
  while (authUserCache.size > AUTH_USER_CACHE_MAX_ENTRIES) {
    const oldestKey = authUserCache.keys().next().value;
    if (!oldestKey) return;
    authUserCache.delete(oldestKey);
  }
}

export function pruneAuthUserCache() {
  const now = Date.now();
  for (const [userId, entry] of authUserCache.entries()) {
    if (entry.expiresAt <= now) {
      authUserCache.delete(userId);
    }
  }
  evictAuthUserCacheOverflow();
}

export function startAuthUserCachePruner() {
  if (pruneTimer) return;
  pruneTimer = setInterval(() => pruneAuthUserCache(), 5 * 60 * 1000);
  if (pruneTimer && typeof pruneTimer === "object" && "unref" in pruneTimer) {
    (pruneTimer as NodeJS.Timeout).unref();
  }
}

export function stopAuthUserCachePruner() {
  if (pruneTimer) {
    clearInterval(pruneTimer);
    pruneTimer = null;
  }
}

export function invalidateAuthUserCache(userId: string): boolean {
  return authUserCache.delete(userId);
}

export function getAuthUserCacheStats() {
  pruneAuthUserCache();
  return {
    size: authUserCache.size,
    maxEntries: AUTH_USER_CACHE_MAX_ENTRIES,
    ttlMs: AUTH_USER_CACHE_MS,
  };
}

export async function resolveCachedAuthDbUser(
  session: { userId: string; authTokenVersion: number },
  options?: { forceRefresh?: boolean },
) {
  const now = Date.now();
  const cached = authUserCache.get(session.userId);
  if (
    !options?.forceRefresh &&
    cached &&
    cached.expiresAt > now &&
    cached.authTokenVersion === session.authTokenVersion
  ) {
    return cached.dbUser;
  }

  const dbUser = await fetchAuthUserFromDb(session.userId);
  if (dbUser) {
    authUserCache.delete(session.userId);
    authUserCache.set(session.userId, {
      dbUser,
      expiresAt: now + AUTH_USER_CACHE_MS,
      authTokenVersion: Number(dbUser.authTokenVersion) || 0,
    });
    evictAuthUserCacheOverflow();
  } else {
    authUserCache.delete(session.userId);
  }
  return dbUser;
}
