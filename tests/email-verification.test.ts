import assert from "node:assert/strict";
import {
  EMAIL_VERIFICATION_MAX_ATTEMPTS,
  buildEmailVerificationExpiry,
  generateEmailVerificationCode,
  hashEmailVerificationCode,
  isEmailVerificationExpired,
  normalizeEmailVerificationCode,
  canAttemptEmailVerification,
} from "../src/email-verification.ts";

const code = generateEmailVerificationCode();
assert.match(code, /^\d{6}$/);

assert.equal(normalizeEmailVerificationCode(" 12 34-56 "), "123456");
assert.equal(normalizeEmailVerificationCode("abc"), "");

const hash = hashEmailVerificationCode("123456", "test-secret");
assert.notEqual(hash, "123456");
assert.equal(hash, hashEmailVerificationCode("123456", "test-secret"));
assert.notEqual(hash, hashEmailVerificationCode("654321", "test-secret"));

const now = new Date("2026-05-31T10:00:00.000Z");
const expiresAt = buildEmailVerificationExpiry(now);
assert.equal(expiresAt.getTime(), now.getTime() + 15 * 60 * 1000);
assert.equal(isEmailVerificationExpired(expiresAt, new Date("2026-05-31T10:14:59.000Z")), false);
assert.equal(isEmailVerificationExpired(expiresAt, new Date("2026-05-31T10:15:00.000Z")), true);

assert.equal(EMAIL_VERIFICATION_MAX_ATTEMPTS, 5);
assert.equal(canAttemptEmailVerification(0), true);
assert.equal(canAttemptEmailVerification(4), true);
assert.equal(canAttemptEmailVerification(5), false);

console.log("Email verification rules passed");
