import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  MOBILE_CLIENT_HEADER,
  MOBILE_CLIENT_VALUE,
  isMobileClientRequest,
  isTrustedMobileClientRequest,
  withMobileRefreshToken,
} from "../src/auth-mobile.ts";
import { csrfProtection } from "../src/auth-csrf.ts";
import { applyMobileApiCorsHeaders, MOBILE_API_ROUTE_CATALOG } from "../src/mobile-api-routes.ts";
import { readApiRouteSources, readServerBootstrapSources } from "./helpers/api-route-sources.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("mobile-api", () => {
  const bootstrapSource = readServerBootstrapSources();
  const serverSource = readApiRouteSources();
  const authCsrfSource = readFileSync("src/auth-csrf.ts", "utf8");
  const mobileRoutesSource = readFileSync("src/mobile-api-routes.ts", "utf8");

  assert.equal(MOBILE_CLIENT_HEADER, "x-axelmond-client");
  assert.equal(MOBILE_CLIENT_VALUE, "mobile");

  assert.equal(isMobileClientRequest({ headers: { [MOBILE_CLIENT_HEADER]: "mobile" } } as any), true);
  assert.equal(isMobileClientRequest({ headers: {} } as any), false);

  const webPayload = withMobileRefreshToken(
    { headers: {} } as any,
    { token: "access", csrfToken: "csrf" },
    "refresh-secret",
  );
  assert.deepEqual(webPayload, { token: "access", csrfToken: "csrf" });

  const previousMobileSecret = process.env.MOBILE_API_SECRET;
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  process.env.MOBILE_API_SECRET = "trusted-mobile-secret-32-characters";

  const untrustedMobilePayload = withMobileRefreshToken(
    { headers: { [MOBILE_CLIENT_HEADER]: "mobile" } } as any,
    { token: "access", csrfToken: "csrf" },
    "refresh-secret",
  );
  assert.deepEqual(untrustedMobilePayload, { token: "access", csrfToken: "csrf" });

  const mobilePayload = withMobileRefreshToken(
    {
      headers: { [MOBILE_CLIENT_HEADER]: "mobile", "x-axelmond-mobile-secret": "trusted-mobile-secret-32-characters" },
    } as any,
    { token: "access", csrfToken: "csrf" },
    "refresh-secret",
  );
  assert.deepEqual(mobilePayload, {
    token: "access",
    csrfToken: "csrf",
    refreshToken: "refresh-secret",
  });

  assert.match(serverSource, /api\.withMobileRefreshToken\(req/);
  assert.match(bootstrapSource, /applyMobileApiCorsHeaders\(req, res, \{ originAllowed \}\)/);
  assert.match(bootstrapSource, /registerMobileApiRoutes\(app, \{ requireAuth: routeCtx\.middleware\.requireAuth \}\)/);
  assert.match(authCsrfSource, /isTrustedMobileClientRequest/);
  assert.match(mobileRoutesSource, /\/api\/mobile\/student-profile/);
  assert.match(mobileRoutesSource, /\/api\/mobile\/routes/);

  assert.ok(MOBILE_API_ROUTE_CATALOG.auth.login.includes("/api/auth/login"));
  assert.ok(MOBILE_API_ROUTE_CATALOG.student.liveToken.includes("/api/livekit/token"));
  assert.ok(MOBILE_API_ROUTE_CATALOG.live.token.includes("/api/livekit/token"));
  assert.ok(MOBILE_API_ROUTE_CATALOG.live.messagesSend.includes("/api/livekit/messages"));
  assert.ok(MOBILE_API_ROUTE_CATALOG.live.moderation.includes("/api/livekit/moderation"));
  assert.ok(MOBILE_API_ROUTE_CATALOG.teacher.toggleLive.includes("isLiveNow"));
  assert.ok(MOBILE_API_ROUTE_CATALOG.public.courses.includes("/api/courses"));

  function createMockRes() {
    const headers: Record<string, string> = {};
    return {
      headers,
      setHeader(name: string, value: string) {
        headers[name.toLowerCase()] = value;
      },
    };
  }

  const corsRes = createMockRes();
  applyMobileApiCorsHeaders(
    { path: "/api/courses", headers: { origin: "http://localhost:8081" } } as any,
    corsRes as any,
  );
  assert.match(corsRes.headers["access-control-allow-headers"], /X-Axelmond-Client/);
  assert.equal(corsRes.headers["access-control-allow-origin"], "http://localhost:8081");

  process.env.NODE_ENV = "development";
  delete process.env.MOBILE_API_SECRET;

  let mobileCsrfPassed = false;
  csrfProtection(
    {
      method: "POST",
      path: "/api/livekit/token",
      headers: {
        [MOBILE_CLIENT_HEADER]: "mobile",
        authorization: "Bearer test-token",
      },
      cookies: {},
      body: {},
    } as any,
    {
      status() {
        return this;
      },
      json() {
        return this;
      },
    } as any,
    () => {
      mobileCsrfPassed = true;
    },
  );
  assert.equal(mobileCsrfPassed, true);

  let mobileRefreshPassed = false;
  csrfProtection(
    {
      method: "POST",
      path: "/api/auth/refresh",
      headers: { [MOBILE_CLIENT_HEADER]: "mobile" },
      cookies: {},
      body: { refreshToken: "mobile-refresh-token" },
    } as any,
    {
      status() {
        return this;
      },
      json() {
        return this;
      },
    } as any,
    () => {
      mobileRefreshPassed = true;
    },
  );
  assert.equal(mobileRefreshPassed, true);

  if (previousMobileSecret === undefined) {
    delete process.env.MOBILE_API_SECRET;
  } else {
    process.env.MOBILE_API_SECRET = previousMobileSecret;
  }
  if (previousNodeEnv === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = previousNodeEnv;
  }
});
