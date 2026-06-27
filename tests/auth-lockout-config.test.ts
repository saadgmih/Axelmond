import assert from "node:assert/strict";
import {
  LOGIN_LOCKOUT_MAX_ATTEMPTS,
  LOGIN_LOCKOUT_WINDOW_MS,
  LOGIN_LOCKOUT_WINDOW_SECONDS,
  getLoginLockoutMaxAttempts,
  getLoginLockoutWindowMs,
  getLoginLockoutWindowSeconds,
} from "../src/auth-lockout-config.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("auth-lockout-config", () => {
  const originalMax = process.env.AUTH_MAX_ATTEMPTS;
  const originalWindow = process.env.AUTH_LOCKOUT_WINDOW_MS;
  const originalRuntimeTest = process.env.SECURITY_RUNTIME_TEST;

  delete process.env.AUTH_MAX_ATTEMPTS;
  delete process.env.AUTH_LOCKOUT_WINDOW_MS;
  delete process.env.SECURITY_RUNTIME_TEST;

  assert.equal(LOGIN_LOCKOUT_MAX_ATTEMPTS, 10);
  assert.equal(LOGIN_LOCKOUT_WINDOW_MS, 30_000);
  assert.equal(LOGIN_LOCKOUT_WINDOW_SECONDS, 30);
  assert.equal(getLoginLockoutMaxAttempts(), 10);
  assert.equal(getLoginLockoutWindowMs(), 30_000);
  assert.equal(getLoginLockoutWindowSeconds(), 30);

  process.env.SECURITY_RUNTIME_TEST = "1";
  process.env.AUTH_MAX_ATTEMPTS = "5";
  process.env.AUTH_LOCKOUT_WINDOW_MS = "10000";
  assert.equal(getLoginLockoutMaxAttempts(), 5);
  assert.equal(getLoginLockoutWindowMs(), 10_000);

  if (originalMax === undefined) delete process.env.AUTH_MAX_ATTEMPTS;
  else process.env.AUTH_MAX_ATTEMPTS = originalMax;
  if (originalWindow === undefined) delete process.env.AUTH_LOCKOUT_WINDOW_MS;
  else process.env.AUTH_LOCKOUT_WINDOW_MS = originalWindow;
  if (originalRuntimeTest === undefined) delete process.env.SECURITY_RUNTIME_TEST;
  else process.env.SECURITY_RUNTIME_TEST = originalRuntimeTest;
});
