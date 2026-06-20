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
  assert.match(workflow, /postgres:/);

  const installIndex = workflow.indexOf("Install dependencies");
  const generateIndex = workflow.indexOf("Generate Prisma client");
  const lintIndex = workflow.indexOf("- name: Lint");
  assert.ok(installIndex >= 0 && generateIndex > installIndex, "Prisma generation must run after npm ci");
  assert.ok(generateIndex < lintIndex, "Prisma generation must run before lint");

  assert.ok(fs.existsSync("Dockerfile"), "Dockerfile required for container deploys");
  assert.ok(fs.existsSync(".dockerignore"), ".dockerignore keeps build context lean");

  console.log("CI pipeline guard tests passed");
});
