import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("server-routes-modular", () => {
  const root = process.cwd();
  const routesDir = path.join(root, "src", "routes");
  const maxRouteModuleLines: Record<string, number> = {
    "auth-routes.ts": 50,
  };
  const authSubmodules = [
    "auth/register-login-routes.ts",
    "auth/session-routes.ts",
    "auth/email-verification-routes.ts",
    "auth/password-routes.ts",
  ];
  const defaultMaxRouteModuleLines = 900;
  const maxBootstrapLines = 600;

  const expectedModules = [
    "admin-routes.ts",
    "auth-routes.ts",
    "content-routes.ts",
    "catalog-routes.ts",
    "grades-routes.ts",
    "courses-routes.ts",
    "live-routes.ts",
    "misc-routes.ts",
    "objectives-routes.ts",
    "payments-routes.ts",
    "profile-routes.ts",
    "quiz-routes.ts",
  ];

  for (const fileName of expectedModules) {
    assert.ok(fs.existsSync(path.join(routesDir, fileName)), `Missing route module ${fileName}`);
  }

  for (const fileName of authSubmodules) {
    assert.ok(fs.existsSync(path.join(routesDir, fileName)), `Missing auth submodule ${fileName}`);
  }

  const registerSource = fs.readFileSync(path.join(routesDir, "register-api-routes.ts"), "utf8");
  for (const registerFn of [
    "registerAdminRoutes",
    "registerAuthRoutes",
    "registerProfileRoutes",
    "registerContentRoutes",
    "registerQuizRoutes",
    "registerCatalogRoutes",
    "registerGradesRoutes",
    "registerCoursesRoutes",
    "registerLiveRoutes",
    "registerMiscRoutes",
    "registerObjectivesRoutes",
    "registerPaymentsRoutes",
  ]) {
    assert.match(registerSource, new RegExp(registerFn));
  }

  const serverSource = fs.readFileSync(path.join(root, "server.ts"), "utf8");
  const createAppSource = fs.readFileSync(path.join(root, "src", "server", "create-app.ts"), "utf8");

  assert.match(serverSource, /startAxelmondServer/);
  assert.doesNotMatch(serverSource, /registerApiRoutes/);
  assert.doesNotMatch(serverSource, /app\.use\(\s*helmet/);
  assert.ok(serverSource.split("\n").length <= 15, "server.ts must remain a thin entrypoint");

  assert.match(createAppSource, /registerApiRoutes\(app,\s*routeCtx\)/);
  assert.match(createAppSource, /registerPayPalWebhook\(app,\s*routeCtx,\s*paypalWebhookRateLimiter\)/);
  assert.match(createAppSource, /registerMobileApiRoutes/);
  assert.match(createAppSource, /registerMessagingRoutes/);
  assert.doesNotMatch(createAppSource, /app\.get\("\/api\/domains"/);
  assert.ok(
    createAppSource.split("\n").length <= maxBootstrapLines,
    "create-app.ts should stay focused on HTTP bootstrap",
  );

  const routePathOwners = new Map<string, string>();

  const routeModulesToCheck = [...expectedModules, ...authSubmodules];

  for (const fileName of routeModulesToCheck) {
    const source = fs.readFileSync(path.join(routesDir, fileName), "utf8");
    const lineCount = source.split("\n").length;
    const maxLines = maxRouteModuleLines[fileName] ?? defaultMaxRouteModuleLines;
    assert.ok(
      lineCount <= maxLines,
      `${fileName} has ${lineCount} lines (max ${maxLines}) — split further if it grows`,
    );
    assert.doesNotMatch(source, /\/api\/api\./, `${fileName} must not contain double /api/api. prefixes`);

    const apiRoutePattern = /app\.(get|post|put|patch|delete)\(\s*"(\/api\/[^"]+)"/g;
    let match: RegExpExecArray | null;
    while ((match = apiRoutePattern.exec(source)) !== null) {
      const routeKey = `${match[1].toUpperCase()} ${match[2]}`;
      const existing = routePathOwners.get(routeKey);
      assert.ok(!existing, `Duplicate route ${routeKey} in ${fileName} and ${existing}`);
      routePathOwners.set(routeKey, fileName);
    }
  }
});
