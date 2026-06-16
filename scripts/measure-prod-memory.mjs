#!/usr/bin/env node
/**
 * Mesure RAM prod via GET /api/health (header x-health-token).
 * Usage:
 *   HEALTH_CHECK_TOKEN=... node scripts/measure-prod-memory.mjs
 *   npm run hostinger:memory
 */
import process from "node:process";

const baseUrl = (process.env.APP_URL || "https://axelmond.com").replace(/\/+$/, "");
const token = process.env.HEALTH_CHECK_TOKEN?.trim();

if (!token) {
  console.error("[memory] HEALTH_CHECK_TOKEN manquant — définir dans .env ou l'environnement");
  process.exit(1);
}

const res = await fetch(`${baseUrl}/api/health`, {
  headers: { "x-health-token": token },
  signal: AbortSignal.timeout(20_000),
});

const body = await res.json().catch(() => ({}));
console.log(`[memory] HTTP ${res.status} ${baseUrl}/api/health`);

if (!res.ok) {
  console.error(JSON.stringify(body, null, 2));
  process.exit(1);
}

if (!body.memory) {
  console.error("[memory] Réponse sans champ memory — HEALTH_CHECK_TOKEN absent ou incorrect côté serveur (hPanel).");
  console.error(JSON.stringify(body, null, 2));
  process.exit(2);
}

const m = body.memory;
const payload =
  typeof m.heapUsedMb === "number"
    ? {
        status: body.status,
        uptimeSec: body.uptime,
        heapUsedMb: m.heapUsedMb,
        heapTotalMb: m.heapTotalMb,
        heapLimitMb: m.heapLimitMb,
        rssMb: m.rssMb,
        heapPressurePercent: m.heapPressurePercent,
        cache: m.cache,
        authUserCache: m.authUserCache,
        trackedRoutes: m.trackedRoutes,
      }
    : {
        status: body.status,
        uptimeSec: body.uptime,
        heapUsedMb: Math.round((m.heapUsed / 1024 / 1024) * 10) / 10,
        heapTotalMb: Math.round((m.heapTotal / 1024 / 1024) * 10) / 10,
        rssMb: Math.round((m.rss / 1024 / 1024) * 10) / 10,
        externalMb: Math.round((m.external / 1024 / 1024) * 10) / 10,
        dbStatus: body.dbStatus,
        dbSchema: body.dbSchema,
      };
console.log(JSON.stringify(payload, null, 2));
