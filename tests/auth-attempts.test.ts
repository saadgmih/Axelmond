import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readApiRouteSources, readServerBootstrapSources } from "./helpers/api-route-sources.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("auth-attempts", () => {
  const bootstrapSource = readServerBootstrapSources();
  const apiSource = readApiRouteSources();
  const authScreenSource = readFileSync("src/components/AuthScreen.tsx", "utf-8");

  assert.match(bootstrapSource, /app\.use\("\/api\/auth\/register", authRateLimiter\)/);
  assert.doesNotMatch(bootstrapSource, /app\.use\("\/api\/auth\/login", authRateLimiter\)/);
  assert.doesNotMatch(bootstrapSource, /getLoginLockout|AUTH_LOCKOUT|AUTH_MAX_ATTEMPTS/);

  assert.doesNotMatch(apiSource, /\/api\/auth\/login-status/);
  assert.doesNotMatch(apiSource, /loginLockoutStatusSchema/);
  assert.doesNotMatch(apiSource, /recordEmailLoginFailure/);
  assert.doesNotMatch(apiSource, /getAccountLoginLockoutStatus/);
  assert.doesNotMatch(apiSource, /buildAccountLoginFailureUpdate/);
  assert.doesNotMatch(apiSource, /sendLoginLockoutResponse/);
  assert.doesNotMatch(apiSource, /Auth account lockout applied/);
  assert.ok(
    apiSource.indexOf("if (!api.canLoginToRequestedRole(user.role, requestedRole))") <
      apiSource.indexOf("const isValidPassword = await api.bcrypt.compare(password, user.passwordHash)"),
    "role mismatch must be rejected before password verification",
  );

  assert.doesNotMatch(authScreenSource, /RateLimitBanner|rateLimitError|getLoginLockoutStatus/);
  assert.doesNotMatch(authScreenSource, /auth-rate-limit-banner|Accès temporairement suspendu/);
  assert.doesNotMatch(authScreenSource, /axelmond-auth-lockout|sessionStorage/);
});
