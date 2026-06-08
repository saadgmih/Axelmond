import assert from "node:assert/strict";
import fs from "node:fs";
import { canAccessApiRoute } from "../src/rbac.ts";

const serverSource = fs.readFileSync("server.ts", "utf8");
const uploadthingSource = fs.readFileSync("src/uploadthing.ts", "utf8");

// 1. Étudiant ne peut pas créer de module
assert.equal(canAccessApiRoute("STUDENT", "POST", "/api/courses"), false);
assert.match(serverSource, /app\.post\("\/api\/courses",\s*requireAuth,\s*requireRbac/);

// 2. Étudiant ne peut pas accéder aux routes admin
assert.match(serverSource, /app\.get\("\/api\/admin\/professor-invites",\s*requireAuth,\s*requireAdmin/);
assert.match(serverSource, /app\.get\("\/api\/admin\/email-delivery-logs",\s*requireAuth,\s*requireAdmin/);

// 3. Un professeur ne peut modifier que ses propres modules (vérification de l'ownership)
assert.match(serverSource, /verifyCourseAccess\(authUser,\s*courseId\)/);
assert.match(serverSource, /verifyChapterAccess\(authUser,\s*req\.params\.id\)/);
assert.match(serverSource, /verifySectionAccess\(authUser,\s*req\.params\.id\)/);
assert.match(serverSource, /verifyContentAccess\(authUser,\s*req\.params\.id\)/);
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
assert.match(serverSource, /roomService\.removeParticipant/);
assert.match(serverSource, /roomService\.mutePublishedTrack/);

// 6. Brute force login limité et lockout
assert.match(serverSource, /user\.lockoutUntil/);
assert.match(serverSource, /failedLoginAttempts:\s*attempts/);
assert.match(serverSource, /app\.use\("\/api\/auth\/login",\s*authRateLimiter\)/);

// 6b. Inscription publique validée par Zod (mot de passe 8+, email normalisé)
assert.match(serverSource, /app\.post\("\/api\/auth\/register",\s*validateBody\(registerSchema\)/);
assert.match(serverSource, /password:\s*z\.string\(\)\.min\(8/);

// 6c. CORS piloté par APP_URL / ALLOWED_ORIGINS ; localhost uniquement hors production
assert.match(serverSource, /function buildAllowedOrigins/);
assert.match(serverSource, /process\.env\.APP_URL/);
assert.match(serverSource, /process\.env\.ALLOWED_ORIGINS/);
assert.match(serverSource, /if\s*\(!isProduction\)/);

// 6d. CSP durcie en production (pas de unsafe-eval)
assert.match(serverSource, /scriptSrc:\s*isProduction/);

// 7. Vérification d'e-mail avec rate limiters et protection
assert.match(serverSource, /app\.use\("\/api\/auth\/verify-email",\s*emailVerificationRateLimiter\)/);
assert.match(serverSource, /app\.use\("\/api\/auth\/resend-verification-code",\s*emailVerificationRateLimiter\)/);

// 8. Durcissement anti-intrusion
assert.equal(canAccessApiRoute("STUDENT", "DELETE", "/api/admin/secret-backdoor"), false);
assert.match(serverSource, /app\.use\("\/api\/auth\/refresh",\s*refreshRateLimiter\)/);
assert.match(serverSource, /verifyCourseAccess\(authUser,\s*course\.id\)/);

// 9. HttpOnly cookies + CSRF
assert.match(serverSource, /cookieParser\(\)/);
assert.match(serverSource, /csrfProtection/);
assert.match(serverSource, /setAuthCookies/);
assert.match(serverSource, /clearAuthCookies/);
assert.match(serverSource, /X-CSRF-Token/);

console.log("Security automated tests passed");
