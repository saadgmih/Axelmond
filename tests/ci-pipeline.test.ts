import assert from "node:assert/strict";
import fs from "node:fs";

import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("ci-pipeline", () => {
  const workflow = fs.readFileSync(".github/workflows/ci.yml", "utf8");
  const postgresRunner = fs.readFileSync("scripts/run-ci-with-postgres.mjs", "utf8");
  const postgresLauncher = fs.readFileSync("scripts/start-ci-postgres.mjs", "utf8");
  const pipeline = `${workflow}\n${postgresRunner}`;

  assert.match(workflow, /actions\/checkout@v5/);
  assert.match(workflow, /actions\/setup-node@v5/);
  assert.match(workflow, /runs-on:\s*windows-latest/);
  assert.doesNotMatch(workflow, /runs-on:\s*\[self-hosted/);
  assert.match(workflow, /package-manager-cache:\s*false/);
  assert.doesNotMatch(workflow, /^\s*cache:\s*npm/m);
  assert.match(workflow, /npm ci/);
  assert.match(workflow, /SKIP_PRISMA_POSTINSTALL:\s*"1"/);
  assert.match(pipeline, /"lint"/);
  assert.match(pipeline, /"lint:strict"/);
  assert.match(pipeline, /"lint:eslint"/);
  assert.match(pipeline, /"format:check"/);
  assert.match(pipeline, /"test:static"/);
  assert.match(pipeline, /"test:unit"/);
  assert.match(pipeline, /"prisma", "migrate", "deploy"/);
  assert.match(pipeline, /"test:security-runtime"/);
  assert.match(pipeline, /"test:mobile-runtime"/);
  assert.match(pipeline, /"test:coverage"/);
  assert.match(pipeline, /"test:summary"/);
  assert.match(pipeline, /"build"/);
  assert.match(pipeline, /ci:performance|check-performance-budget/);
  assert.match(pipeline, /"audit", "--audit-level=high"/);
  assert.match(pipeline, /ci:secrets|scan-secrets/);
  assert.match(pipeline, /ci:migrations|check-migrations-ci/);
  assert.match(workflow, /Verify with CI PostgreSQL/);
  assert.match(workflow, /scripts\/run-ci-with-postgres\.mjs/);
  assert.match(postgresRunner, /scripts\/start-ci-postgres\.mjs/);
  assert.match(workflow, /embedded-postgres@18\.4\.0-beta\.17/);
  assert.match(workflow, /npm install --prefix \$env:CI_POSTGRES_MODULE_DIR --no-save --package-lock=false/);
  assert.match(workflow, /Configure CI PostgreSQL paths/);
  assert.match(workflow, /\$basePath = Join-Path \$env:RUNNER_TEMP \$instanceName/);
  assert.match(workflow, /CI_POSTGRES_MODULE_DIR=\$\{basePath\}\.tools/);
  assert.match(workflow, /CI_POSTGRES_DATA_DIR=\$basePath/);
  assert.match(workflow, /GITHUB_ENV/);
  assert.doesNotMatch(workflow, /CI_POSTGRES_(?:DATA_DIR|MODULE_DIR):\s*\$\{\{ runner\.temp/);
  assert.match(postgresRunner, /spawn\(process\.execPath, \["scripts\/start-ci-postgres\.mjs"\]/);
  assert.match(postgresRunner, /finally\s*\{[\s\S]*await stopPostgres/);
  assert.match(workflow, /CI_PREFLIGHT_DATABASE_URL: .*sslmode=require/);
  assert.match(postgresRunner, /CI_PREFLIGHT_\$\{name\}/);
  assert.match(postgresLauncher, /persistent: true/);
  assert.match(workflow, /Clean CI PostgreSQL[\s\S]*if:\s*always\(\)/);
  assert.match(workflow, /127\.0\.0\.1:5432[^\s]*sslmode=disable/);

  const installIndex = workflow.indexOf("Install dependencies");
  const generateIndex = workflow.indexOf("Generate Prisma client");
  const postgresIndex = workflow.indexOf("Verify with CI PostgreSQL");
  const migrateIndex = postgresRunner.indexOf("Apply Prisma migrations");
  const databaseBackedTestIndex = postgresRunner.indexOf("Security runtime tests");
  assert.ok(installIndex >= 0 && generateIndex > installIndex, "Prisma generation must run after npm ci");
  assert.ok(generateIndex < postgresIndex, "Prisma generation must run before validation");
  assert.ok(postgresIndex > generateIndex, "CI PostgreSQL must start after dependencies are installed");
  assert.ok(
    migrateIndex >= 0 && migrateIndex < databaseBackedTestIndex,
    "Migrations must run before database-backed tests",
  );

  assert.ok(fs.existsSync("scripts/start-ci-postgres.mjs"), "CI PostgreSQL launcher is required");
  assert.ok(fs.existsSync("scripts/run-ci-with-postgres.mjs"), "CI PostgreSQL supervisor is required");

  assert.ok(fs.existsSync("Dockerfile"), "Dockerfile required for container deploys");
  assert.ok(fs.existsSync(".dockerignore"), ".dockerignore keeps build context lean");

  console.log("CI pipeline guard tests passed");
});
