import assert from "node:assert/strict";
import fs from "node:fs";
import { shouldRunStartupMaintenancePurge } from "../src/startup-maintenance";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("hostinger-resource-usage", () => {
  const dbSource = fs.readFileSync("src/db.ts", "utf8");
  const auditSource = fs.readFileSync("src/audit-log-service.ts", "utf8");
  const refreshTokenSource = fs.readFileSync("src/auth-token-cleanup.ts", "utf8");
  const hostingerEnvSource = fs.readFileSync("scripts/build-hostinger-env.mjs", "utf8");
  const hostingerDocSource = fs.readFileSync("docs/HOSTINGER-HPANEL.md", "utf8");

  assert.match(dbSource, /const defaultPoolMax = isHostinger \? 2 : 5/);
  assert.match(auditSource, /shouldRunStartupMaintenancePurge/);
  assert.match(auditSource, /Audit log startup purge skipped on Hostinger Web App/);
  assert.match(refreshTokenSource, /shouldRunStartupMaintenancePurge/);
  assert.match(refreshTokenSource, /Refresh token startup purge skipped on Hostinger Web App/);
  assert.match(hostingerEnvSource, /RUN_STARTUP_PURGES:\s*"false"/);
  assert.match(hostingerEnvSource, /DATABASE_POOL_MAX:\s*"2"/);
  assert.match(hostingerDocSource, /RUN_STARTUP_PURGES/);
  assert.match(hostingerDocSource, /DATABASE_POOL_MAX`\s*\|\s*`2`/);

  const originalHostinger = process.env.HOSTINGER_WEBAPP;
  const originalStartupPurges = process.env.RUN_STARTUP_PURGES;

  try {
    process.env.HOSTINGER_WEBAPP = "1";
    delete process.env.RUN_STARTUP_PURGES;
    assert.equal(shouldRunStartupMaintenancePurge(), false);

    process.env.RUN_STARTUP_PURGES = "true";
    assert.equal(shouldRunStartupMaintenancePurge(), true);

    process.env.RUN_STARTUP_PURGES = "false";
    assert.equal(shouldRunStartupMaintenancePurge(), false);

    delete process.env.HOSTINGER_WEBAPP;
    delete process.env.RUN_STARTUP_PURGES;
    assert.equal(shouldRunStartupMaintenancePurge(), true);
  } finally {
    if (originalHostinger === undefined) delete process.env.HOSTINGER_WEBAPP;
    else process.env.HOSTINGER_WEBAPP = originalHostinger;

    if (originalStartupPurges === undefined) delete process.env.RUN_STARTUP_PURGES;
    else process.env.RUN_STARTUP_PURGES = originalStartupPurges;
  }
});
