import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readApiRouteSources } from "./helpers/api-route-sources.ts";
import {
  EMAIL_VERIFICATION_MAX_ATTEMPTS,
  buildEmailVerificationExpiry,
  generateEmailVerificationCode,
  hashEmailVerificationCode,
  isDevVerificationCodeLogEnabled,
  isEmailVerificationExpired,
  maskEmailForDevLog,
  normalizeEmailVerificationCode,
  canAttemptEmailVerification,
} from "../src/email-verification.ts";

const schemaSource = readFileSync("prisma/schema.prisma", "utf8");
const serverSource = readApiRouteSources();

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

assert.equal(isDevVerificationCodeLogEnabled({ ALLOW_DEV_VERIFICATION_CODE_LOG: "true" }), true);
assert.equal(isDevVerificationCodeLogEnabled({ ALLOW_DEV_VERIFICATION_CODE_LOG: "false" }), false);
assert.equal(maskEmailForDevLog("student@example.com"), "s***@example.com");
assert.doesNotMatch(serverSource, /Code de vérification pour \$\{user\.email\}\s*:\s*\$\{code\}/);
assert.doesNotMatch(serverSource, /Code de réinitialisation pour \$\{user\.email\}\s*:\s*\$\{code\}/);

assert.match(schemaSource, /enum EmailVerificationPurpose/);
assert.match(schemaSource, /EMAIL_VERIFY/);
assert.match(schemaSource, /PASSWORD_RESET/);
assert.match(schemaSource, /purpose\s+EmailVerificationPurpose\s+@default\(EMAIL_VERIFY\)/);

console.log("Email verification rules passed");
