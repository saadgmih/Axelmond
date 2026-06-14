import assert from "node:assert/strict";
import fs from "node:fs";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("route-deps-modular", () => {
  const routeDeps = fs.readFileSync("src/server/route-deps.ts", "utf8");

  assert.match(routeDeps, /from "\.\/route-loggers"/);
  assert.match(routeDeps, /from "\.\/route-ownership"/);
  assert.match(routeDeps, /from "\.\/route-types"/);
  assert.ok(fs.existsSync("src/server/route-loggers.ts"));
  assert.ok(fs.existsSync("src/server/route-ownership.ts"));
  assert.ok(fs.existsSync("src/server/route-types.ts"));

  const lineCount = routeDeps.split("\n").length;
  assert.ok(lineCount <= 1200, `route-deps.ts still ${lineCount} lines — continue splitting schemas/live helpers`);
});
