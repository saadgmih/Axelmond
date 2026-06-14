import assert from "node:assert/strict";import fs from "node:fs";import { canAccessApiRoute } from "../src/rbac.ts";import { readApiRouteSources } from "./helpers/api-route-sources.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("security", () => {
const serverSource = readApiRouteSources();
const uploadthingSource = fs.readFileSync("src/uploadthing.ts", "utf8");

// 1. Étudiant ne peut pas créer de module
assert.equal(canAccessApiRoute("STUDENT", "POST", "/api/courses"), false);
assert.match(serverSource, /app\.post\("\/api\/courses",\s*requireAuth,\s*requireRbac/);

// 2. Étudiant ne peut pas accéder aux routes admin
assert.match(serverSource, /app\.get\("\/api\/admin\/professor-invites",\s*requireAuth,\s*requireAdmin/);
assert.match(serverSource, /app\.get\("\/api\/admin\/email-delivery-logs",\s*requireAuth,\s*requireAdmin/);

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
assert.match(serverSource, /app\.use\("\/api\/uploadthing",\s*uploadRateLimiter\)/);
const uploadRateLimitIndex = serverSource.indexOf('app.use("/api/uploadthing", uploadRateLimiter)');
const uploadHandlerIndex = serverSource.indexOf("createRouteHandler({");
assert.ok(uploadHandlerIndex > uploadRateLimitIndex, "UploadThing handler must mount after uploadRateLimiter");

// 5. Jeton LiveKit interdit sans inscription, modération réservée au staff
assert.match(serverSource, /if\s*\(authUser\.role\s*===\s*"STUDENT"\s*&&\s*!authUser\.enrolledCourses\.includes\(course\.id\)\)/);
assert.match(serverSource, /ttl:\s*"15m"/);
assert.equal(canAccessApiRoute("STUDENT", "POST", "/api/livekit/moderation"), false);
assert.equal(canAccessApiRoute("PROFESSOR", "POST", "/api/livekit/moderation"), true);
assert.match(serverSource, /app\.post\("\/api\/livekit\/moderation",\s*requireAuth,\s*requireRbac/);
assert.match(serverSource, /const liveKitModerationRateLimiter = rateLimit\(\{[\s\S]*?max:[\s\S]*?keyGenerator:\s*liveKitRateLimitKey/);
assert.match(serverSource, /app\.use\("\/api\/livekit\/moderation",\s*liveKitModerationRateLimiter\)/);
assert.match(serverSource, /app\.use\("\/api\/livekit\/messages",\s*liveKitMessagesRateLimiter\)/);
assert.match(serverSource, /app\.use\("\/api\/paypal",\s*paypalRateLimiter\)/);
assert.match(serverSource, /paypalWebhookRateLimiter/);
assert.match(serverSource, /PAYPAL_WEBHOOK_RATE_LIMIT_EXCEEDED/);
assert.match(fs.readFileSync("src/live/live-sync-validation.ts", "utf8"), /isAllowedLiveResourceHost/);
assert.match(serverSource, /app\.use\("\/api\/conversations",\s*messagingRateLimiter\)/);
assert.match(serverSource, /app\.use\("\/api\/contact",\s*contactSupportRateLimiter\)/);
assert.doesNotMatch(serverSource, /app\.use\("\/api\/livekit\/messages",\s*liveKitModerationRateLimiter\)/);
assert.match(serverSource, /roomService\.removeParticipant/);
assert.match(serverSource, /roomService\.mutePublishedTrack/);

// 6. Brute force login limité et lockout
assert.match(serverSource, /user\.lockoutUntil/);
assert.match(serverSource, /failedLoginAttempts:\s*attempts/);
assert.match(serverSource, /app\.use\("\/api\/auth\/login",\s*authRateLimiter\)/);

// 6b. Inscription publique validée par Zod (mot de passe 8+, email normalisé)
assert.match(serverSource, /app\.post\("\/api\/auth\/register",\s*validateBody\(api\.registerSchema\)/);
assert.match(serverSource, /password:\s*z\.string\(\)\.min\(8/);

// 6c. CORS piloté par APP_URL / ALLOWED_ORIGINS ; localhost uniquement hors production
assert.match(serverSource, /function buildAllowedOrigins/);
assert.match(serverSource, /process\.env\.APP_URL/);
assert.match(serverSource, /process\.env\.ALLOWED_ORIGINS/);
assert.match(serverSource, /if\s*\(!isProduction\)/);

// 6d. CSP durcie en production (pas de unsafe-eval)
assert.match(serverSource, /scriptSrc:\s*isProduction/);
assert.match(serverSource, /cspNonce/);
assert.match(serverSource, /scriptSrc:\s*isProduction[\s\S]*?\?\s*\["'self'",\s*cspNonce/);
assert.match(serverSource, /scriptSrcAttr:\s*\["'none'"\]/);
assert.match(serverSource, /objectSrc:\s*\["'none'"\]/);
assert.match(serverSource, /function buildCspConnectSrc/);
assert.match(serverSource, /wss:\/\/\*\.livekit\.cloud/);
assert.doesNotMatch(serverSource, /connectSrc\.push\("ws:",\s*"wss:"\)/);
assert.doesNotMatch(serverSource, /connectSrc:\s*\[[^\]]*"ws:"/);
assert.doesNotMatch(serverSource, /connectSrc:\s*\[[^\]]*"wss:"/);

// 7. Vérification d'e-mail avec rate limiters et protection
assert.doesNotMatch(serverSource, /emailVerificationRateLimiter/);
assert.match(serverSource, /const emailVerificationSendRateLimiter = rateLimit\(\{[\s\S]*?max: 5,[\s\S]*?keyGenerator: emailRateLimitKey/);
assert.match(serverSource, /const emailVerificationCheckRateLimiter = rateLimit\(\{[\s\S]*?max: 10,[\s\S]*?keyGenerator: emailRateLimitKey/);
assert.match(serverSource, /const passwordResetRequestRateLimiter = rateLimit\(\{[\s\S]*?max: 5,[\s\S]*?keyGenerator: emailRateLimitKey/);
assert.match(serverSource, /const passwordResetConfirmRateLimiter = rateLimit\(\{[\s\S]*?max: 10,[\s\S]*?keyGenerator: emailRateLimitKey/);
assert.equal((serverSource.match(/keyGenerator:\s*emailRateLimitKey/g) ?? []).length, 4);
assert.match(serverSource, /app\.use\("\/api\/auth\/resend-verification-code",\s*emailVerificationSendRateLimiter\)/);
assert.match(serverSource, /app\.use\("\/api\/auth\/verify-email",\s*emailVerificationCheckRateLimiter\)/);
assert.match(serverSource, /app\.use\("\/api\/auth\/forgot-password",\s*passwordResetRequestRateLimiter\)/);
assert.match(serverSource, /app\.use\("\/api\/auth\/reset-password",\s*passwordResetConfirmRateLimiter\)/);
assert.doesNotMatch(serverSource, /app\.use\("\/api\/auth\/login",\s*emailVerification/);
assert.doesNotMatch(serverSource, /app\.use\("\/api\/auth\/login",\s*passwordReset/);

// 8. Durcissement anti-intrusion
assert.equal(canAccessApiRoute("STUDENT", "DELETE", "/api/admin/secret-backdoor"), false);
assert.match(serverSource, /app\.use\("\/api\/auth\/refresh",\s*refreshRateLimiter\)/);
assert.match(serverSource, /api\.verifyCourseAccess\(authUser,\s*course\.id\)/);

// 9. HttpOnly cookies + CSRF
assert.match(serverSource, /cookieParser\(\)/);
assert.match(serverSource, /csrfProtection/);
assert.match(serverSource, /setAuthCookies/);
assert.match(serverSource, /clearAuthCookies/);
assert.match(serverSource, /X-CSRF-Token/);

// 10. Rate limiters admin
assert.doesNotMatch(serverSource, /emailDiagnosticRateLimiter/);
assert.match(serverSource, /const adminReadRateLimiter = rateLimit\(\{[\s\S]*?max:\s*isSecurityRuntimeTest[\s\S]*?process\.env\.ADMIN_READ_RATE_LIMIT_MAX\)[\s\S]*?\|\| 9999[\s\S]*?process\.env\.ADMIN_READ_RATE_LIMIT_MAX\)[\s\S]*?\|\| 300,[\s\S]*?keyGenerator:\s*adminRateLimitKey/);
assert.match(serverSource, /const adminMutationRateLimiter = rateLimit\(\{[\s\S]*?max:\s*isSecurityRuntimeTest[\s\S]*?process\.env\.ADMIN_MUTATION_RATE_LIMIT_MAX\)[\s\S]*?\|\| 9999[\s\S]*?process\.env\.ADMIN_MUTATION_RATE_LIMIT_MAX\)[\s\S]*?\|\| 60,[\s\S]*?keyGenerator:\s*adminRateLimitKey/);
assert.match(serverSource, /const adminDiagnosticRateLimiter = rateLimit\(\{[\s\S]*?max:\s*isSecurityRuntimeTest[\s\S]*?process\.env\.ADMIN_DIAGNOSTIC_RATE_LIMIT_MAX\)[\s\S]*?\|\| 9999[\s\S]*?process\.env\.ADMIN_DIAGNOSTIC_RATE_LIMIT_MAX\)[\s\S]*?\|\| 10,[\s\S]*?keyGenerator:\s*adminRateLimitKey/);
assert.equal((serverSource.match(/keyGenerator:\s*adminRateLimitKey/g) ?? []).length, 3);
assert.match(serverSource, /app\.use\("\/api\/admin",\s*adminRouteRateLimiter\)/);
assert.match(serverSource, /app\.use\("\/api\/test-email",\s*adminDiagnosticRateLimiter\)/);
assert.match(serverSource, /if\s*\(req\.method === "GET"\)[\s\S]*?adminReadRateLimiter/);
assert.match(serverSource, /ADMIN_MUTATION_METHODS[\s\S]*?adminMutationRateLimiter/);

});
