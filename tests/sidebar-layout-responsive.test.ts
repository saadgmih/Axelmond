import assert from "node:assert/strict";
import fs from "node:fs";
import { SIDEBAR_DOCK_MIN_WIDTH } from "../src/hooks/useSidebarLayout.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("sidebar-layout-responsive", () => {
  const sidebarSource = fs.readFileSync("src/components/Sidebar.tsx", "utf8");
  const topbarSource = fs.readFileSync("src/components/Topbar.tsx", "utf8");
  const layoutSource = fs.readFileSync("src/app/AuthenticatedPlatformLayout.tsx", "utf8");
  const cssSource = fs.readFileSync("src/index.css", "utf8");

  assert.equal(SIDEBAR_DOCK_MIN_WIDTH, 1024);

  assert.match(sidebarSource, /useSidebarLayout/);
  assert.match(sidebarSource, /sidebar-drawer/);
  assert.match(sidebarSource, /sidebar-collapse-toggle/);
  assert.match(sidebarSource, /isDockedHidden/);
  assert.match(sidebarSource, /isDockedVisible/);
  assert.match(sidebarSource, /closeDrawer/);
  assert.doesNotMatch(sidebarSource, /isSidebarHidden/);
  assert.match(sidebarSource, /lg:relative/);
  assert.doesNotMatch(sidebarSource, /md:relative/);

  assert.match(topbarSource, /useSidebarLayout/);
  assert.match(topbarSource, /platform-topbar/);
  assert.match(topbarSource, /layout-collapse-toggle-icon/);
  assert.match(topbarSource, /canCollapseTopbar/);
  assert.match(topbarSource, /justify-center/);
  assert.match(topbarSource, /lg:justify-end/);
  assert.doesNotMatch(topbarSource, /\bMenu\b/);

  assert.match(layoutSource, /sidebar-drawer-backdrop/);
  assert.match(layoutSource, /createPortal/);
  assert.match(layoutSource, /isDrawer/);
  assert.doesNotMatch(layoutSource, /lg:hidden/);

  const sidebarMountIndex = layoutSource.indexOf("<Sidebar");
  const backdropIndex = layoutSource.indexOf("sidebar-drawer-backdrop");
  assert.ok(sidebarMountIndex >= 0, "Sidebar should be mounted in layout");
  assert.ok(backdropIndex > sidebarMountIndex, "Backdrop should render after Sidebar in layout source");

  assert.match(cssSource, /sidebar-drawer/);
  assert.match(cssSource, /sidebar-shell-drawer/);
  assert.match(cssSource, /min-width: 1024px/);

  console.log("Sidebar responsive layout rules passed");
});
