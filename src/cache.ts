// ─── Cache LRU en mémoire (Redis-ready) ──────────────────────────────────────
//
// Interface compatible Redis : pour migrer vers Redis en production,
// remplacez uniquement ce fichier sans toucher server.ts.
//
// Niveaux : get / set / del / flush
// TTL     : en secondes, configurable par entrée
// LRU     : les entrées expirées sont nettoyées périodiquement

interface CacheEntry {
  value: string;
  expiresAt: number; // timestamp ms
}

const store = new Map<string, CacheEntry>();

const DEFAULT_TTL_SECONDS = Number(process.env.CACHE_TTL_SECONDS) || 60;

function logCache(level: "INFO" | "WARN", message: string, data?: unknown) {
  console.log(`[${new Date().toISOString()}] [${level}] [cache] ${message}${data ? " " + JSON.stringify(data) : ""}`);
}

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

// Nettoyage périodique toutes les 5 minutes
const PRUNE_INTERVAL_MS = 5 * 60 * 1000;
let pruneTimer: ReturnType<typeof setInterval> | null = null;

export function startCachePruner() {
  if (pruneTimer) return;
  pruneTimer = setInterval(pruneExpired, PRUNE_INTERVAL_MS);
  if (pruneTimer && typeof pruneTimer === "object" && "unref" in pruneTimer) {
    (pruneTimer as any).unref(); // ne bloque pas l'arrêt du process
  }
}

export function stopCachePruner() {
  if (pruneTimer) {
    clearInterval(pruneTimer);
    pruneTimer = null;
  }
}

export async function cacheGet(key: string): Promise<string | null> {
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

export async function cacheSet(key: string, value: string, ttlSeconds: number = DEFAULT_TTL_SECONDS): Promise<void> {
  store.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

export async function cacheDel(key: string): Promise<void> {
  store.delete(key);
}

export async function cacheFlush(): Promise<void> {
  store.clear();
  logCache("INFO", "Cache flushed", { size: 0 });
}

export function cacheSize(): number {
  return store.size;
}
