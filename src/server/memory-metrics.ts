import v8 from "node:v8";
import { cacheSize, getCacheStats } from "../cache";
import { getAuthUserCacheStats } from "./auth-user-cache";
import { getRouteStats } from "../performance";

export interface RuntimeMemoryMetrics {
  timestamp: string;
  uptimeSec: number;
  heapUsedMb: number;
  heapTotalMb: number;
  heapLimitMb: number;
  rssMb: number;
  externalMb: number;
  arrayBuffersMb: number;
  heapPressurePercent: number;
  cache: ReturnType<typeof getCacheStats>;
  authUserCache: ReturnType<typeof getAuthUserCacheStats>;
  trackedRoutes: number;
}

function toMb(bytes: number): number {
  return Math.round((bytes / 1024 / 1024) * 10) / 10;
}

export function collectRuntimeMemoryMetrics(): RuntimeMemoryMetrics {
  const mem = process.memoryUsage();
  const heapLimit = v8.getHeapStatistics().heap_size_limit;
  const heapPressure = heapLimit > 0 ? mem.heapUsed / heapLimit : 0;

  return {
    timestamp: new Date().toISOString(),
    uptimeSec: Math.round(process.uptime()),
    heapUsedMb: toMb(mem.heapUsed),
    heapTotalMb: toMb(mem.heapTotal),
    heapLimitMb: toMb(heapLimit),
    rssMb: toMb(mem.rss),
    externalMb: toMb(mem.external),
    arrayBuffersMb: toMb(mem.arrayBuffers ?? 0),
    heapPressurePercent: Math.round(heapPressure * 1000) / 10,
    cache: getCacheStats(),
    authUserCache: getAuthUserCacheStats(),
    trackedRoutes: Object.keys(getRouteStats()).length,
  };
}
