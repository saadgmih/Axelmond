// ─── Cache distribué (mémoire LRU ou Redis) ─────────────────────────────────
//
// Sans REDIS_URL : LRU en mémoire (développement / instance unique).
// Avec REDIS_URL : Redis partagé entre workers PM2 cluster.

interface CacheEntry {
  value: string;
  expiresAt: number;
  byteSize: number;
}

interface CacheBackend {
  readonly kind: "memory" | "redis";
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<boolean>;
  del(key: string): Promise<void>;
  delByPrefix(prefix: string): Promise<number>;
  flush(): Promise<void>;
  size(): number;
  stats(): { entries: number; approxBytes: number; maxEntries: number; maxValueBytes: number };
  disconnect?(): Promise<void>;
}

const DEFAULT_TTL_SECONDS = Number(process.env.CACHE_TTL_SECONDS) || 60;
const configuredMaxEntries = Number(process.env.CACHE_MAX_ENTRIES);
const DEFAULT_MAX_ENTRIES =
  Number.isInteger(configuredMaxEntries) && configuredMaxEntries > 0 ? configuredMaxEntries : 100;
const configuredMaxValueBytes = Number(process.env.CACHE_MAX_VALUE_BYTES);
const DEFAULT_MAX_VALUE_BYTES =
  Number.isInteger(configuredMaxValueBytes) && configuredMaxValueBytes > 0 ? configuredMaxValueBytes : 512_000;
const REDIS_KEY_PREFIX = (process.env.REDIS_KEY_PREFIX || "axelmond:cache:").trim();
const REDIS_CONNECT_TIMEOUT_MS = Number(process.env.REDIS_CONNECT_TIMEOUT_MS) || 5000;
const REDIS_COMMAND_TIMEOUT_MS = Number(process.env.REDIS_COMMAND_TIMEOUT_MS) || 3000;
const CACHE_OPERATION_TIMEOUT_MS = Number(process.env.CACHE_OPERATION_TIMEOUT_MS) || 3000;

async function withCacheTimeout<T>(promise: Promise<T>, label: string): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise.catch((err) => {
        logCache("WARN", `${label} failed`, { error: String(err) });
        return null;
      }),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => {
          logCache("WARN", `${label} timed out`, { timeoutMs: CACHE_OPERATION_TIMEOUT_MS });
          resolve(null);
        }, CACHE_OPERATION_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function logCache(level: "INFO" | "WARN", message: string, data?: unknown) {
  console.log(`[${new Date().toISOString()}] [${level}] [cache] ${message}${data ? " " + JSON.stringify(data) : ""}`);
}

function createMemoryBackend(): CacheBackend {
  const store = new Map<string, CacheEntry>();
  let approxBytes = 0;

  function pruneExpired() {
    const now = Date.now();
    let pruned = 0;
    for (const [key, entry] of store.entries()) {
      if (entry.expiresAt <= now) {
        approxBytes = Math.max(0, approxBytes - entry.byteSize);
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
      const entry = store.get(oldestKey);
      if (entry) approxBytes = Math.max(0, approxBytes - entry.byteSize);
      store.delete(oldestKey);
    }
  }

  return {
    kind: "memory",
    async get(key) {
      const entry = store.get(key);
      if (!entry) return null;
      if (entry.expiresAt <= Date.now()) {
        approxBytes = Math.max(0, approxBytes - entry.byteSize);
        store.delete(key);
        return null;
      }
      store.delete(key);
      store.set(key, entry);
      return entry.value;
    },
    async set(key, value, ttlSeconds) {
      const byteSize = Buffer.byteLength(value, "utf8");
      if (byteSize > DEFAULT_MAX_VALUE_BYTES) {
        logCache("WARN", "Cache entry skipped — payload too large", { key, byteSize, maxBytes: DEFAULT_MAX_VALUE_BYTES });
        return false;
      }
      const previous = store.get(key);
      if (previous) approxBytes = Math.max(0, approxBytes - previous.byteSize);
      store.delete(key);
      store.set(key, {
        value,
        expiresAt: Date.now() + ttlSeconds * 1000,
        byteSize,
      });
      approxBytes += byteSize;
      evictLeastRecentlyUsed();
      return true;
    },
    async del(key) {
      const entry = store.get(key);
      if (entry) approxBytes = Math.max(0, approxBytes - entry.byteSize);
      store.delete(key);
    },
    async delByPrefix(prefix) {
      let deleted = 0;
      for (const key of store.keys()) {
        if (key.startsWith(prefix)) {
          const entry = store.get(key);
          if (entry) approxBytes = Math.max(0, approxBytes - entry.byteSize);
          store.delete(key);
          deleted++;
        }
      }
      return deleted;
    },
    async flush() {
      store.clear();
      approxBytes = 0;
      logCache("INFO", "Cache flushed", { size: 0 });
    },
    size() {
      pruneExpired();
      return store.size;
    },
    stats() {
      pruneExpired();
      return {
        entries: store.size,
        approxBytes,
        maxEntries: DEFAULT_MAX_ENTRIES,
        maxValueBytes: DEFAULT_MAX_VALUE_BYTES,
      };
    },
  };
}

async function createRedisBackend(redisUrl: string): Promise<CacheBackend> {
  const { default: Redis } = await import("ioredis");
  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    connectTimeout: REDIS_CONNECT_TIMEOUT_MS,
    commandTimeout: REDIS_COMMAND_TIMEOUT_MS,
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
      const byteSize = Buffer.byteLength(value, "utf8");
      if (byteSize > DEFAULT_MAX_VALUE_BYTES) {
        logCache("WARN", "Cache entry skipped — payload too large", { key, byteSize, maxBytes: DEFAULT_MAX_VALUE_BYTES });
        return false;
      }
      const ttl = Math.max(1, Math.floor(ttlSeconds));
      await client.set(prefixed(key), value, "EX", ttl);
      return true;
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
    stats() {
      return {
        entries: -1,
        approxBytes: -1,
        maxEntries: DEFAULT_MAX_ENTRIES,
        maxValueBytes: DEFAULT_MAX_VALUE_BYTES,
      };
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

export function getCacheStats() {
  return {
    kind: backend.kind,
    ...backend.stats(),
  };
}

export async function initCache(): Promise<void> {
  const redisUrl = process.env.REDIS_URL?.trim();
  if (!redisUrl) {
    backend = createMemoryBackend();
    logCache("INFO", "Using in-memory cache backend", {
      maxEntries: DEFAULT_MAX_ENTRIES,
      maxValueBytes: DEFAULT_MAX_VALUE_BYTES,
    });
    return;
  }

  try {
    const { default: Redis } = await import("ioredis");
    const probe = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: REDIS_CONNECT_TIMEOUT_MS,
      lazyConnect: true,
      enableOfflineQueue: false,
    });
    await probe.connect();
    await probe.ping();
    await probe.quit();
    backend = await createRedisBackend(redisUrl);
    logCache("INFO", "Using Redis cache backend", { prefix: REDIS_KEY_PREFIX });
  } catch (err) {
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
  const value = await withCacheTimeout(backend.get(key), "cacheGet");
  return value ?? null;
}

export async function cacheSet(key: string, value: string, ttlSeconds: number = DEFAULT_TTL_SECONDS): Promise<void> {
  await withCacheTimeout(backend.set(key, value, ttlSeconds), "cacheSet");
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
