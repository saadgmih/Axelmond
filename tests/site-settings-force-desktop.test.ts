import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { readApiRouteSources } from "./helpers/api-route-sources.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("site-settings-force-desktop", () => {
  const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
  const apiSource = fs.readFileSync("src/api.ts", "utf8");
  const appSource = fs.readFileSync("src/app/usePlatformApp.ts", "utf8");
  const dashboardHookSource = fs.readFileSync("src/hooks/useTeacherDashboard.ts", "utf8");
  const adminViewSource = fs.readFileSync("src/views/teacher/AdminProfessorAccessKeysView.tsx", "utf8");
  const forceDesktopSource = fs.readFileSync("src/utils/force-desktop-mode.ts", "utf8");
  const cssSource = fs.readFileSync("src/index.css", "utf8");
  const rbacSource = fs.readFileSync("src/rbac.ts", "utf8");
  const routeSources = readApiRouteSources();
  const migrationSource = fs.readFileSync(
    path.join("prisma", "migrations", "20260630090000_site_settings", "migration.sql"),
    "utf8",
  );

  assert.match(schema, /model SiteSetting/);
  assert.match(schema, /key\s+String\s+@id/);
  assert.match(schema, /value\s+Json/);
  assert.match(migrationSource, /CREATE TABLE "AxelmondResearchLab"\."SiteSetting"/);
  assert.match(migrationSource, /'forceDesktopMode'/);
  assert.match(migrationSource, /'false'::jsonb/);

  assert.match(routeSources, /app\.get\("\/api\/site-settings"/);
  assert.match(routeSources, /app\.get\("\/api\/admin\/site-settings",\s*requireAuth,\s*requireAdmin/);
  assert.match(routeSources, /app\.put\("\/api\/admin\/site-settings",\s*requireAuth,\s*requireAdmin/);
  assert.match(routeSources, /Public site settings unavailable/);
  assert.match(routeSources, /Admin site settings update failed/);
  assert.match(rbacSource, /cleanPath === "\/api\/site-settings"/);

  assert.match(apiSource, /getSiteSettings/);
  assert.match(apiSource, /getAdminSiteSettings/);
  assert.match(apiSource, /updateAdminSiteSettings/);

  assert.match(appSource, /api\s*\.\s*getSiteSettings\(\)/);
  assert.match(appSource, /applyForceDesktopMode\(settings\.forceDesktopMode\)/);
  assert.match(appSource, /isLoading:\s*isLoading \|\| !isSiteSettingsReady/);

  assert.match(dashboardHookSource, /handleUpdateForceDesktopMode/);
  assert.match(dashboardHookSource, /api\.updateAdminSiteSettings/);
  assert.match(adminViewSource, /Forcer le mode ordinateur/);
  assert.match(adminViewSource, /aria-pressed=\{siteSettings\.forceDesktopMode\}/);

  assert.match(forceDesktopSource, /width=1280/);
  assert.match(forceDesktopSource, /viewport\.content = enabled/);
  assert.match(cssSource, /html\.force-desktop-mode/);
  assert.match(cssSource, /min-width:\s*1280px/);
});

console.log("Site settings force desktop rules passed");
