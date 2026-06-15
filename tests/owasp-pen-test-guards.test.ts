import assert from "node:assert/strict";
import fs from "node:fs";
import { readApiRouteSources, readServerBootstrapSources } from "./helpers/api-route-sources.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("owasp-pen-test-guards", () => {
  const bootstrap = readServerBootstrapSources();
  const apiSource = readApiRouteSources();
  const authCsrf = fs.readFileSync("src/auth-csrf.ts", "utf8");
  const uploadthing = fs.readFileSync("src/uploadthing.ts", "utf8");
  const liveValidation = fs.readFileSync("src/live/live-sync-validation.ts", "utf8");
  const academicProfile = fs.readFileSync("src/academic-profile.ts", "utf8");
  const productionConfig = fs.readFileSync("src/production-config.ts", "utf8");
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  const owaspChecks: Array<{ id: string; ok: boolean; category: string }> = [
    {
      id: "A01-broken-access-control-rbac",
      ok: /requireRbac/.test(apiSource) && /canAccessApiRoute/.test(apiSource),
      category: "A01",
    },
    { id: "A01-ownership-verify-course", ok: /verifyCourseAccess/.test(apiSource), category: "A01" },
    {
      id: "A02-crypto-auth-token",
      ok: /verifyAuthToken/.test(apiSource) && /authTokenVersion/.test(apiSource) && /hashRefreshToken/.test(bootstrap),
      category: "A02",
    },
    { id: "A03-injection-prisma-only", ok: !/prisma\.\$queryRawUnsafe\(/.test(apiSource), category: "A03" },
    { id: "A03-injection-no-eval", ok: !/\beval\(/.test(apiSource), category: "A03" },
    {
      id: "A04-insecure-design-rate-limits",
      ok: /globalRateLimiter/.test(bootstrap) && /authRateLimiter/.test(bootstrap),
      category: "A04",
    },
    { id: "A05-security-misconfig-helmet", ok: /helmet\(/.test(bootstrap), category: "A05" },
    { id: "A05-production-config-guard", ok: /assertProductionConfiguration/.test(productionConfig), category: "A05" },
    { id: "A07-auth-fail-closed", ok: /Authentification requise/.test(apiSource), category: "A07" },
    { id: "A07-privileged-mfa-required", ok: /mfaSetupRequired/.test(apiSource) && /MFA_SETUP_REQUIRED/.test(apiSource), category: "A07" },
    {
      id: "A08-integrity-upload-validation",
      ok: /isDangerousFile/.test(uploadthing) && /isValidMimeType/.test(uploadthing),
      category: "A08",
    },
    { id: "A10-ssrf-live-allowlist", ok: /isAllowedLiveResourceHost/.test(liveValidation), category: "A10" },
    {
      id: "A10-ssrf-avatar-allowlist",
      ok: /isAllowedAvatarHost/.test(fs.readFileSync("src/avatar-security.ts", "utf8")),
      category: "A10",
    },
    {
      id: "csrf-double-submit",
      ok: /CSRF_TOKEN_INVALID/.test(authCsrf) && /hasMatchingCookieCsrf/.test(authCsrf.replace(/\s+/g, " ")),
      category: "CSRF",
    },
    { id: "xss-academic-links-https", ok: /sanitizeAcademicLinkField/.test(academicProfile), category: "XSS" },
    { id: "paypal-webhook-signature", ok: /verifyPayPalWebhookSignature/.test(apiSource), category: "Webhook" },
    { id: "http-test-supertest", ok: packageJson.devDependencies?.supertest !== undefined, category: "Testing" },
    {
      id: "rtl-testing-library",
      ok: packageJson.devDependencies?.["@testing-library/react"] !== undefined,
      category: "Testing",
    },
  ];

  const failed = owaspChecks.filter((check) => !check.ok);
  assert.equal(failed.length, 0, `OWASP guard failures: ${failed.map((entry) => entry.id).join(", ")}`);

  const categories = new Set(owaspChecks.map((check) => check.category));
  assert.ok(categories.size >= 8, "OWASP checklist must cover multiple categories");
});
