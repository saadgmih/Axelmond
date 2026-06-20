import assert from "node:assert/strict";
import fs from "node:fs";

import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("ci-pipeline", () => {
  const workflow = fs.readFileSync(".github/workflows/ci.yml", "utf8");

  assert.match(workflow, /npm ci/);
  assert.match(workflow, /SKIP_PRISMA_POSTINSTALL:\s*"1"/);
  assert.match(workflow, /npm run lint/);
  assert.match(workflow, /npm run lint:strict/);
  assert.match(workflow, /npm run lint:eslint/);
  assert.match(workflow, /npm run format:check/);
  assert.match(workflow, /npm test/);
  assert.match(workflow, /prisma migrate deploy/);
  assert.match(workflow, /npm run test:security-runtime/);
  assert.match(workflow, /npm run build/);
  assert.match(workflow, /npm audit/);
  assert.match(workflow, /ci:secrets|scan-secrets/);
  assert.match(workflow, /ci:migrations|check-migrations-ci/);
  assert.match(workflow, /Start CI PostgreSQL/);
  assert.match(workflow, /scripts\/start-ci-postgres\.mjs/);
  assert.match(workflow, /embedded-postgres@18\.4\.0-beta\.17/);
  assert.match(workflow, /npm install --prefix \$env:CI_POSTGRES_MODULE_DIR --no-save --package-lock=false/);
  assert.match(workflow, /Configure CI PostgreSQL paths/);
  assert.match(workflow, /\$basePath = Join-Path \$env:RUNNER_TEMP \$instanceName/);
  assert.match(workflow, /CI_POSTGRES_MODULE_DIR=\$\{basePath\}\.tools/);
  assert.match(workflow, /CI_POSTGRES_DATA_DIR=\$basePath/);
  assert.match(workflow, /GITHUB_ENV/);
  assert.doesNotMatch(workflow, /CI_POSTGRES_(?:DATA_DIR|MODULE_DIR):\s*\$\{\{ runner\.temp/);
  assert.match(workflow, /RUNNER_TRACKING_ID = "axelmond-postgres-\$\{\{ github\.run_id \}\}"/);
  assert.ok(
    workflow.indexOf("RUNNER_TRACKING_ID") < workflow.indexOf("Start-Process"),
    "The PostgreSQL process must be detached from runner cleanup before it starts",
  );
  assert.match(workflow, /Stop CI PostgreSQL[\s\S]*if:\s*always\(\)/);
  assert.match(workflow, /127\.0\.0\.1:5432[^\s]*sslmode=disable/);

  const installIndex = workflow.indexOf("Install dependencies");
  const generateIndex = workflow.indexOf("Generate Prisma client");
  const postgresIndex = workflow.indexOf("Start CI PostgreSQL");
  const migrateIndex = workflow.indexOf("Apply Prisma migrations");
  const testIndex = workflow.indexOf("- name: Test");
  const lintIndex = workflow.indexOf("- name: Lint");
  assert.ok(installIndex >= 0 && generateIndex > installIndex, "Prisma generation must run after npm ci");
  assert.ok(generateIndex < lintIndex, "Prisma generation must run before lint");
  assert.ok(postgresIndex > generateIndex, "CI PostgreSQL must start after dependencies are installed");
  assert.ok(
    migrateIndex > postgresIndex && migrateIndex < testIndex,
    "Migrations must run before database-backed tests",
  );

  assert.ok(fs.existsSync("scripts/start-ci-postgres.mjs"), "CI PostgreSQL launcher is required");

  assert.ok(fs.existsSync("Dockerfile"), "Dockerfile required for container deploys");
  assert.ok(fs.existsSync(".dockerignore"), ".dockerignore keeps build context lean");

  console.log("CI pipeline guard tests passed");
});
