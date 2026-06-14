import assert from "node:assert/strict";import fs from "node:fs";import { readAppSources } from "./helpers/app-sources.ts";
import { readLiveClassroomSources } from "./helpers/live-classroom-sources.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("keyboard-navigation", () => {
const appSource = readAppSources();
const classroomSource = readLiveClassroomSources();
const paymentSource = fs.readFileSync("src/components/PaymentModal.tsx", "utf8");
const catalogSource = fs.readFileSync("src/views/student/StudentCatalogView.tsx", "utf8");
const dashboardSource = fs.readFileSync("src/views/student/StudentDashboardView.tsx", "utf8");
const cssSource = fs.readFileSync("src/index.css", "utf8");

assert.match(fs.readFileSync("src/hooks/useKeyboardShortcuts.ts", "utf8"), /export function useKeyboardShortcuts/);
assert.match(fs.readFileSync("src/hooks/useTvNavigation.ts", "utf8"), /export function useTvNavigation/);
assert.match(fs.readFileSync("src/components/KeyboardShortcutsHelp.tsx", "utf8"), /Raccourcis clavier/);

assert.match(appSource, /KeyboardShortcutsHelp/);
assert.match(appSource, /catalogSearchRef/);
assert.match(appSource, /useKeyboardShortcuts/);

assert.match(classroomSource, /useKeyboardShortcuts/);
assert.match(classroomSource, /onReconnectLive/);
assert.match(classroomSource, /data-tv-zone="live-controls"/);
assert.match(classroomSource, /ariaLabel=\{isMicEnabled \? "Couper le micro \(M\)" : "Activer le micro \(M\)"/);

assert.match(paymentSource, /close-payment-modal/);
assert.match(paymentSource, /kbd-nav-focus/);

assert.match(catalogSource, /useTvNavigation/);
assert.match(catalogSource, /data-tv-focusable/);
assert.match(catalogSource, /data-tv-zone="catalog"/);

assert.match(dashboardSource, /data-tv-zone="student-dashboard"/);

assert.match(cssSource, /focus-visible/);
assert.match(cssSource, /data-tv-focusable/);

});
