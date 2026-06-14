import assert from "node:assert/strict";
import fs from "node:fs";
import {
  auditLogSnapshot,
  buildAuditLogCsv,
  getAuditLogRetentionDays,
  parseAuditLogDate,
  purgeExpiredAuditLogs,
  startAuditLogRetention,
} from "../src/audit-log-service.ts";
import { readApiRouteSources } from "./helpers/api-route-sources.ts";
import { readServerBootstrapSources } from "./helpers/api-route-sources.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("audit-log-retention", () => {
  const adminRoutesSource = fs.readFileSync("src/routes/admin-routes.ts", "utf8");
  const auditServiceSource = fs.readFileSync("src/audit-log-service.ts", "utf8");
  const bootstrapSource = readServerBootstrapSources();

  assert.match(auditServiceSource, /purgeExpiredAuditLogs/);
  assert.match(auditServiceSource, /startAuditLogRetention/);
  assert.match(auditServiceSource, /AUDIT_LOG_RETENTION_DAYS/);
  assert.match(auditServiceSource, /fetchAuditLogsForExport/);
  assert.match(auditServiceSource, /buildAuditLogCsv/);

  assert.match(adminRoutesSource, /\/api\/admin\/audit-logs"/);
  assert.match(adminRoutesSource, /\/api\/admin\/audit-logs\/export"/);
  assert.match(bootstrapSource, /startAuditLogRetention\(\)/);

  assert.equal(getAuditLogRetentionDays(), 365);
  assert.equal(parseAuditLogDate("2026-01-15T00:00:00.000Z")?.toISOString(), "2026-01-15T00:00:00.000Z");
  assert.equal(parseAuditLogDate("not-a-date"), undefined);

  const snapshot = auditLogSnapshot({
    id: "log-1",
    userId: "user-1",
    userEmail: "admin@example.com",
    action: "LOGIN",
    resource: "User",
    resourceId: "user-1",
    details: { ok: true },
    ip: "127.0.0.1",
    createdAt: new Date("2026-01-15T12:00:00.000Z"),
  });
  assert.equal(snapshot.action, "LOGIN");

  const csv = buildAuditLogCsv([snapshot]);
  assert.match(csv, /^id,createdAt,userId,userEmail,action,resource,resourceId,ip,details/);
  assert.match(csv, /LOGIN/);

  assert.equal(typeof purgeExpiredAuditLogs, "function");
  assert.equal(typeof startAuditLogRetention, "function");

  const routeSources = readApiRouteSources();
  assert.match(routeSources, /\/api\/admin\/audit-logs/);
});
