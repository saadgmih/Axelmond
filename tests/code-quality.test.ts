import assert from "node:assert/strict";
import fs from "node:fs";
import { readApiRouteSources } from "./helpers/api-route-sources.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("code-quality", () => {
  const routeSources = readApiRouteSources();
  const routeTypes = fs.readFileSync("src/server/route-types.ts", "utf8");
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));

  assert.match(routeTypes, /export function getAuthUser/);
  assert.match(routeTypes, /export interface AuthenticatedRequest/);
  assert.doesNotMatch(routeSources, /\(req as any\)\.authUser/);

  assert.ok(fs.existsSync(".prettierrc.json"));
  assert.ok(fs.existsSync("eslint.config.js"));
  assert.ok(fs.existsSync("src/hooks/useInView.ts"));
  assert.equal(
    packageJson.scripts["format:check"],
    'prettier --check "src/**/*.{ts,tsx}" "tests/**/*.{ts,tsx}" server.ts vite.config.ts vitest.config.ts .github/**/*.yml',
  );
  assert.equal(packageJson.scripts["lint:eslint"], "eslint . --max-warnings 0");
  assert.equal(packageJson.scripts["lint:eslint:fix"], "eslint . --max-warnings 9999 --fix");
  assert.equal(packageJson.scripts["fix:eslint-unused"], "node scripts/fix-eslint-unused.mjs");

  const harness = fs.readFileSync("tests/helpers/security-runtime-harness.ts", "utf8");
  assert.match(harness, /skipSecurityRuntimeTests/);

  for (const name of fs.readdirSync("tests")) {
    if (!name.endsWith(".test.ts")) continue;
    const source = fs.readFileSync(`tests/${name}`, "utf8");
    assert.doesNotMatch(source, /process\.exit\(0\)/, `${name} must not terminate the process on skip`);
  }
});
