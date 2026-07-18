import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("service-worker", () => {
  const source = readFileSync("public/sw.js", "utf8");
  assert.match(source, /STATIC_CACHE/);
  assert.match(source, /performance-academique-static-v7/);
  assert.match(source, /isVersionedAsset/);
  assert.match(source, /const response = await fetch\(event\.request\)/);
  assert.doesNotMatch(source, /if \(cached\) return cached;\s*\n\s*const response/);
  assert.doesNotMatch(source, /performance-academique-static-v6/);
  assert.match(source, /performance-logo-e6657b8a\.png/);
  assert.doesNotMatch(source, /performance-logo-3d-symbol\.png|performance-logo-3d\.png/);
  assert.doesNotMatch(source, /favicon-3d\.ico/);
  assert.doesNotMatch(source, /performance-logo-symbol\.png|performance-logo\.png|performance-academique-static-v2/);
  assert.match(source, /isCacheableStaticRequest/);
  assert.match(source, /url\.pathname\.startsWith\("\/api\/"\)/);
  assert.match(source, /request\.headers\.has\("authorization"\)/);
  assert.match(source, /pdf\|mp4\|webm\|mov/);
  assert.match(source, /"video", "audio", "document"/);
  assert.match(source, /isUnexpectedHtml/);
  assert.match(source, /url\.pathname\.startsWith\("\/assets\/"\)/);
  assert.match(source, /sanitizeNotificationUrl/);
  assert.match(source, /url\.origin !== self\.location\.origin/);
});
