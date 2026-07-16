import { describe, expect, test } from "vitest";
import {
  REQUIRED_CSP_DIRECTIVES,
  runSecurityProbe,
  validateContentSecurityPolicy,
} from "../scripts/security-probe.mjs";

const completeCsp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "font-src 'self' data:",
  "img-src 'self' data:",
  "connect-src 'self'",
  "media-src 'self'",
  "frame-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "upgrade-insecure-requests",
].join("; ");

describe("security probe", () => {
  test("rejects the Hostinger upgrade-only CSP", () => {
    const result = validateContentSecurityPolicy("upgrade-insecure-requests");
    expect(result.ok).toBe(false);
    expect(result.onlyUpgradeInsecureRequests).toBe(true);
    expect(result.missing).toEqual(expect.arrayContaining(REQUIRED_CSP_DIRECTIVES));
  });

  test("accepts a complete static CSP without unsafe inline sources", () => {
    expect(validateContentSecurityPolicy(completeCsp)).toMatchObject({
      ok: true,
      missing: [],
      hasScriptNonce: false,
      hasStyleNonce: false,
      unsafeInline: false,
    });
  });

  test("checks CSP as part of the production security score", async () => {
    const fetchImpl = async (input: string | URL) => {
      const path = new URL(String(input)).pathname;
      const headers = {
        "content-security-policy": completeCsp,
        "strict-transport-security": "max-age=31536000",
        "cross-origin-opener-policy": "same-origin",
        "cross-origin-resource-policy": "same-site",
      };
      if (path === "/api/health") return new Response('{"status":"UP"}', { status: 200, headers });
      if (path === "/api/mobile/routes") {
        return new Response('{"code":"MOBILE_CLIENT_REJECTED"}', { status: 403, headers });
      }
      return new Response("[]", { status: 200, headers });
    };

    await expect(
      runSecurityProbe({ baseUrl: "https://example.test", fetchImpl, log: () => undefined }),
    ).resolves.toMatchObject({ ok: true, score: 100 });
  });
});
