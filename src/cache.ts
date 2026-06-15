// ─── Cache distribué (mémoire LRU ou Redis) ─────────────────────────────────
//
// Sans REDIS_URL : LRU en mémoire (développement / instance unique).
// Avec REDIS_URL : Redis partagé entre workers PM2 cluster.

import Redis from "ioredis";

interface CacheEntry {
  value: string;
  expiresAt: number;
}

interface CacheBackend {
  readonly kind: "memory" | "redis";
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
  delByPrefix(prefix: string): Promise<number>;
  flush(): Promise<void>;
  size(): number;
  disconnect?(): Promise<void>;
}

const DEFAULT_TTL_SECONDS = Number(process.env.CACHE_TTL_SECONDS) || 60;
const configuredMaxEntries = Number(process.env.CACHE_MAX_ENTRIES);
const DEFAULT_MAX_ENTRIES =
  Number.isInteger(configuredMaxEntries) && configuredMaxEntries > 0 ? configuredMaxEntries : 1000;
const REDIS_KEY_PREFIX = (process.env.REDIS_KEY_PREFIX || "axelmond:cache:").trim();

function logCache(level: "INFO" | "WARN", message: string, data?: unknown) {
  console.log(`[${new Date().toISOString()}] [${level}] [cache] ${message}${data ? " " + JSON.stringify(data) : ""}`);
}

function createMemoryBackend(): CacheBackend {
  const store = new Map<string, CacheEntry>();

  function pruneExpired() {
    const now = Date.now();
    let pruned = 0;
    for (const [key, entry] of store.entries()) {
      if (entry.expiresAt <= now) {
        store.delete(key);
        pruned++;
      }
    }
    if (pruned > 0) {
      logCache("INFO", "Pruned expired cache entries", { pruned, remaining: store.size });
    }
  }

  function evictLeastRecentlyUsed() {
    while (store.size > DEFAULT_MAX_ENTRIES) {
      const oldestKey = store.keys().next().value;
      if (!oldestKey) return;
      store.delete(oldestKey);
    }
  }

  return {
    kind: "memory",
    async get(key) {
      const entry = store.get(key);
      if (!entry) return null;
      if (entry.expiresAt <= Date.now()) {
        store.delete(key);
        return null;
      }
      store.delete(key);
      store.set(key, entry);
      return entry.value;
    },
    async set(key, value, ttlSeconds) {
      store.delete(key);
      store.set(key, {
        value,
        expiresAt: Date.now() + ttlSeconds * 1000,
      });
      evictLeastRecentlyUsed();
    },
    async del(key) {
      store.delete(key);
    },
    async delByPrefix(prefix) {
      let deleted = 0;
      for (const key of store.keys()) {
        if (key.startsWith(prefix)) {
          store.delete(key);
          deleted++;
        }
      }
      return deleted;
    },
    async flush() {
      store.clear();
      logCache("INFO", "Cache flushed", { size: 0 });
    },
    size() {
      pruneExpired();
      return store.size;
    },
  };
}

function createRedisBackend(redisUrl: string): CacheBackend {
  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: 2,
    lazyConnect: true,
    enableOfflineQueue: false,
  });

  client.on("error", (err) => {
    logCache("WARN", "Redis connection error", { error: String(err) });
  });

  const prefixed = (key: string) => `${REDIS_KEY_PREFIX}${key}`;

  return {
    kind: "redis",
    async get(key) {
      return client.get(prefixed(key));
    },
    async set(key, value, ttlSeconds) {
      const ttl = Math.max(1, Math.floor(ttlSeconds));
      await client.set(prefixed(key), value, "EX", ttl);
    },
    async del(key) {
      await client.del(prefixed(key));
    },
    async delByPrefix(prefix) {
      let deleted = 0;
      let cursor = "0";
      const match = `${REDIS_KEY_PREFIX}${prefix}*`;
      do {
        const [nextCursor, keys] = await client.scan(cursor, "MATCH", match, "COUNT", 100);
        cursor = nextCursor;
        if (keys.length > 0) {
          deleted += await client.del(...keys);
        }
      } while (cursor !== "0");
      return deleted;
    },
    async flush() {
      let deleted = 0;
      let cursor = "0";
      const match = `${REDIS_KEY_PREFIX}*`;
      do {
        const [nextCursor, keys] = await client.scan(cursor, "MATCH", match, "COUNT", 100);
        cursor = nextCursor;
        if (keys.length > 0) {
          deleted += await client.del(...keys);
        }
      } while (cursor !== "0");
      logCache("INFO", "Redis cache flushed", { deleted });
    },
    size() {
      return -1;
    },
    async disconnect() {
      await client.quit();
    },
  };
}

let backend: CacheBackend = createMemoryBackend();
let pruneTimer: ReturnType<typeof setInterval> | null = null;

export function getCacheBackendKind(): "memory" | "redis" {
  return backend.kind;
}

export async function initCache(): Promise<void> {
  const redisUrl = process.env.REDIS_URL?.trim();
  if (!redisUrl) {
    backend = createMemoryBackend();
    logCache("INFO", "Using in-memory cache backend");
    return;
  }

  const redisBackend = createRedisBackend(redisUrl);
  const probe = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    connectTimeout: 5000,
    lazyConnect: true,
    enableOfflineQueue: false,
  });

  try {
    await probe.connect();
    await probe.ping();
    await probe.quit();
    backend = redisBackend;
    logCache("INFO", "Using Redis cache backend", { prefix: REDIS_KEY_PREFIX });
  } catch (err) {
    await probe.quit().catch(() => undefined);
    logCache("WARN", "Redis unavailable — falling back to in-memory cache", { error: String(err) });
    backend = createMemoryBackend();
  }
}

export function startCachePruner() {
  if (backend.kind !== "memory" || pruneTimer) return;
  pruneTimer = setInterval(() => {
    if (backend.kind === "memory") {
      backend.size();
    }
  }, 5 * 60 * 1000);
  if (pruneTimer && typeof pruneTimer === "object" && "unref" in pruneTimer) {
    (pruneTimer as NodeJS.Timeout).unref();
  }
}

export function stopCachePruner() {
  if (pruneTimer) {
    clearInterval(pruneTimer);
    pruneTimer = null;
  }
}

export async function disconnectCache(): Promise<void> {
  stopCachePruner();
  if (backend.disconnect) {
    await backend.disconnect();
  }
}

export async function cacheGet(key: string): Promise<string | null> {
  return backend.get(key);
}

export async function cacheSet(key: string, value: string, ttlSeconds: number = DEFAULT_TTL_SECONDS): Promise<void> {
  await backend.set(key, value, ttlSeconds);
}

export async function cacheDel(key: string): Promise<void> {
  await backend.del(key);
}

export async function cacheDelByPrefix(prefix: string): Promise<number> {
  return backend.delByPrefix(prefix);
}

export async function cacheFlush(): Promise<void> {
  await backend.flush();
}

export function cacheSize(): number {
  return backend.size();
}
