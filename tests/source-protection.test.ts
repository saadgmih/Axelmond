import assert from "node:assert/strict";
import fs from "node:fs";
import { readApiRouteSources } from "./helpers/api-route-sources.ts";
import { isBlockedProductionSourcePath } from "../src/static-source-guard.ts";

import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("source-protection", () => {
  const viteConfig = fs.readFileSync("vite.config.ts", "utf8");
  const serverSource = readApiRouteSources();
  const mainSource = fs.readFileSync("src/main.tsx", "utf8");

  assert.equal(isBlockedProductionSourcePath("/src/main.tsx"), true);
  assert.equal(isBlockedProductionSourcePath("/src/App.tsx"), true);
  assert.equal(isBlockedProductionSourcePath("/assets/index-abc123.js.map"), true);
  assert.equal(isBlockedProductionSourcePath("/server.ts"), true);
  assert.equal(isBlockedProductionSourcePath("/package.json"), true);
  assert.equal(isBlockedProductionSourcePath("/node_modules/react/index.js"), true);
  assert.equal(isBlockedProductionSourcePath("/assets/a1b2c3.js"), false);
  assert.equal(isBlockedProductionSourcePath("/assets/a1b2c3.css"), false);
  assert.equal(isBlockedProductionSourcePath("/"), false);

  assert.match(viteConfig, /sourcemap:\s*false/);
  assert.match(viteConfig, /minify:\s*"oxc"/);
  assert.doesNotMatch(viteConfig, /drop:\s*.*\["console",\s*"debugger"\]/);
  assert.match(viteConfig, /entryFileNames:\s*"assets\/\[hash\]\.js"/);

  assert.match(serverSource, /isBlockedProductionSourcePath/);
  assert.match(serverSource, /dotfiles:\s*"deny"/);
  assert.match(serverSource, /X-Content-Type-Options/);

  assert.doesNotMatch(mainSource, /production-shield/);
  assert.equal(fs.existsSync("src/production-shield.ts"), false);

  console.log("Source protection rules passed");
});
