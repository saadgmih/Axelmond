import assert from "node:assert/strict";
import fs from "node:fs";
import { readApiRouteSources, readServerBootstrapSources } from "./helpers/api-route-sources.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("quality-score-guards", () => {
  const bootstrap = readServerBootstrapSources();
  const apiSource = readApiRouteSources();
  const liveValidation = fs.readFileSync("src/live/live-sync-validation.ts", "utf8");
  const authCsrf = fs.readFileSync("src/auth-csrf.ts", "utf8");
  const academicProfile = fs.readFileSync("src/academic-profile.ts", "utf8");
  const resourceStage = fs.readFileSync("src/components/live/LiveResourceStage.tsx", "utf8");
  const lazyViews = fs.readFileSync("src/lazyViews.tsx", "utf8");
  const institutionalSwitch = fs.readFileSync("src/views/InstitutionalViewSwitch.tsx", "utf8");
  const messagingRoutes = fs.readFileSync("src/messaging-routes.ts", "utf8");
  const viteConfig = fs.readFileSync("vite.config.ts", "utf8");
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const catalogIndexesMigration = fs.readFileSync(
    "prisma/migrations/20260615110000_catalog_enrollment_live_indexes/migration.sql",
    "utf8",
  );
  const dropInvoicesMigration = fs.readFileSync(
    "prisma/migrations/20260615100000_drop_user_invoices_json/migration.sql",
    "utf8",
  );

  const guards: Array<{ id: string; ok: boolean; weight: number }> = [
    {
      id: "paypal-webhook-rate-limit",
      ok:
        /paypalWebhookRateLimiter/.test(bootstrap) &&
        /registerPayPalWebhook\(app,\s*routeCtx,\s*paypalWebhookRateLimiter\)/.test(bootstrap),
      weight: 4,
    },
    {
      id: "module-progress-batch",
      ok:
        /getStudentCompletedModuleIdsByCourseIds/.test(apiSource) &&
        !/Promise\.all\(courses\.map\(\(course\)\s*=>\s*api\.toCourseForUser/.test(apiSource),
      weight: 4,
    },
    { id: "migration-schema-qualified", ok: /"AxelmondResearchLab"\."User"/.test(dropInvoicesMigration), weight: 2 },
    { id: "live-resource-host-allowlist", ok: /isAllowedLiveResourceHost/.test(liveValidation), weight: 4 },
    {
      id: "live-pdf-no-scripts",
      ok: /sandbox=/.test(resourceStage) && !/allow-scripts/.test(resourceStage),
      weight: 3,
    },
    {
      id: "csrf-mobile-no-fake-header",
      ok: /isMobileCsrfExempt/.test(authCsrf) && /hasValidMobileSessionCsrf/.test(authCsrf),
      weight: 4,
    },
    {
      id: "academic-links-https",
      ok: /sanitizeAcademicLinkField/.test(academicProfile) && /sanitizeHttpsUrl/.test(academicProfile),
      weight: 3,
    },
    {
      id: "catalog-db-indexes",
      ok:
        /Course_published_idx/.test(catalogIndexesMigration) &&
        /Enrollment_courseId_active_idx/.test(catalogIndexesMigration),
      weight: 3,
    },
    {
      id: "notification-fanout-batch",
      ok: /createNotificationsForUsers\(recipientIds/.test(messagingRoutes),
      weight: 3,
    },
    {
      id: "institutional-lazy-load",
      ok: /LazyAboutView/.test(lazyViews) && /LazyAboutView/.test(institutionalSwitch),
      weight: 3,
    },
    { id: "react-vendor-chunk", ok: /react-vendor/.test(viteConfig), weight: 2 },
    { id: "autoprefixer-removed", ok: packageJson.devDependencies?.autoprefixer === undefined, weight: 1 },
    {
      id: "jwt-types-dev-only",
      ok:
        packageJson.dependencies?.["@types/jsonwebtoken"] === undefined &&
        packageJson.devDependencies?.["@types/jsonwebtoken"] !== undefined,
      weight: 1,
    },
  ];

  const missing = guards.filter((guard) => !guard.ok).map((guard) => guard.id);
  assert.equal(missing.length, 0, `Quality score guards failed: ${missing.join(", ")}`);

  const baseline = 74;
  const uplift = guards.reduce((sum, guard) => sum + (guard.ok ? guard.weight : 0), 0);
  const estimatedGlobal = Math.min(100, baseline + uplift);

  assert.ok(estimatedGlobal >= 95, `Estimated global score ${estimatedGlobal}/100 is below target 95/100`);
});
