import assert from "node:assert/strict";
import fs from "node:fs";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("tsconfig-strict", () => {
  const strictConfig = JSON.parse(fs.readFileSync("tsconfig.strict.json", "utf8"));
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));

  assert.equal(strictConfig.compilerOptions.strict, true);
  assert.equal(strictConfig.compilerOptions.noImplicitAny, true);
  assert.deepEqual(strictConfig.include, ["src/**/*.ts", "src/**/*.tsx"]);
  assert.ok(!strictConfig.include?.includes("tests/**"), "strict check is scoped to src/ only for progressive rollout");

  assert.equal(packageJson.scripts["lint:strict"], "tsc -p tsconfig.strict.json --noEmit");
  assert.match(packageJson.scripts.ci, /lint:strict/);

  const workflow = fs.readFileSync(".github/workflows/ci.yml", "utf8");
  const postgresRunner = fs.readFileSync("scripts/run-ci-with-postgres.mjs", "utf8");
  assert.match(workflow, /scripts\/run-ci-with-postgres\.mjs/);
  assert.match(postgresRunner, /"run", "lint:strict"/);
});
