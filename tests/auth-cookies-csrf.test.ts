import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CSRF_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_PATH,
  clearAuthCookies,
  readRefreshTokenFromRequest,
  setAuthCookies,
} from "../src/auth-cookies.ts";
import { csrfProtection } from "../src/auth-csrf.ts";

const serverSource = readFileSync("server.ts", "utf8");
const apiSource = readFileSync("src/api.ts", "utf8");
const authCookiesSource = readFileSync("src/auth-cookies.ts", "utf8");
const authCsrfSource = readFileSync("src/auth-csrf.ts", "utf8");

assert.equal(REFRESH_COOKIE_NAME, "refresh_token");
assert.equal(CSRF_COOKIE_NAME, "csrf_token");
assert.equal(REFRESH_COOKIE_PATH, "/api/auth");

assert.match(authCookiesSource, /httpOnly:\s*true/);
assert.match(authCookiesSource, /sameSite:\s*"strict"/);
assert.match(authCookiesSource, /path:\s*REFRESH_COOKIE_PATH/);
assert.match(authCookiesSource, /httpOnly:\s*false/);

assert.match(serverSource, /cookieParser\(\)/);
assert.match(serverSource, /csrfProtection/);
assert.match(serverSource, /setAuthCookies\(res,\s*refreshToken\)/);
assert.match(serverSource, /setAuthCookies\(res,\s*newRefreshToken\)/);
assert.match(serverSource, /clearAuthCookies\(res\)/);
assert.match(serverSource, /readRefreshTokenFromRequest\(req\)/);
assert.match(serverSource, /csrfToken/);
assert.doesNotMatch(serverSource, /refreshToken:\s*newRefreshToken/);
assert.doesNotMatch(serverSource, /refreshToken:\s*refreshToken/);

assert.match(apiSource, /credentials:\s*"include"/);
assert.match(apiSource, /X-CSRF-Token/);
assert.match(apiSource, /accessTokenMemory/);
assert.match(apiSource, /purgeLegacyTokenStorage/);
assert.doesNotMatch(apiSource, /localStorage\.setItem\(LEGACY_REFRESH_TOKEN_KEY/);

assert.match(authCsrfSource, /CSRF_TOKEN_INVALID/);
assert.match(authCsrfSource, /\/api\/uploadthing/);
assert.match(authCsrfSource, /\/api\/paypal\/webhook/);
assert.match(authCsrfSource, /\/api\/stripe\/webhook/);
assert.match(authCsrfSource, /\/api\/auth\/login/);

function createMockRes() {
  const headers: Record<string, string> = {};
  const cookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
  const cleared: Array<{ name: string; options: Record<string, unknown> }> = [];
  return {
    headers,
    cookies,
    cleared,
    statusCode: 200,
    body: null as unknown,
    cookie(name: string, value: string, options: Record<string, unknown>) {
      cookies.push({ name, value, options });
    },
    clearCookie(name: string, options: Record<string, unknown>) {
      cleared.push({ name, options });
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
}

const mockRes = createMockRes();
const csrfToken = setAuthCookies(mockRes as any, "raw-refresh-token-value");
assert.ok(csrfToken);
assert.equal(mockRes.cookies.length, 2);
const refreshCookie = mockRes.cookies.find((c) => c.name === REFRESH_COOKIE_NAME);
const csrfCookie = mockRes.cookies.find((c) => c.name === CSRF_COOKIE_NAME);
assert.ok(refreshCookie);
assert.ok(csrfCookie);
assert.equal(refreshCookie.options.httpOnly, true);
assert.equal(csrfCookie.options.httpOnly, false);
assert.equal(refreshCookie.options.path, "/api/auth");
assert.equal(csrfCookie.options.path, "/");

clearAuthCookies(mockRes as any);
assert.equal(mockRes.cleared.some((c) => c.name === REFRESH_COOKIE_NAME), true);
assert.equal(mockRes.cleared.some((c) => c.name === CSRF_COOKIE_NAME), true);

const refreshFromCookie = readRefreshTokenFromRequest({
  cookies: { [REFRESH_COOKIE_NAME]: "abc123" },
  body: {},
} as any);
assert.equal(refreshFromCookie, "abc123");

const refreshFromBody = readRefreshTokenFromRequest({
  cookies: {},
  body: { refreshToken: "legacy-body-token" },
} as any);
assert.equal(refreshFromBody, "legacy-body-token");

let nextCalled = false;
let blockedStatus = 0;
let blockedBody: unknown = null;
const blockedRes = {
  status(code: number) {
    blockedStatus = code;
    return this;
  },
  json(payload: unknown) {
    blockedBody = payload;
    return this;
  },
};

csrfProtection(
  { method: "POST", path: "/api/courses", cookies: { [CSRF_COOKIE_NAME]: "abc" }, headers: {} } as any,
  blockedRes as any,
  () => { nextCalled = true; },
);
assert.equal(blockedStatus, 403);
assert.deepEqual(blockedBody, { error: "Jeton CSRF invalide ou manquant", code: "CSRF_TOKEN_INVALID" });
assert.equal(nextCalled, false);

nextCalled = false;
csrfProtection(
  {
    method: "POST",
    path: "/api/courses",
    cookies: { [CSRF_COOKIE_NAME]: "valid-csrf" },
    headers: { "x-csrf-token": "valid-csrf" },
  } as any,
  blockedRes as any,
  () => { nextCalled = true; },
);
assert.equal(nextCalled, true);

nextCalled = false;
csrfProtection(
  { method: "POST", path: "/api/uploadthing", cookies: {}, headers: {} } as any,
  blockedRes as any,
  () => { nextCalled = true; },
);
assert.equal(nextCalled, true);

nextCalled = false;
csrfProtection(
  { method: "POST", path: "/api/paypal/webhook", cookies: {}, headers: {} } as any,
  blockedRes as any,
  () => { nextCalled = true; },
);
assert.equal(nextCalled, true);

console.log("Auth cookies + CSRF rules passed");
