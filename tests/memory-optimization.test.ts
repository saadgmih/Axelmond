import assert from "node:assert/strict";
import { cacheFlush, cacheSet, cacheSize, getCacheStats } from "../src/cache";
import { getAuthUserCacheStats, invalidateAuthUserCache, pruneAuthUserCache } from "../src/server/auth-user-cache";
import { collectRuntimeMemoryMetrics } from "../src/server/memory-metrics";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("memory-optimization", async () => {
  await cacheFlush();

  const stats = getCacheStats();
  assert.equal(stats.maxEntries, 100);
  assert.equal(stats.maxValueBytes, 512_000);

  const authStats = getAuthUserCacheStats();
  assert.equal(authStats.maxEntries, 200);
  assert.equal(authStats.ttlMs, 5000);

  const metrics = collectRuntimeMemoryMetrics();
  assert.ok(metrics.heapUsedMb > 0);
  assert.ok(metrics.rssMb > 0);
  assert.equal(typeof metrics.timestamp, "string");
  assert.equal(metrics.cache.kind, "memory");

  invalidateAuthUserCache("missing-user");
  pruneAuthUserCache();

  const oversized = "y".repeat(600_000);
  await cacheSet("too-big", oversized, 60);
  assert.equal(cacheSize(), 0);

  console.log("memory-optimization metrics sample:", {
    heapUsedMb: metrics.heapUsedMb,
    rssMb: metrics.rssMb,
    cacheEntries: metrics.cache.entries,
    authCacheSize: metrics.authUserCache.size,
  });
});
