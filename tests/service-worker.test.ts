import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("service-worker", () => {
  const source = readFileSync("public/sw.js", "utf8");
  assert.match(source, /STATIC_CACHE/);
  assert.match(source, /isCacheableStaticRequest/);
  assert.match(source, /url\.pathname\.startsWith\("\/api\/"\)/);
  assert.match(source, /url\.pathname\.startsWith\("\/assets\/"\)/);
  assert.match(source, /sanitizeNotificationUrl/);
  assert.match(source, /url\.origin !== self\.location\.origin/);
});
