import assert from "node:assert/strict";
import fs from "node:fs";
import { canAccessApiRoute } from "../src/rbac.ts";
import { readApiRouteSources } from "./helpers/api-route-sources.ts";
import { matchAppRouteWithMiddleware, matchAppUse } from "./helpers/source-patterns.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("security", () => {
  const serverSource = readApiRouteSources();
  const uploadthingSource = fs.readFileSync("src/uploadthing.ts", "utf8");

  // 1. Étudiant ne peut pas créer de module
  assert.equal(canAccessApiRoute("STUDENT", "POST", "/api/courses"), false);
  assert.ok(matchAppRouteWithMiddleware(serverSource, "post", "/api/courses", ["requireAuth", "requireRbac"]));

  // 2. Étudiant ne peut pas accéder aux routes admin
  assert.ok(
    matchAppRouteWithMiddleware(serverSource, "get", "/api/admin/professor-invites", ["requireAuth", "requireAdmin"]),
  );
  assert.ok(
    matchAppRouteWithMiddleware(serverSource, "get", "/api/admin/email-delivery-logs", ["requireAuth", "requireAdmin"]),
  );

  // 3. Un professeur ne peut modifier que ses propres modules (vérification de l'ownership)
  assert.match(serverSource, /api\.verifyCourseAccess\(authUser,\s*courseId\)/);
  assert.match(serverSource, /api\.verifyChapterAccess\(authUser,\s*req\.params\.id\)/);
  assert.match(serverSource, /api\.verifySectionAccess\(authUser,\s*req\.params\.id\)/);
  assert.match(serverSource, /api\.verifyContentAccess\(authUser,\s*req\.params\.id\)/);
  assert.match(serverSource, /createdById:\s*authUser\.id/);

  // 4. Téléversement invalide ou suspect refusé et supprimé
  assert.match(uploadthingSource, /isDangerousFile/);
  assert.match(uploadthingSource, /isValidMimeType/);
  assert.match(uploadthingSource, /utapi\.deleteFiles\(file\.key\)/);
  assert.ok(matchAppUse(serverSource, "/api/uploadthing", "uploadRateLimiter"));
  const uploadRateLimitIndex = serverSource.search(/app\.use\(\s*"\/api\/uploadthing"[\s\S]*?uploadRateLimiter/);
  const uploadHandlerIndex = serverSource.indexOf("createRouteHandler({");
  assert.ok(uploadHandlerIndex > uploadRateLimitIndex, "UploadThing handler must mount after uploadRateLimiter");

  // 5. Jeton LiveKit interdit sans inscription, modération réservée au staff
  assert.match(
    serverSource,
    /if\s*\(authUser\.role\s*===\s*"STUDENT"\s*&&\s*!authUser\.enrolledCourses\.includes\(course\.id\)\)/,
  );
  assert.match(serverSource, /ttl:\s*"15m"/);
  assert.equal(canAccessApiRoute("STUDENT", "POST", "/api/livekit/moderation"), false);
  assert.equal(canAccessApiRoute("PROFESSOR", "POST", "/api/livekit/moderation"), true);
  assert.ok(
    matchAppRouteWithMiddleware(serverSource, "post", "/api/livekit/moderation", ["requireAuth", "requireRbac"]),
  );
  assert.match(
    serverSource,
    /const liveKitModerationRateLimiter = rateLimit\(\{[\s\S]*?max:[\s\S]*?keyGenerator:\s*liveKitRateLimitKey/,
  );
  assert.ok(matchAppUse(serverSource, "/api/livekit/moderation", "liveKitModerationRateLimiter"));
  assert.ok(matchAppUse(serverSource, "/api/livekit/messages", "liveKitMessagesRateLimiter"));
  assert.ok(matchAppUse(serverSource, "/api/paypal", "paypalRateLimiter"));
  assert.match(serverSource, /paypalWebhookRateLimiter/);
  assert.match(serverSource, /PAYPAL_WEBHOOK_RATE_LIMIT_EXCEEDED/);
  assert.match(fs.readFileSync("src/live/live-sync-validation.ts", "utf8"), /isAllowedLiveResourceHost/);
  assert.ok(matchAppUse(serverSource, "/api/conversations", "messagingRateLimiter"));
  assert.ok(matchAppUse(serverSource, "/api/contact", "contactSupportRateLimiter"));
  assert.doesNotMatch(serverSource, /app\.use\("\/api\/livekit\/messages",\s*liveKitModerationRateLimiter\)/);
  assert.match(serverSource, /roomService\.removeParticipant/);
  assert.match(serverSource, /roomService\.mutePublishedTrack/);

  // 6. Connexion sans verrouillage de compte persistant
  assert.doesNotMatch(serverSource, /buildAccountLoginFailureUpdate|recordEmailLoginFailure/);
  assert.doesNotMatch(serverSource, /sendLoginLockoutResponse|\/api\/auth\/login-status/);
  assert.match(serverSource, /failedLoginAttempts:\s*0/);
  assert.doesNotMatch(serverSource, /app\.use\("\/api\/auth\/login", authRateLimiter\)/);

  // 6b. Inscription publique validée par Zod (mot de passe fort + email normalisé)
  assert.ok(
    matchAppRouteWithMiddleware(serverSource, "post", "/api/auth/register", ["validateBody", "registerSchema"]),
  );
  assert.match(serverSource, /strongPasswordField/);

  // 6c. CORS piloté par APP_URL / ALLOWED_ORIGINS ; localhost uniquement hors production
  assert.match(serverSource, /function buildAllowedOrigins/);
  assert.match(serverSource, /requireGlobalApiRbac/);
  assert.match(serverSource, /process\.env\.APP_URL/);
  assert.match(serverSource, /process\.env\.ALLOWED_ORIGINS/);
  assert.match(serverSource, /if\s*\(!isProduction\)/);

  // 6d. CSP durcie en production (pas de unsafe-eval)
  assert.match(serverSource, /PRODUCTION_CONTENT_SECURITY_POLICY/);
  assert.match(serverSource, /res\.setHeader\("Content-Security-Policy", PRODUCTION_CONTENT_SECURITY_POLICY\)/);
  assert.match(serverSource, /scriptSrcAttr:\s*\["'none'"\]/);
  assert.match(serverSource, /objectSrc:\s*\["'none'"\]/);
  assert.match(serverSource, /function buildCspConnectSrc/);
  assert.match(serverSource, /wss:\/\/\*\.livekit\.cloud/);
  assert.doesNotMatch(serverSource, /connectSrc\.push\("ws:",\s*"wss:"\)/);
  assert.doesNotMatch(serverSource, /connectSrc:\s*\[[^\]]*"ws:"/);
  assert.doesNotMatch(serverSource, /connectSrc:\s*\[[^\]]*"wss:"/);
  const indexHtml = fs.readFileSync("index.html", "utf8");
  assert.doesNotMatch(indexHtml, /<style\b/i);
  assert.doesNotMatch(indexHtml, /<script(?![^>]*\bsrc=)[^>]*>/i);

  // 7. Vérification d'e-mail avec rate limiters et protection
  assert.doesNotMatch(serverSource, /emailVerificationRateLimiter/);
  assert.match(
    serverSource,
    /const emailVerificationSendRateLimiter = rateLimit\(\{[\s\S]*?max: 5,[\s\S]*?keyGenerator: emailRateLimitKey/,
  );
  assert.match(
    serverSource,
    /const emailVerificationCheckRateLimiter = rateLimit\(\{[\s\S]*?max: 10,[\s\S]*?keyGenerator: emailRateLimitKey/,
  );
  assert.match(
    serverSource,
    /const passwordResetRequestRateLimiter = rateLimit\(\{[\s\S]*?max: 5,[\s\S]*?keyGenerator: emailRateLimitKey/,
  );
  assert.match(
    serverSource,
    /const passwordResetConfirmRateLimiter = rateLimit\(\{[\s\S]*?max: 10,[\s\S]*?keyGenerator: emailRateLimitKey/,
  );
  assert.equal((serverSource.match(/keyGenerator:\s*emailRateLimitKey/g) ?? []).length, 4);
  assert.ok(matchAppUse(serverSource, "/api/auth/resend-verification-code", "emailVerificationSendRateLimiter"));
  assert.ok(matchAppUse(serverSource, "/api/auth/verify-email", "emailVerificationCheckRateLimiter"));
  assert.ok(matchAppUse(serverSource, "/api/auth/forgot-password", "passwordResetRequestRateLimiter"));
  assert.ok(matchAppUse(serverSource, "/api/auth/reset-password", "passwordResetConfirmRateLimiter"));
  assert.doesNotMatch(serverSource, /app\.use\("\/api\/auth\/login",\s*emailVerification/);
  assert.doesNotMatch(serverSource, /app\.use\("\/api\/auth\/login",\s*passwordReset/);

  // 8. Durcissement anti-intrusion
  assert.equal(canAccessApiRoute("STUDENT", "DELETE", "/api/admin/secret-backdoor"), false);
  assert.ok(matchAppUse(serverSource, "/api/auth/refresh", "refreshRateLimiter"));
  assert.match(serverSource, /api\.verifyCourseAccess\(authUser,\s*course\.id\)/);

  // 9. HttpOnly cookies + CSRF
  assert.match(serverSource, /cookieParser\(\)/);
  assert.match(serverSource, /csrfProtection/);
  assert.match(serverSource, /setAuthCookies/);
  assert.match(serverSource, /clearAuthCookies/);
  assert.match(serverSource, /X-CSRF-Token/);

  // 10. Rate limiters admin
  assert.doesNotMatch(serverSource, /emailDiagnosticRateLimiter/);
  assert.match(
    serverSource,
    /const adminReadRateLimiter = rateLimit\(\{[\s\S]*?max:\s*isSecurityRuntimeTest[\s\S]*?process\.env\.ADMIN_READ_RATE_LIMIT_MAX\)[\s\S]*?\|\| 9999[\s\S]*?process\.env\.ADMIN_READ_RATE_LIMIT_MAX\)[\s\S]*?\|\| 300,[\s\S]*?keyGenerator:\s*adminRateLimitKey/,
  );
  assert.match(
    serverSource,
    /const adminMutationRateLimiter = rateLimit\(\{[\s\S]*?max:\s*isSecurityRuntimeTest[\s\S]*?process\.env\.ADMIN_MUTATION_RATE_LIMIT_MAX\)[\s\S]*?\|\| 9999[\s\S]*?process\.env\.ADMIN_MUTATION_RATE_LIMIT_MAX\)[\s\S]*?\|\| 60,[\s\S]*?keyGenerator:\s*adminRateLimitKey/,
  );
  assert.match(
    serverSource,
    /const adminDiagnosticRateLimiter = rateLimit\(\{[\s\S]*?max:\s*isSecurityRuntimeTest[\s\S]*?process\.env\.ADMIN_DIAGNOSTIC_RATE_LIMIT_MAX\)[\s\S]*?\|\| 9999[\s\S]*?process\.env\.ADMIN_DIAGNOSTIC_RATE_LIMIT_MAX\)[\s\S]*?\|\| 10,[\s\S]*?keyGenerator:\s*adminRateLimitKey/,
  );
  assert.equal((serverSource.match(/keyGenerator:\s*adminRateLimitKey/g) ?? []).length, 3);
  assert.ok(matchAppUse(serverSource, "/api/admin", "adminRouteRateLimiter"));
  assert.ok(matchAppUse(serverSource, "/api/test-email", "adminDiagnosticRateLimiter"));
  assert.match(serverSource, /if\s*\(req\.method === "GET"\)[\s\S]*?adminReadRateLimiter/);
  assert.match(serverSource, /ADMIN_MUTATION_METHODS[\s\S]*?adminMutationRateLimiter/);
});
