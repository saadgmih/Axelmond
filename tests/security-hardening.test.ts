import assert from "node:assert/strict";
import fs from "node:fs";
import { hashRefreshToken } from "../src/security-hardening.ts";
import { canAccessApiRoute } from "../src/rbac.ts";

const serverSource = fs.readFileSync("server.ts", "utf8");
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
assert.match(serverSource, /verifyCourseAccess\(authUser,\s*course\.id\)/);
assert.match(serverSource, /app\.post\("\/api\/livekit\/messages",\s*requireAuth,\s*validateBody\(liveMessageSchema\)/);
assert.match(serverSource, /app\.post\("\/api\/chat-tutor",\s*requireAuth,\s*validateBody\(chatTutorSchema\)/);
assert.match(serverSource, /courseId:\s*z\.number\(\)\.int\(\)\.positive\(\)/);
assert.match(serverSource, /assertCourseLearningAccess\(/);
assert.doesNotMatch(serverSource, /courseContext:\s*z\.string\(\)/);
assert.match(serverSource, /newPassword:\s*z\.string\(\)\.min\(8/);
assert.match(serverSource, /Refresh token reuse detected/);
assert.match(serverSource, /Permissions-Policy/);
assert.match(serverSource, /express\.json\(\{\s*limit:\s*JSON_BODY_LIMIT/);
assert.match(serverSource, /setAuthCookies/);
assert.match(serverSource, /csrfProtection/);

console.log("Security hardening rules passed");
