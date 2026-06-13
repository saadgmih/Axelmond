import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { readAppSources } from "./helpers/app-sources.ts";

const root = process.cwd();
const appSource = readAppSources();
const appEntry = fs.readFileSync(path.join(root, "src/App.tsx"), "utf8");
const maxAppEntryLines = 40;
const maxRouteSwitchLines = 220;

assert.ok(appEntry.split("\n").length <= maxAppEntryLines, "App.tsx must stay a thin entrypoint");
assert.match(appEntry, /PlatformAppRoot/);
assert.doesNotMatch(appEntry, /usePlatformNavigation/);
assert.doesNotMatch(appEntry, /StudentDashboardView/);

assert.match(appSource, /PlatformAppProvider/);
assert.match(appSource, /usePlatformApp/);
assert.match(appSource, /StudentRouteSwitch/);
assert.match(appSource, /TeacherRouteSwitch/);
assert.match(appSource, /AuthenticatedPlatformLayout/);
assert.match(appSource, /LazyPaymentModal/);
assert.match(appSource, /useLiveKitSession/);

for (const fileName of ["StudentRouteSwitch.tsx", "TeacherRouteSwitch.tsx"]) {
  const source = fs.readFileSync(path.join(root, "src/app", fileName), "utf8");
  assert.ok(source.split("\n").length <= maxRouteSwitchLines, `${fileName} should stay focused on role routes`);
}

console.log("App modularization structure passed");
