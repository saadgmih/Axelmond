import assert from "node:assert/strict";
import fs from "node:fs";
import { readApiRouteSources, readServerBootstrapSources } from "./helpers/api-route-sources.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("security-score-guards", () => {
  const bootstrap = readServerBootstrapSources();
  const apiSource = readApiRouteSources();
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8")) as {
    overrides?: Record<string, string>;
    scripts?: Record<string, string>;
  };

  const controls: Array<{ id: string; weight: number; ok: boolean }> = [
    { id: "helmet-headers", weight: 8, ok: /helmet\(/.test(bootstrap) && /Permissions-Policy/.test(bootstrap) },
    { id: "mobile-spoof-guard", weight: 8, ok: /mobileClientSpoofGuard/.test(bootstrap) },
    { id: "csrf-protection", weight: 7, ok: /csrfProtection/.test(bootstrap) },
    { id: "rate-limits", weight: 7, ok: /globalRateLimiter/.test(bootstrap) && /refreshRateLimiter/.test(bootstrap) },
    { id: "rbac-default-deny", weight: 8, ok: /requireRbac/.test(apiSource) && /canAccessApiRoute/.test(apiSource) },
    { id: "refresh-token-hash", weight: 7, ok: /hashRefreshToken/.test(bootstrap) },
    {
      id: "production-config",
      weight: 8,
      ok: /assertProductionConfiguration/.test(fs.readFileSync("src/production-config.ts", "utf8")),
    },
    { id: "cache-timeout", weight: 5, ok: /CACHE_OPERATION_TIMEOUT_MS/.test(fs.readFileSync("src/cache.ts", "utf8")) },
    {
      id: "catalog-timeout",
      weight: 5,
      ok: /CATALOG_QUERY_TIMEOUT_MS/.test(fs.readFileSync("src/routes/courses-routes.ts", "utf8")),
    },
    {
      id: "deploy-preflight",
      weight: 5,
      ok: /security-preflight/.test(fs.readFileSync("scripts/deploy-hostinger.sh", "utf8")),
    },
    { id: "npm-ws-override", weight: 6, ok: packageJson.overrides?.ws === "^8.21.0" },
    { id: "security-preflight-script", weight: 4, ok: packageJson.scripts?.["security:preflight"] !== undefined },
    {
      id: "hostinger-env-mobile-secret",
      weight: 5,
      ok: /MOBILE_CLIENT_SECRET/.test(fs.readFileSync("scripts/build-hostinger-env.mjs", "utf8")),
    },
    { id: "paypal-webhook-verify", weight: 7, ok: /verifyPayPalWebhookSignature/.test(apiSource) },
    { id: "upload-validation", weight: 6, ok: /isDangerousFile/.test(fs.readFileSync("src/uploadthing.ts", "utf8")) },
  ];

  const totalWeight = controls.reduce((sum, item) => sum + item.weight, 0);
  const earned = controls.filter((item) => item.ok).reduce((sum, item) => sum + item.weight, 0);
  const score = Math.round((earned / totalWeight) * 100);

  const failed = controls.filter((item) => !item.ok);
  assert.equal(failed.length, 0, `Security score guards missing: ${failed.map((item) => item.id).join(", ")}`);
  assert.ok(score >= 95, `Estimated codebase security score ${score}/100 is below 95/100 target`);

  console.log(`Security score guards passed — estimated codebase score: ${score}/100`);
});
