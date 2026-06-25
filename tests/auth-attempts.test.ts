import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readApiRouteSources, readServerBootstrapSources } from "./helpers/api-route-sources.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("auth-attempts", () => {
  const bootstrapSource = readServerBootstrapSources();
  const apiSource = readApiRouteSources();
  const authScreenSource = readFileSync("src/components/AuthScreen.tsx", "utf-8");
  const lockoutSource = readFileSync("src/auth-login-lockout.ts", "utf-8");

  assert.match(bootstrapSource, /getLoginLockoutMaxAttempts\(\)/);
  assert.match(
    bootstrapSource,
    /getLoginLockoutWindowMs\(\)/,
  );
  assert.match(bootstrapSource, /app\.use\("\/api\/auth\/register", authRateLimiter\)/);
  assert.doesNotMatch(bootstrapSource, /app\.use\("\/api\/auth\/login", authRateLimiter\)/);

  assert.match(apiSource, /\/api\/auth\/login-status/);
  assert.match(apiSource, /recordEmailLoginFailure/);
  assert.match(apiSource, /sendLoginLockoutResponse/);
  assert.match(lockoutSource, /getLoginLockoutMaxAttempts/);

  assert.match(authScreenSource, /getLoginLockoutStatus/);
  assert.match(authScreenSource, /maxAttempts = 10/);
  assert.match(authScreenSource, /lockoutWindowSeconds = 20/);
  assert.match(authScreenSource, /axelmond-auth-lockout/);
});
