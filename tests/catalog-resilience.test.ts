import assert from "node:assert/strict";
import fs from "node:fs";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("catalog-resilience", () => {
  const catalogHookSource = fs.readFileSync("src/app/hooks/usePlatformCatalogData.ts", "utf8");
  const appRootSource = fs.readFileSync("src/app/PlatformAppRoot.tsx", "utf8");
  const clientErrorsSource = fs.readFileSync("src/client-errors.ts", "utf8");
  const coursesRoutesSource = fs.readFileSync("src/routes/courses-routes.ts", "utf8");

  assert.match(clientErrorsSource, /isTransientCatalogError/);
  assert.match(clientErrorsSource, /CATALOG_TIMEOUT/);

  assert.match(catalogHookSource, /Promise\.allSettled/);
  assert.match(catalogHookSource, /CATALOG_RETRY_DELAYS_MS/);
  assert.match(catalogHookSource, /CATALOG_AUTO_RETRY_INTERVAL_MS/);
  assert.match(catalogHookSource, /catalogHasData/);
  assert.match(catalogHookSource, /api\.getCourses\(\)/);
  assert.match(catalogHookSource, /api\.getDomains\(\)/);

  assert.match(appRootSource, /catalogError && !session\.catalogHasData/);
  assert.doesNotMatch(appRootSource, /catalogError\)[\s\S]*?LazyAuthScreen/);

  assert.match(coursesRoutesSource, /CATALOG_TIMEOUT/);

  console.log("Catalog resilience rules passed");
});
