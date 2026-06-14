import { prisma } from "./db";
import { logSecurity } from "./security-logger";

const DEFAULT_RETENTION_DAYS = 365;
const DEFAULT_PURGE_INTERVAL_MS = 24 * 60 * 60 * 1000;
const MAX_EXPORT_ROWS = 10_000;

export type AuditLogRecord = {
  id: string;
  userId: string | null;
  userEmail: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  details: unknown;
  ip: string | null;
  createdAt: Date;
};

export type AuditLogFilters = {
  limit?: number;
  cursor?: string;
  action?: string;
  userId?: string;
  since?: Date;
  until?: Date;
};

export function getAuditLogRetentionDays(): number {
  const raw = Number(process.env.AUDIT_LOG_RETENTION_DAYS);
  return Number.isInteger(raw) && raw > 0 ? raw : DEFAULT_RETENTION_DAYS;
}

export function getAuditLogPurgeIntervalMs(): number {
  const raw = Number(process.env.AUDIT_LOG_PURGE_INTERVAL_MS);
  return Number.isInteger(raw) && raw > 0 ? raw : DEFAULT_PURGE_INTERVAL_MS;
}

export function auditLogSnapshot(log: AuditLogRecord) {
  return {
    id: log.id,
    userId: log.userId,
    userEmail: log.userEmail,
    action: log.action,
    resource: log.resource,
    resourceId: log.resourceId,
    details: log.details ?? {},
    ip: log.ip,
    createdAt: log.createdAt?.toISOString?.() || log.createdAt,
  };
}

function buildAuditLogWhere(filters: Omit<AuditLogFilters, "limit" | "cursor">) {
  const where: {
    action?: string;
    userId?: string;
    createdAt?: { gte?: Date; lte?: Date };
  } = {};

  if (filters.action) where.action = filters.action;
  if (filters.userId) where.userId = filters.userId;
  if (filters.since || filters.until) {
    where.createdAt = {};
    if (filters.since) where.createdAt.gte = filters.since;
    if (filters.until) where.createdAt.lte = filters.until;
  }

  return where;
}

export async function listAuditLogs(filters: AuditLogFilters = {}) {
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200);
  const where = buildAuditLogWhere(filters);

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(filters.cursor
      ? {
          cursor: { id: filters.cursor },
          skip: 1,
        }
      : {}),
  });

  const hasMore = logs.length > limit;
  const items = hasMore ? logs.slice(0, limit) : logs;

  return {
    items,
    nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null,
  };
}

export async function fetchAuditLogsForExport(filters: Omit<AuditLogFilters, "limit" | "cursor"> = {}) {
  return prisma.auditLog.findMany({
    where: buildAuditLogWhere(filters),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: MAX_EXPORT_ROWS,
  });
}

export function buildAuditLogCsv(logs: ReturnType<typeof auditLogSnapshot>[]) {
  const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const header = "id,createdAt,userId,userEmail,action,resource,resourceId,ip,details";
  const rows = logs.map((log) => [
    log.id,
    log.createdAt,
    log.userId ?? "",
    log.userEmail ?? "",
    log.action,
    log.resource,
    log.resourceId ?? "",
    log.ip ?? "",
    escapeCsv(JSON.stringify(log.details ?? {})),
  ].join(","));

  return [header, ...rows].join("\n");
}

export async function purgeExpiredAuditLogs() {
  const retentionDays = getAuditLogRetentionDays();
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const result = await prisma.auditLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });

  if (result.count > 0) {
    logSecurity("INFO", "Purged expired audit logs", {
      count: result.count,
      retentionDays,
      cutoff: cutoff.toISOString(),
    });
  }

  return result.count;
}

let purgeTimer: ReturnType<typeof setInterval> | null = null;

export function startAuditLogRetention() {
  if (purgeTimer) return;
  void purgeExpiredAuditLogs();
  purgeTimer = setInterval(() => {
    void purgeExpiredAuditLogs();
  }, getAuditLogPurgeIntervalMs());
  if (purgeTimer && typeof purgeTimer === "object" && "unref" in purgeTimer) {
    (purgeTimer as NodeJS.Timeout).unref();
  }
}

export function stopAuditLogRetention() {
  if (!purgeTimer) return;
  clearInterval(purgeTimer);
  purgeTimer = null;
}

export function parseAuditLogDate(value: unknown): Date | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}
