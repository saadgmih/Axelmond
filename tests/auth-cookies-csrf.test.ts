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
import { readApiRouteSources, readServerBootstrapSources } from "./helpers/api-route-sources.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("auth-cookies-csrf", () => {
  const bootstrapSource = readServerBootstrapSources();
  const serverSource = readApiRouteSources();
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

  assert.match(bootstrapSource, /cookieParser\(\)/);
  assert.match(bootstrapSource, /csrfProtection/);
  assert.match(serverSource, /api\.setAuthCookies\(res,\s*refreshToken\)/);
  assert.match(serverSource, /api\.setAuthCookies\(res,\s*newRefreshToken\)/);
  assert.match(serverSource, /api\.clearAuthCookies\(res\)/);
  assert.match(bootstrapSource, /readRefreshTokenFromRequest\(req\)/);
  assert.match(serverSource, /csrfToken/);
  assert.doesNotMatch(serverSource, /refreshToken:\s*newRefreshToken/);
  assert.doesNotMatch(serverSource, /refreshToken:\s*refreshToken/);

  assert.match(apiSource, /credentials:\s*"include"/);
  assert.match(apiSource, /X-CSRF-Token/);
  assert.match(apiSource, /accessTokenMemory/);
  assert.match(apiSource, /readCsrfFromCookie\(\)/);
  assert.match(apiSource, /CSRF_TOKEN_INVALID/);
  assert.match(apiSource, /allowCsrfRetry/);
  assert.match(apiSource, /purgeLegacyTokenStorage/);
  assert.doesNotMatch(apiSource, /localStorage\.setItem\(LEGACY_REFRESH_TOKEN_KEY/);

  assert.match(authCsrfSource, /CSRF_TOKEN_INVALID/);
  assert.match(authCsrfSource, /\/api\/uploadthing/);
  assert.match(authCsrfSource, /\/api\/paypal\/webhook/);
  assert.doesNotMatch(authCsrfSource, /\/api\/stripe\/webhook/);
  assert.match(authCsrfSource, /\/api\/auth\/login/);
  assert.doesNotMatch(authCsrfSource, /headerToken\.length > 0/);

  function createMockRes() {
    const cookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
    const cleared: Array<{ name: string; options: Record<string, unknown> }> = [];
    return {
      cookies,
      cleared,
      cookie(name: string, value: string, options: Record<string, unknown>) {
        cookies.push({ name, value, options });
      },
      clearCookie(name: string, options: Record<string, unknown>) {
        cleared.push({ name, options });
      },
      status() {
        return this;
      },
      json() {
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

  const previousNodeEnv = process.env.NODE_ENV;
  const previousMobileSecret = process.env.MOBILE_API_SECRET;
  process.env.NODE_ENV = "production";
  process.env.MOBILE_API_SECRET = "trusted-mobile-secret-32-characters";

  const untrustedRefreshFromBody = readRefreshTokenFromRequest({
    cookies: {},
    headers: { "x-axelmond-client": "mobile" },
    body: { refreshToken: "legacy-body-token" },
  } as any);
  assert.equal(untrustedRefreshFromBody, null);

  const trustedRefreshFromBody = readRefreshTokenFromRequest({
    cookies: {},
    headers: {
      "x-axelmond-client": "mobile",
      "x-axelmond-mobile-secret": "trusted-mobile-secret-32-characters",
    },
    body: { refreshToken: "legacy-body-token" },
  } as any);
  assert.equal(trustedRefreshFromBody, "legacy-body-token");

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
    {
      method: "POST",
      path: "/api/courses",
      cookies: {},
      headers: {
        "x-axelmond-client": "mobile",
        "x-axelmond-mobile-secret": "trusted-mobile-secret-32-characters",
        "x-csrf-token": "fake-token",
      },
    } as any,
    blockedRes as any,
    () => { nextCalled = true; },
  );
  assert.equal(nextCalled, false);
  assert.equal(blockedStatus, 403);

  nextCalled = false;
  blockedStatus = 0;
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

  if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previousNodeEnv;
  if (previousMobileSecret === undefined) delete process.env.MOBILE_API_SECRET;
  else process.env.MOBILE_API_SECRET = previousMobileSecret;
});
