import assert from "node:assert/strict";
import {
  cacheGet,
  cacheSet,
  cacheDel,
  cacheDelByPrefix,
  cacheFlush,
  cacheSize,
  startCachePruner,
  stopCachePruner,
} from "../src/cache";
import {
  logPerformance,
  startPerformanceMonitor,
  stopPerformanceMonitor,
  requestTimingMiddleware,
  getRouteStats,
} from "../src/performance";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("performance", async () => {
  let passed = 0;
  let failed = 0;

  function check(condition: boolean, label: string) {
    if (condition) {
      console.log(`  ✅ ${label}`);
      passed++;
    } else {
      console.error(`  ❌ ${label}`);
      failed++;
    }
  }

  // ─── Suite 1 : Cache LRU ─────────────────────────────────────────────────────

  async function testCache() {
    console.log("\n[cache] Suite 1 — Cache LRU en mémoire");
    await cacheFlush();

    // 1. GET sur clé inexistante → null
    const miss = await cacheGet("nonexistent");
    check(miss === null, "GET clé inexistante → null");

    // 2. SET puis GET → retourne la valeur
    await cacheSet("key1", "value1", 10);
    const hit = await cacheGet("key1");
    check(hit === "value1", "GET après SET → valeur correcte");

    // 3. SET avec TTL = 0 → immédiatement expiré (0 secondes = expiresAt = now)
    await cacheSet("key2", "value2", 0);
    const expired = await cacheGet("key2");
    check(expired === null, "GET avec TTL=0 → null (expiré)");

    // 4. DEL supprime la clé
    await cacheSet("key3", "value3", 60);
    await cacheDel("key3");
    const deleted = await cacheGet("key3");
    check(deleted === null, "GET après DEL → null");

    // 5. FLUSH vide tout
    await cacheSet("a", "1", 60);
    await cacheSet("b", "2", 60);
    await cacheFlush();
    check(cacheSize() === 0, "FLUSH → taille = 0");

    // 6. SET JSON sérialisé (comme l'utilise server.ts)
    const payload = { courses: [1, 2, 3] };
    await cacheSet("json_key", JSON.stringify(payload), 60);
    const raw = await cacheGet("json_key");
    const parsed = raw ? JSON.parse(raw) : null;
    check(parsed !== null && parsed.courses.length === 3, "GET JSON sérialisé → objet correct");

    // 7. Suppression par préfixe pour invalider toutes les variantes filtrées
    await cacheSet("api:courses:public:d=0:dis=0", "all", 60);
    await cacheSet("api:courses:public:d=1:dis=0", "domain", 60);
    await cacheSet("api:domains:public", "domains", 60);
    const deletedByPrefix = await cacheDelByPrefix("api:courses:public:");
    check(deletedByPrefix === 2, "cacheDelByPrefix supprime toutes les clés de cours filtrées");
    check((await cacheGet("api:courses:public:d=0:dis=0")) === null, "cacheDelByPrefix supprime la liste non filtrée");
    check((await cacheGet("api:courses:public:d=1:dis=0")) === null, "cacheDelByPrefix supprime la liste filtrée");
    check((await cacheGet("api:domains:public")) === "domains", "cacheDelByPrefix préserve les autres préfixes");

    // 8. Éviction LRU bornée
    await cacheFlush();
    for (let i = 0; i < 101; i++) {
      await cacheSet(`lru:${i}`, String(i), 60);
    }
    check(cacheSize() === 100, "cache borné à 100 entrées par défaut");
    check((await cacheGet("lru:0")) === null, "LRU évince la plus ancienne entrée");
    check((await cacheGet("lru:1")) === "1", "GET rafraîchit l'ordre LRU");
    await cacheSet("lru:new", "new", 60);
    check((await cacheGet("lru:1")) === "1", "entrée récemment lue conservée après éviction");
    check((await cacheGet("lru:2")) === null, "entrée la moins récemment utilisée évincée");

    // 8b. Payload trop volumineux ignoré
    await cacheFlush();
    const oversized = "x".repeat(600_000);
    await cacheSet("oversized", oversized, 60);
    check((await cacheGet("oversized")) === null, "payload > maxValueBytes non mis en cache");

    // 9. Pruner démarre et s'arrête sans erreur
    startCachePruner();
    stopCachePruner();
    check(true, "startCachePruner() / stopCachePruner() sans erreur");
  }

  // ─── Suite 2 : Performance monitoring ────────────────────────────────────────

  function testPerformance() {
    console.log("\n[perf] Suite 2 — Performance monitoring");

    // 1. logPerformance() retourne un snapshot valide
    const snapshot = logPerformance();
    check(typeof snapshot.heapUsedMb === "number" && snapshot.heapUsedMb > 0, "heapUsedMb > 0");
    check(typeof snapshot.heapTotalMb === "number" && snapshot.heapTotalMb > 0, "heapTotalMb > 0");
    check(typeof snapshot.rssMb === "number" && snapshot.rssMb > 0, "rssMb > 0");
    check(typeof snapshot.timestamp === "string" && snapshot.timestamp.includes("T"), "timestamp ISO valide");
    check(typeof snapshot.freeMb === "number", "freeMb est un nombre");
    check(typeof snapshot.totalMb === "number" && snapshot.totalMb > 0, "totalMb > 0");

    // 2. Monitor démarre et s'arrête sans erreur
    startPerformanceMonitor(99999); // interval très long pour ne pas firer pendant le test
    stopPerformanceMonitor();
    check(true, "startPerformanceMonitor() / stopPerformanceMonitor() sans erreur");

    // 3. getRouteStats() retourne un objet
    const stats = getRouteStats();
    check(typeof stats === "object" && stats !== null, "getRouteStats() retourne un objet");

    // 4. requestTimingMiddleware appelle next()
    let nextCalled = false;
    const fakeReq: any = {
      route: { path: "/api/test" },
      path: "/api/test",
      method: "GET",
      originalUrl: "/api/test",
      on: (_event: string, _handler: Function) => {},
    };
    const fakeRes: any = {
      statusCode: 200,
      on: (_event: string, handler: Function) => {
        if (_event === "finish") handler(); // simule la fin de la réponse
      },
    };
    requestTimingMiddleware(fakeReq, fakeRes, () => {
      nextCalled = true;
    });
    check(nextCalled, "requestTimingMiddleware appelle next()");
  }

  // ─── Runner ──────────────────────────────────────────────────────────────────

  console.log("=== tests/performance.test.ts ===");

  await testCache();
  testPerformance();

  console.log(`\n─── Résultats : ${passed} ✅  ${failed} ❌ ───`);
  assert.equal(failed, 0, `${failed} test(s) ont échoué.`);
});
