import assert from "node:assert/strict";
import fs from "node:fs";
import { getAuthMaxAttempts, getAuthLockoutWindowMs } from "../src/security-hardening.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("account-lockout", () => {
  assert.equal(getAuthMaxAttempts({ AUTH_MAX_ATTEMPTS: "5" }), 5);
  assert.equal(getAuthMaxAttempts({ AUTH_MAX_ATTEMPTS: "invalid" }), 20);
  assert.equal(getAuthMaxAttempts({}), 20);

  assert.equal(getAuthLockoutWindowMs({ AUTH_LOCKOUT_WINDOW_MS: "120000" }), 120000);
  assert.equal(getAuthLockoutWindowMs({ AUTH_LOCKOUT_WINDOW_MS: "0" }), 60000);
  assert.equal(getAuthLockoutWindowMs({}), 60000);

  const loginRoutesSource = fs.readFileSync("src/routes/auth/register-login-routes.ts", "utf8");
  assert.match(loginRoutesSource, /user\.lockoutUntil/);
  assert.match(loginRoutesSource, /ACCOUNT_LOCKED/);
  assert.match(loginRoutesSource, /getAuthMaxAttempts/);
  assert.match(loginRoutesSource, /getAuthLockoutWindowMs/);

  const authSessionSource = fs.readFileSync("src/auth-session.ts", "utf8");
  assert.match(authSessionSource, /lockoutUntil:\s*null/);

  const passwordRoutesSource = fs.readFileSync("src/routes/auth/password-routes.ts", "utf8");
  assert.match(passwordRoutesSource, /lockoutUntil:\s*null/);

  console.log("Account lockout rules passed");
});
