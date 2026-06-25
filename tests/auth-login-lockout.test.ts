import assert from "node:assert/strict";
import {
  clearEmailLoginLockout,
  getEmailLoginLockoutStatus,
  recordEmailLoginFailure,
  resetEmailLoginLockoutsForTests,
} from "../src/auth-login-lockout.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("auth-login-lockout", () => {
  const originalMax = process.env.AUTH_MAX_ATTEMPTS;
  const originalWindow = process.env.AUTH_LOCKOUT_WINDOW_MS;
  process.env.AUTH_MAX_ATTEMPTS = "10";
  process.env.AUTH_LOCKOUT_WINDOW_MS = "20000";
  resetEmailLoginLockoutsForTests();

  try {

  assert.equal(getEmailLoginLockoutStatus("user@test.axelmond.local").locked, false);

  for (let i = 0; i < 9; i += 1) {
    const status = recordEmailLoginFailure("user@test.axelmond.local");
    assert.equal(status.locked, false, `attempt ${i + 1} should not lock`);
  }

  const locked = recordEmailLoginFailure("user@test.axelmond.local");
  assert.equal(locked.locked, true);
  assert.equal(locked.maxAttempts, 10);
  assert.equal(locked.lockoutWindowSeconds, 20);
  assert.ok(locked.retryAfter > 0 && locked.retryAfter <= 20);

  const stillLocked = getEmailLoginLockoutStatus("user@test.axelmond.local");
  assert.equal(stillLocked.locked, true);

  clearEmailLoginLockout("user@test.axelmond.local");
  assert.equal(getEmailLoginLockoutStatus("user@test.axelmond.local").locked, false);

  const dbLockout = new Date(Date.now() + 15_000);
  const merged = getEmailLoginLockoutStatus("db@test.axelmond.local", dbLockout);
  assert.equal(merged.locked, true);
  assert.ok(merged.retryAfter > 0 && merged.retryAfter <= 15);
  } finally {
    process.env.AUTH_MAX_ATTEMPTS = originalMax;
    process.env.AUTH_LOCKOUT_WINDOW_MS = originalWindow;
    resetEmailLoginLockoutsForTests();
  }
});
