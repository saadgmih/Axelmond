import assert from "node:assert/strict";
import fs from "node:fs";
import { rulesTest } from "./helpers/rulesTest.ts";
import { matchChainedCall } from "./helpers/source-patterns.ts";

rulesTest("session-storage-policy", () => {
  const sessionSource = fs.readFileSync("src/hooks/useAppSession.ts", "utf8");
  const apiSource = fs.readFileSync("src/api.ts", "utf8");
  const storageSource = fs.readFileSync("src/session-storage.ts", "utf8");

  assert.doesNotMatch(sessionSource, /localStorage\.setItem\(\s*["']axelmond_session_user["']/);
  assert.doesNotMatch(sessionSource, /localStorage\.getItem\(\s*["']axelmond_session_user["']/);
  assert.ok(matchChainedCall(sessionSource, "api", "me"));
  assert.match(sessionSource, /purgeLegacySessionUserStorage/);
  assert.match(sessionSource, /useState<AppUser \| null>\(null\)/);

  assert.match(apiSource, /purgeLegacySessionUserStorage/);
  assert.match(storageSource, /LEGACY_SESSION_USER_KEY/);
});
