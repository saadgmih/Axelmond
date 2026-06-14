import assert from "node:assert/strict";import fs from "node:fs";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("ci-pipeline", () => {
const workflow = fs.readFileSync(".github/workflows/ci.yml", "utf8");

assert.match(workflow, /npm ci/);
assert.match(workflow, /npm run lint/);
assert.match(workflow, /npm test/);
assert.match(workflow, /npm run build/);
assert.match(workflow, /npm audit/);
assert.match(workflow, /ci:secrets|scan-secrets/);
assert.match(workflow, /ci:migrations|check-migrations-ci/);
assert.match(workflow, /postgres:/);

assert.ok(fs.existsSync("Dockerfile"), "Dockerfile required for container deploys");
assert.ok(fs.existsSync(".dockerignore"), ".dockerignore keeps build context lean");

});
