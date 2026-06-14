import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("migration-policy", () => {
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8")) as {
    scripts?: Record<string, string>;
  };

  assert.ok(
    fs.existsSync("docs/MIGRATIONS-RUNBOOK.md"),
    "docs/MIGRATIONS-RUNBOOK.md must document baselining and forbid manual migrations",
  );
  const runbook = fs.readFileSync("docs/MIGRATIONS-RUNBOOK.md", "utf8");
  assert.match(runbook, /migrate deploy/i);
  assert.match(runbook, /baselin/i);
  assert.match(runbook, /Interdit|interdit/);

  const deployScript = fs.readFileSync("scripts/deploy-hostinger.sh", "utf8");
  assert.match(deployScript, /prisma migrate deploy/);
  assert.doesNotMatch(deployScript, /apply-messaging-notifications-migration/);
  assert.doesNotMatch(deployScript, /apply-user-auth-migration/);

  assert.equal(
    packageJson.scripts?.["deploy:migrate"],
    "prisma migrate deploy",
    "deploy:migrate must be the only production migration entrypoint",
  );
  assert.equal(packageJson.scripts?.["deploy:migrate-messaging"], undefined);

  const activeScriptsDir = path.join("scripts");
  const forbiddenInActive = [];
  for (const name of fs.readdirSync(activeScriptsDir)) {
    if (!name.endsWith(".mjs") && !name.endsWith(".sh")) continue;
    if (name.startsWith("check-") || name.startsWith("report-")) continue;
    const full = path.join(activeScriptsDir, name);
    if (!fs.statSync(full).isFile()) continue;
    const source = fs.readFileSync(full, "utf8");
    if (/apply-.*-migration\.mjs/i.test(name) || /INSERT INTO.*_prisma_migrations/i.test(source)) {
      forbiddenInActive.push(name);
    }
  }
  assert.equal(
    forbiddenInActive.length,
    0,
    `Active scripts must not run manual migrations: ${forbiddenInActive.join(", ")}`,
  );

  assert.ok(
    fs.existsSync("scripts/archive/apply-messaging-notifications-migration.mjs"),
    "legacy messaging runner must stay archived, not deleted without trace",
  );

  const dropInvoicesMigration = fs.readFileSync(
    "prisma/migrations/20260615100000_drop_user_invoices_json/migration.sql",
    "utf8",
  );
  assert.match(dropInvoicesMigration, /"AxelmondResearchLab"\."User"/);

  const catalogIndexesMigration = fs.readFileSync(
    "prisma/migrations/20260615110000_catalog_enrollment_live_indexes/migration.sql",
    "utf8",
  );
  assert.match(catalogIndexesMigration, /Course_published_idx/);
  assert.match(catalogIndexesMigration, /Enrollment_courseId_active_idx/);
});
