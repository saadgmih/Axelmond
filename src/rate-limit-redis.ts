// ─── Store Redis partagé pour express-rate-limit ────────────────────────────
//
// Sans REDIS_URL : chaque worker PM2 garde son compteur mémoire (défaut).
// Avec REDIS_URL  : tous les workers partagent les compteurs via Redis —
//                   les limites deviennent globales et cohérentes en cluster.
//
// Sécurité anti-coupure : si Redis tombe en cours de route, chaque incrément
// échoue et express-rate-limit (passOnStoreError: true) laisse passer la
// requête (fail-open) plutôt que de bloquer tous les utilisateurs.

import type { Store } from "express-rate-limit";

const REDIS_KEY_PREFIX = (process.env.REDIS_RATE_LIMIT_PREFIX || "axelmond:rl:").trim();
const REDIS_CONNECT_TIMEOUT_MS = Number(process.env.REDIS_CONNECT_TIMEOUT_MS) || 5000;
const REDIS_COMMAND_TIMEOUT_MS = Number(process.env.REDIS_COMMAND_TIMEOUT_MS) || 3000;

// INCR atomique + PEXPIRE au premier hit. Retourne [count, ttl_ms restant].
// Si la clé perd son TTL (crash entre INCR et PEXPIRE impossible grâce au Lua),
// le TTL renvoyé est -1 et le store ré-arme l'expiration.
const INCREMENT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
local ttl = redis.call('PTTL', KEYS[1])
if count == 1 or ttl < 0 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return {count, ttl}
`;

let sharedClient: import("ioredis").default | null = null;
let sharedClientPromise: Promise<import("ioredis").default | null> | null = null;

function logRateLimitStore(level: "INFO" | "WARN", message: string, data?: unknown) {
  const line = `[${new Date().toISOString()}] [${level}] [rate-limit-store] ${message}${data ? " " + JSON.stringify(data) : ""}`;
  if (level === "WARN" && process.env.NODE_ENV === "production") {
    // En production, éviter le spam : Redis en panne loggerait à chaque incrément.
    return;
  }
  console.log(line);
}

async function getSharedClient(): Promise<import("ioredis").default | null> {
  if (sharedClient && sharedClient.status === "ready") return sharedClient;
  if (sharedClientPromise) return sharedClientPromise;

  sharedClientPromise = (async () => {
    const { default: Redis } = await import("ioredis");
    const client = new Redis(process.env.REDIS_URL as string, {
      maxRetriesPerRequest: 1,
      connectTimeout: REDIS_CONNECT_TIMEOUT_MS,
      commandTimeout: REDIS_COMMAND_TIMEOUT_MS,
      enableOfflineQueue: false,
      retryStrategy: (times) => (times > 5 ? null : Math.min(times * 500, 5000)),
    });
    client.on("error", (err: unknown) => {
      logRateLimitStore("WARN", "Redis connection error", { error: String(err) });
    });
    sharedClient = client;
    logRateLimitStore("INFO", "Shared Redis rate-limit store initialized", { prefix: REDIS_KEY_PREFIX });
    return client;
  })();

  try {
    return await sharedClientPromise;
  } catch (err) {
    logRateLimitStore("WARN", "Redis store init failed", { error: String(err) });
    sharedClientPromise = null;
    return null;
  }
}

/**
 * Retourne un Store express-rate-limit v8 adossé à Redis, ou null quand
 * REDIS_URL n'est pas configuré (l'app garde alors le store mémoire par défaut).
 * Toutes les instances partagent une seule connexion ioredis.
 */
export function createSharedRateLimitStore(): Store | null {
  const redisUrl = process.env.REDIS_URL?.trim();
  if (!redisUrl) return null;

  const prefixed = (key: string) => `${REDIS_KEY_PREFIX}${key.replace(/[\s]/g, "_")}`;

  const store: Store = {
    // Store partagé entre workers : les clés NE sont PAS locales.
    localKeys: false,

    async increment(key: string) {
      const client = await getSharedClient();
      if (!client) throw new Error("Redis rate-limit store unavailable");
      const result = (await client.eval(
        INCREMENT_SCRIPT,
        1,
        prefixed(key),
        Number(process.env.RATE_LIMIT_STORE_WINDOW_MS) || 900_000,
      )) as [number, number];
      const [count, ttlMs] = result;
      return { totalHits: count, resetTime: new Date(Date.now() + Math.max(ttlMs, 0)) };
    },

    async decrement(key: string) {
      const client = await getSharedClient();
      if (!client) return;
      await client.decr(prefixed(key)).catch(() => undefined);
    },

    async resetKey(key: string) {
      const client = await getSharedClient();
      if (!client) return;
      await client.del(prefixed(key)).catch(() => undefined);
    },

    async resetAll() {
      const client = await getSharedClient();
      if (!client) return;
      let cursor = "0";
      do {
        const [nextCursor, keys] = await client
          .scan(cursor, "MATCH", `${REDIS_KEY_PREFIX}*`, "COUNT", 100)
          .catch(() => ["0", []] as [string, string[]]);
        cursor = nextCursor;
        if (keys.length > 0) await client.del(...keys).catch(() => undefined);
      } while (cursor !== "0");
    },
  };

  return store;
}

/** Ferme la connexion partagée (graceful shutdown). */
export async function shutdownRateLimitStore(): Promise<void> {
  const client = sharedClient;
  sharedClient = null;
  sharedClientPromise = null;
  if (client) {
    try {
      await client.quit();
    } catch {
      client.disconnect();
    }
  }
}
