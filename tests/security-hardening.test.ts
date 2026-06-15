import assert from "node:assert/strict";
import { readApiRouteSources } from "./helpers/api-route-sources.ts";
import fs from "node:fs";
import { hashRefreshToken } from "../src/security-hardening.ts";
import { canAccessApiRoute } from "../src/rbac.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("security-hardening", () => {
  const serverSource = readApiRouteSources();
  const authTokenSource = fs.readFileSync("src/auth-token.ts", "utf8");

  assert.equal(hashRefreshToken("test-token-a"), hashRefreshToken("test-token-a"));
  assert.notEqual(hashRefreshToken("test-token-a"), hashRefreshToken("test-token-b"));

  assert.match(authTokenSource, /hashRefreshToken\(token\)/);
  assert.match(authTokenSource, /findValidRefreshToken/);
  assert.match(authTokenSource, /findRefreshTokenRecord/);
  assert.match(authTokenSource, /logoutRefreshSession/);
  assert.match(authTokenSource, /revokeAllUserRefreshTokens/);

  const sessionRoutesSource = fs.readFileSync("src/routes/auth/session-routes.ts", "utf8");
  assert.match(sessionRoutesSource, /logoutRefreshSession/);
  assert.match(sessionRoutesSource, /sessions\/revoke-all/);

  const notificationsSource = fs.readFileSync("src/notifications.ts", "utf8");
  assert.match(notificationsSource, /sanitizeInternalAppPath/);

  const emailSource = fs.readFileSync("src/email.ts", "utf8");
  assert.match(emailSource, /buildAbsoluteAppUrl/);

  assert.equal(canAccessApiRoute("STUDENT", "DELETE", "/api/admin/unknown-hacker-route"), false);
  assert.equal(canAccessApiRoute("PROFESSOR", "POST", "/api/unknown-route"), false);

  assert.match(serverSource, /app\.use\("\/api\/auth\/refresh",\s*refreshRateLimiter\)/);
  assert.match(serverSource, /Refresh token reuse detected/);
  assert.match(serverSource, /api\.verifyCourseAccess\(authUser,\s*course\.id\)/);
  assert.match(
    serverSource,
    /app\.post\("\/api\/livekit\/messages",\s*requireAuth,\s*validateBody\(api\.liveMessageSchema\)/,
  );
  assert.match(serverSource, /app\.post\("\/api\/chat-tutor",\s*requireAuth,\s*validateBody\(api\.chatTutorSchema\)/);
  assert.match(serverSource, /api\.generateChatTutorResponse/);
  assert.doesNotMatch(serverSource, /GEMINI_API_KEY|GoogleGenAI|@google\/genai|gemini-/i);
  assert.match(serverSource, /courseId:\s*z\.number\(\)\.int\(\)\.positive\(\)/);
  assert.match(serverSource, /api\.assertCourseLearningAccess\(/);
  assert.doesNotMatch(serverSource, /courseContext:\s*z\.string\(\)/);
  assert.match(serverSource, /strongPasswordField/);
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
  assert.match(liveRoutesSource, /liveTokenSchema/);
  assert.match(liveRoutesSource, /sessionResult\.ok/);

  const routeMappersSource = fs.readFileSync("src/server/route-mappers.ts", "utf8");
  assert.match(routeMappersSource, /sessionNotActive/);
  assert.match(routeMappersSource, /canPublishLiveMedia/);

  const quizRoutesSource = fs.readFileSync("src/routes/quiz-routes.ts", "utf8");
  assert.match(quizRoutesSource, /\/api\/courses\/:courseId\/quizzes\/:moduleId/);
  assert.match(quizRoutesSource, /where:\s*\{\s*courseId,\s*moduleId\s*\}/);

  const messagingSource = fs.readFileSync("src/messaging.ts", "utf8");
  assert.match(messagingSource, /verifyMessageAttachmentOwnership/);
  assert.match(messagingSource, /registerMessageAttachmentUpload/);

  const mfaChallengeSource = fs.readFileSync("src/mfa-challenge.ts", "utf8");
  assert.match(mfaChallengeSource, /updateMany/);
  assert.match(mfaChallengeSource, /consumed\.count !== 1/);

  assert.match(paymentsRoutesSource, /toPayPalCaptureClientResponse\(result\)/);
  assert.doesNotMatch(paymentsRoutesSource, /error:\s*result\.error/);

  const miscRoutesSource = fs.readFileSync("src/routes/misc-routes.ts", "utf8");
  assert.match(miscRoutesSource, /toChatTutorClientResponse\(err\)/);
  assert.doesNotMatch(miscRoutesSource, /details:\s*err\.cause/);

  const openaiServiceSource = fs.readFileSync("src/openai-service.ts", "utf8");
  assert.match(openaiServiceSource, /trimChatTutorHistory/);
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

  const messagingRoutesSource = fs.readFileSync("src/routes/messaging-routes.ts", "utf8");
  assert.match(messagingRoutesSource, /toPushSubscribeClientResponse\(err\)/);
  assert.doesNotMatch(messagingRoutesSource, /error:\s*err\.message/);

  const _apiSource = fs.readFileSync("src/api.ts", "utf8");
  const clientErrorsSource = fs.readFileSync("src/client-errors.ts", "utf8");
  const authRoutesSource = fs.readFileSync("src/routes/auth/register-login-routes.ts", "utf8");
  const emailVerificationRoutesSource = fs.readFileSync("src/routes/auth/email-verification-routes.ts", "utf8");
  const adminRoutesSource = fs.readFileSync("src/routes/admin-routes.ts", "utf8");
  assert.match(clientErrorsSource, /sanitizeClientErrorMessage/);
  assert.doesNotMatch(authRoutesSource, /role must be STUDENT/);
  assert.match(authRoutesSource, /PUBLIC_API_ERRORS\.invalidRole/);
  assert.doesNotMatch(authRoutesSource, /Un compte avec cet email existe déjà/);
  assert.match(authRoutesSource, /PUBLIC_API_ERRORS\.registrationConflict/);
  assert.match(emailVerificationRoutesSource, /PUBLIC_API_ERRORS\.resendVerificationGeneric/);
  assert.match(authRoutesSource, /reserveProfessorInviteCode/);
  assert.match(authRoutesSource, /attachProfessorInviteUsage/);
  assert.doesNotMatch(authRoutesSource, /REGISTRATION_SEED_ENROLLMENT/);
  assert.match(authRoutesSource, /getBcryptRounds/);
  assert.doesNotMatch(emailVerificationRoutesSource, /E-mail déjà vérifié/);
  assert.match(adminRoutesSource, /PUBLIC_API_ERRORS/);
  assert.doesNotMatch(adminRoutesSource, /details:\s*api\.getSmtpPublicConfig/);

  const createAppSource = fs.readFileSync("src/server/create-app.ts", "utf8");
  assert.match(createAppSource, /RATE_LIMIT_MAX_REQUESTS\) \|\| 500/);
  assert.match(createAppSource, /app\.use\("\/api\/livekit\/sync", liveKitSyncRateLimiter\)/);
  assert.match(createAppSource, /chat-tutor:user:/);

  const securityHardeningSource = fs.readFileSync("src/chat-tutor-limits.ts", "utf8");
  assert.match(securityHardeningSource, /trimChatTutorHistory/);
  assert.match(securityHardeningSource, /CHAT_TUTOR_MAX_HISTORY_CHARS/);

  const liveKitUiSource = fs.readFileSync("src/hooks/useLiveKitRoom.tsx", "utf8");
  assert.doesNotMatch(liveKitUiSource, /process\.env\.LIVEKIT_API_KEY/);

  const paypalEnrollmentSource = fs.readFileSync("src/paypal-enrollment.ts", "utf8");
  assert.doesNotMatch(paypalEnrollmentSource, /Utilisateur non trouvé/);
});
console.log("Security hardening rules passed");
