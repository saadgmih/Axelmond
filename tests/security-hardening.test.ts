import assert from "node:assert/strict";
import { readApiRouteSources } from "./helpers/api-route-sources.ts";
import fs from "node:fs";
import { hashRefreshToken } from "../src/security-hardening.ts";
import { canAccessApiRoute } from "../src/rbac.ts";

const serverSource = readApiRouteSources();
const authTokenSource = fs.readFileSync("src/auth-token.ts", "utf8");

assert.equal(hashRefreshToken("test-token-a"), hashRefreshToken("test-token-a"));
assert.notEqual(hashRefreshToken("test-token-a"), hashRefreshToken("test-token-b"));

assert.match(authTokenSource, /hashRefreshToken\(token\)/);
assert.match(authTokenSource, /findValidRefreshToken/);
assert.match(authTokenSource, /revokeAllUserRefreshTokens/);

assert.equal(canAccessApiRoute("STUDENT", "DELETE", "/api/admin/unknown-hacker-route"), false);
assert.equal(canAccessApiRoute("PROFESSOR", "POST", "/api/unknown-route"), false);

assert.match(serverSource, /app\.use\("\/api\/auth\/refresh",\s*refreshRateLimiter\)/);
assert.match(serverSource, /Refresh token reuse detected/);
assert.match(serverSource, /api\.verifyCourseAccess\(authUser,\s*course\.id\)/);
assert.match(serverSource, /app\.post\("\/api\/livekit\/messages",\s*requireAuth,\s*validateBody\(api\.liveMessageSchema\)/);
assert.match(serverSource, /app\.post\("\/api\/chat-tutor",\s*requireAuth,\s*validateBody\(api\.chatTutorSchema\)/);
assert.match(serverSource, /api\.generateChatTutorResponse/);
assert.doesNotMatch(serverSource, /GEMINI_API_KEY|GoogleGenAI|@google\/genai|gemini-/i);
assert.match(serverSource, /courseId:\s*z\.number\(\)\.int\(\)\.positive\(\)/);
assert.match(serverSource, /api\.assertCourseLearningAccess\(/);
assert.doesNotMatch(serverSource, /courseContext:\s*z\.string\(\)/);
assert.match(serverSource, /newPassword:\s*z\.string\(\)\.min\(8/);
assert.match(serverSource, /Refresh token reuse detected/);
assert.match(serverSource, /Permissions-Policy/);
assert.match(serverSource, /express\.json\(\{\s*limit:\s*JSON_BODY_LIMIT/);
assert.match(serverSource, /setAuthCookies/);
assert.match(serverSource, /csrfProtection/);

const paymentsRoutesSource = fs.readFileSync("src/routes/payments-routes.ts", "utf8");
const liveRoutesSource = fs.readFileSync("src/routes/live-routes.ts", "utf8");

assert.doesNotMatch(paymentsRoutesSource, /res\.status\(500\)\.json\(\{\s*error:\s*err\?\.message/);
assert.doesNotMatch(paymentsRoutesSource, /details:\s*String\(err/);
assert.match(paymentsRoutesSource, /logPayPalError\("PayPal create-order route failed"/);
assert.match(paymentsRoutesSource, /PUBLIC_API_ERRORS\.paypalCreateOrderFailed/);
assert.match(paymentsRoutesSource, /PUBLIC_API_ERRORS\.paypalCaptureFailed/);
assert.match(paymentsRoutesSource, /PUBLIC_API_ERRORS\.paymentServiceUnavailable/);
assert.doesNotMatch(paymentsRoutesSource, /Utilisateur non trouvé/);

assert.doesNotMatch(liveRoutesSource, /res\.status\([^)]+\)\.json\(\{[^}]*String\(err/);
assert.doesNotMatch(liveRoutesSource, /details:\s*String\(err\?\.message/);
assert.doesNotMatch(liveRoutesSource, /Configuration LiveKit/);
assert.match(liveRoutesSource, /PUBLIC_API_ERRORS\.liveActionFailed/);
assert.match(liveRoutesSource, /PUBLIC_API_ERRORS\.liveRelayFailed/);
assert.match(liveRoutesSource, /PUBLIC_API_ERRORS\.liveServiceUnavailable/);

assert.match(paymentsRoutesSource, /toPayPalCaptureClientResponse\(result\)/);
assert.doesNotMatch(paymentsRoutesSource, /error:\s*result\.error/);

const miscRoutesSource = fs.readFileSync("src/routes/misc-routes.ts", "utf8");
assert.match(miscRoutesSource, /toChatTutorClientResponse\(err\)/);
assert.doesNotMatch(miscRoutesSource, /details:\s*err\.cause/);

const openaiServiceSource = fs.readFileSync("src/openai-service.ts", "utf8");
assert.match(openaiServiceSource, /toChatTutorClientResponse/);
assert.doesNotMatch(openaiServiceSource, /Quota OpenAI épuisé/);
assert.doesNotMatch(openaiServiceSource, /Clé OpenAI invalide/);

const routeDepsSource = fs.readFileSync("src/server/route-deps.ts", "utf8");
assert.match(routeDepsSource, /LIVE_ACCESS_ERRORS/);
assert.match(routeDepsSource, /PUBLIC_API_ERRORS/);
assert.doesNotMatch(routeDepsSource, /error:\s*"Course not found"/);

const routeFiles = [
  "src/routes/courses-routes.ts",
  "src/routes/content-routes.ts",
  "src/routes/quiz-routes.ts",
  "src/routes/grades-routes.ts",
];
for (const routeFile of routeFiles) {
  const source = fs.readFileSync(routeFile, "utf8");
  assert.doesNotMatch(source, /"Course not found"/);
  assert.match(source, /PUBLIC_API_ERRORS/);
}

const messagingRoutesSource = fs.readFileSync("src/messaging-routes.ts", "utf8");
assert.match(messagingRoutesSource, /toPushSubscribeClientResponse\(err\)/);
assert.doesNotMatch(messagingRoutesSource, /error:\s*err\.message/);

const apiSource = fs.readFileSync("src/api.ts", "utf8");
const authRoutesSource = fs.readFileSync("src/routes/auth-routes.ts", "utf8");
const adminRoutesSource = fs.readFileSync("src/routes/admin-routes.ts", "utf8");
assert.match(apiSource, /sanitizeClientErrorMessage/);
assert.doesNotMatch(apiSource, /response:\s*text/);
assert.doesNotMatch(apiSource, /Object\.assign\(error,\s*err,/);
assert.doesNotMatch(authRoutesSource, /role must be STUDENT/);
assert.match(authRoutesSource, /PUBLIC_API_ERRORS\.invalidRole/);
assert.doesNotMatch(authRoutesSource, /Un compte avec cet email existe déjà/);
assert.match(authRoutesSource, /PUBLIC_API_ERRORS\.registrationConflict/);
assert.match(authRoutesSource, /PUBLIC_API_ERRORS\.resendVerificationGeneric/);
assert.match(authRoutesSource, /persistCoursePaymentWithAudit/);
assert.match(authRoutesSource, /REGISTRATION_SEED_ENROLLMENT/);
assert.doesNotMatch(authRoutesSource, /E-mail déjà vérifié/);
assert.match(adminRoutesSource, /PUBLIC_API_ERRORS/);
assert.doesNotMatch(adminRoutesSource, /details:\s*api\.getSmtpPublicConfig/);

const createAppSource = fs.readFileSync("src/server/create-app.ts", "utf8");
assert.match(createAppSource, /RATE_LIMIT_MAX_REQUESTS\) \|\| 500/);
assert.match(createAppSource, /app\.use\("\/api\/livekit\/sync", liveKitSyncRateLimiter\)/);

const liveKitUiSource = fs.readFileSync("src/hooks/useLiveKitRoom.tsx", "utf8");
assert.doesNotMatch(liveKitUiSource, /LIVEKIT_API_KEY/);

const paypalEnrollmentSource = fs.readFileSync("src/paypal-enrollment.ts", "utf8");
assert.doesNotMatch(paypalEnrollmentSource, /Utilisateur non trouvé/);

console.log("Security hardening rules passed");
