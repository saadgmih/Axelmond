// ─── Monitoring de performance (CPU / RAM / Requêtes) ────────────────────────
//
// Fournit :
//  - logPerformance()              : snapshot CPU + RAM instantané
//  - startPerformanceMonitor()     : interval périodique de snapshots
//  - requestTimingMiddleware       : Express middleware de chronométrage par route
//  - Compteurs agrégés             : requests/s, p95, p99

import type express from "express";
import * as os from "os";
import v8 from "node:v8";

// ── Types ────────────────────────────────────────────────────────────────────

export interface PerformanceSnapshot {
  timestamp: string;
  heapUsedMb: number;
  heapTotalMb: number;
  rssMb: number;
  externalMb: number;
  cpuUserMs: number;
  cpuSystemMs: number;
  loadAvg1: number;
  loadAvg5: number;
  freeMb: number;
  totalMb: number;
}

export interface RequestMetrics {
  route: string;
  method: string;
  status: number;
  durationMs: number;
}

// ── Logger interne (même style que server.ts) ─────────────────────────────────

function logPerf(level: "INFO" | "WARN", message: string, data?: unknown) {
  console.log(`[${new Date().toISOString()}] [${level}] [perf] ${message}${data ? " " + JSON.stringify(data) : ""}`);
}

// ── Métriques agrégées ────────────────────────────────────────────────────────

interface RouteStats {
  count: number;
  totalMs: number;
  durations: number[];
}

const routeStats = new Map<string, RouteStats>();
let totalRequests = 0;
let startupTime = Date.now();

function recordRequest(metrics: RequestMetrics) {
  totalRequests++;
  const key = `${metrics.method} ${metrics.route}`;
  const stats = routeStats.get(key) || { count: 0, totalMs: 0, durations: [] };
  stats.count++;
  stats.totalMs += metrics.durationMs;
  // Garder les 1000 dernières durées pour p95/p99
  stats.durations.push(metrics.durationMs);
  if (stats.durations.length > 1000) stats.durations.shift();
  routeStats.set(key, stats);
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

export function getRouteStats() {
  const result: Record<string, { count: number; avgMs: number; p95Ms: number; p99Ms: number }> = {};
  for (const [key, stats] of routeStats.entries()) {
    result[key] = {
      count: stats.count,
      avgMs: stats.count ? Math.round(stats.totalMs / stats.count) : 0,
      p95Ms: percentile(stats.durations, 95),
      p99Ms: percentile(stats.durations, 99),
    };
  }
  return result;
}

// ── Snapshot CPU / RAM ────────────────────────────────────────────────────────

let lastCpuUsage = process.cpuUsage();

export function logPerformance(): PerformanceSnapshot {
  const mem = process.memoryUsage();
  const cpu = process.cpuUsage(lastCpuUsage);
  lastCpuUsage = process.cpuUsage();

  const toMb = (bytes: number) => Math.round((bytes / 1024 / 1024) * 10) / 10;
  const loadAvg = os.loadavg(); // [1min, 5min, 15min]
  const freeMem = os.freemem();
  const totalMem = os.totalmem();
  const uptimeSec = Math.round((Date.now() - startupTime) / 1000);
  const reqPerMin = uptimeSec > 0 ? Math.round(totalRequests / (uptimeSec / 60)) : 0;

  const snapshot: PerformanceSnapshot = {
    timestamp: new Date().toISOString(),
    heapUsedMb: toMb(mem.heapUsed),
    heapTotalMb: toMb(mem.heapTotal),
    rssMb: toMb(mem.rss),
    externalMb: toMb(mem.external),
    cpuUserMs: Math.round(cpu.user / 1000),
    cpuSystemMs: Math.round(cpu.system / 1000),
    loadAvg1: Math.round(loadAvg[0] * 100) / 100,
    loadAvg5: Math.round(loadAvg[1] * 100) / 100,
    freeMb: toMb(freeMem),
    totalMb: toMb(totalMem),
  };

  logPerf("INFO", "Performance snapshot", {
    ...snapshot,
    totalRequests,
    reqPerMin,
    trackedRoutes: routeStats.size,
  });

  return snapshot;
}

// ── Monitor périodique ────────────────────────────────────────────────────────

let monitorTimer: ReturnType<typeof setInterval> | null = null;

export function startPerformanceMonitor(intervalMs: number = 30_000) {
  if (monitorTimer) return;
  startupTime = Date.now();
  logPerf("INFO", "Performance monitor started", { intervalMs });
  monitorTimer = setInterval(() => {
    logPerformance();
    // V8 garde souvent heapTotal proche de heapUsed — mesurer vs la limite réelle (--max-old-space-size).
    const mem = process.memoryUsage();
    const heapUsedMb = Math.round(mem.heapUsed / 1024 / 1024);
    const heapTotalMb = Math.round(mem.heapTotal / 1024 / 1024);
    const rssMb = Math.round(mem.rss / 1024 / 1024);
    const heapLimitMb = Math.round(v8.getHeapStatistics().heap_size_limit / 1024 / 1024);
    const heapPressure = mem.heapUsed / v8.getHeapStatistics().heap_size_limit;
    if (heapPressure > 0.75) {
      logPerf("WARN", "High heap pressure detected", {
        heapUsedMb,
        heapTotalMb,
        heapLimitMb,
        heapPressure: Math.round(heapPressure * 100) + "%",
        rssMb,
      });
    } else if (rssMb > 900) {
      logPerf("WARN", "High RSS memory detected", { rssMb, heapUsedMb, heapLimitMb });
    }
    // Alerte RAM système < 10%
    const freeRatio = os.freemem() / os.totalmem();
    if (freeRatio < 0.1) {
      logPerf("WARN", "Low system memory", {
        freeMb: Math.round(os.freemem() / 1024 / 1024),
        totalMb: Math.round(os.totalmem() / 1024 / 1024),
        freeRatio: Math.round(freeRatio * 100) + "%",
      });
    }
  }, intervalMs);
  if (monitorTimer && typeof monitorTimer === "object" && "unref" in monitorTimer) {
    (monitorTimer as any).unref();
  }
}

export function stopPerformanceMonitor() {
  if (monitorTimer) {
    clearInterval(monitorTimer);
    monitorTimer = null;
  }
}

// ── Express Middleware de chronométrage ───────────────────────────────────────

export const requestTimingMiddleware: express.RequestHandler = (req, res, next) => {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    recordRequest({
      route: req.route?.path || req.path,
      method: req.method,
      status: res.statusCode,
      durationMs: Math.round(durationMs * 10) / 10,
    });
    // Log les requêtes lentes (> 1s)
    if (durationMs > 1000) {
      logPerf("WARN", "Slow request detected", {
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs: Math.round(durationMs),
      });
    }
  });
  next();
};
