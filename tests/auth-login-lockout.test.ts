import assert from "node:assert/strict";
import {
  buildAccountLoginFailureUpdate,
  clearEmailLoginLockout,
  getAccountLoginLockoutStatus,
  getEmailLoginLockoutStatus,
  recordEmailLoginFailure,
  resetEmailLoginLockoutsForTests,
} from "../src/auth-login-lockout.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("auth-login-lockout", () => {
  const originalMax = process.env.AUTH_MAX_ATTEMPTS;
  const originalWindow = process.env.AUTH_LOCKOUT_WINDOW_MS;
  const originalRuntimeTest = process.env.SECURITY_RUNTIME_TEST;
  delete process.env.SECURITY_RUNTIME_TEST;
  process.env.AUTH_MAX_ATTEMPTS = "10";
  process.env.AUTH_LOCKOUT_WINDOW_MS = "30000";
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
    assert.equal(locked.lockoutWindowSeconds, 30);
    assert.ok(locked.retryAfter > 0 && locked.retryAfter <= 30);

    const stillLocked = getEmailLoginLockoutStatus("user@test.axelmond.local");
    assert.equal(stillLocked.locked, true);

    clearEmailLoginLockout("user@test.axelmond.local");
    assert.equal(getEmailLoginLockoutStatus("user@test.axelmond.local").locked, false);

    const dbLockout = new Date(Date.now() + 15_000);
    const merged = getAccountLoginLockoutStatus(dbLockout);
    assert.equal(merged.locked, true);
    assert.ok(merged.retryAfter > 0 && merged.retryAfter <= 15);

    const tenthAccountFailure = buildAccountLoginFailureUpdate(9, null);
    assert.equal(tenthAccountFailure.failedLoginAttempts, 10);
    assert.equal(tenthAccountFailure.status.locked, true);
    assert.equal(tenthAccountFailure.status.lockoutWindowSeconds, 30);
    assert.ok(tenthAccountFailure.lockoutUntil instanceof Date);
    assert.ok(tenthAccountFailure.status.retryAfter > 0 && tenthAccountFailure.status.retryAfter <= 30);

    const afterExpiredLockout = buildAccountLoginFailureUpdate(10, new Date(Date.now() - 1_000));
    assert.equal(afterExpiredLockout.failedLoginAttempts, 1);
    assert.equal(afterExpiredLockout.status.locked, false);
    assert.equal(afterExpiredLockout.lockoutUntil, null);
  } finally {
    if (originalMax === undefined) delete process.env.AUTH_MAX_ATTEMPTS;
    else process.env.AUTH_MAX_ATTEMPTS = originalMax;
    if (originalWindow === undefined) delete process.env.AUTH_LOCKOUT_WINDOW_MS;
    else process.env.AUTH_LOCKOUT_WINDOW_MS = originalWindow;
    if (originalRuntimeTest === undefined) delete process.env.SECURITY_RUNTIME_TEST;
    else process.env.SECURITY_RUNTIME_TEST = originalRuntimeTest;
    resetEmailLoginLockoutsForTests();
  }
});
