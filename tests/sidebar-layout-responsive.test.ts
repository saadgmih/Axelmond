import assert from "node:assert/strict";
import fs from "node:fs";
import { SIDEBAR_DOCK_MIN_WIDTH } from "../src/hooks/useSidebarLayout.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("sidebar-layout-responsive", () => {
  const sidebarSource = fs.readFileSync("src/components/Sidebar.tsx", "utf8");
  const layoutSource = fs.readFileSync("src/app/AuthenticatedPlatformLayout.tsx", "utf8");
  const cssSource = fs.readFileSync("src/index.css", "utf8");

  assert.equal(SIDEBAR_DOCK_MIN_WIDTH, 1024);

  assert.match(sidebarSource, /useSidebarLayout/);
  assert.match(sidebarSource, /sidebar-drawer/);
  assert.match(sidebarSource, /sidebar-collapse-toggle/);
  assert.match(sidebarSource, /isDockedHidden/);
  assert.match(sidebarSource, /isDockedVisible/);
  assert.match(sidebarSource, /floatingSidebarToggle/);
  assert.doesNotMatch(sidebarSource, /sidebar-identity-badges/);
  assert.doesNotMatch(sidebarSource, /formatCredits\(activeCredits\)/);
  assert.doesNotMatch(sidebarSource, /Rôle authentifié/);
  assert.doesNotMatch(sidebarSource, /Titre académique/);
  assert.doesNotMatch(sidebarSource, /sidebar-collapse-toggle--attached/);
  assert.doesNotMatch(sidebarSource, /inactive=\{/);
  assert.doesNotMatch(sidebarSource, /isSidebarHidden/);
  assert.match(sidebarSource, /lg:relative/);
  assert.doesNotMatch(sidebarSource, /md:relative/);

  assert.match(sidebarSource, /Utilisateur actuel/);
  assert.match(sidebarSource, /data-onboarding="profile-menu"/);
  assert.match(sidebarSource, /data-onboarding="platform-settings"/);
  assert.match(sidebarSource, /openCategoryId/);
  assert.match(sidebarSource, /aria-expanded=\{isOpen\}/);
  assert.match(sidebarSource, /data-sidebar-category/);
  assert.match(sidebarSource, /data-category-content/);
  assert.match(sidebarSource, /navGroups\.map\(renderCategory\)/);
  assert.match(sidebarSource, /<AccessibilityControls/);
  assert.doesNotMatch(sidebarSource, /\bX\b/);

  assert.match(layoutSource, /sidebar-drawer-backdrop/);
  assert.match(layoutSource, /createPortal/);
  assert.match(layoutSource, /isDrawer/);
  assert.doesNotMatch(layoutSource, /lg:hidden/);
  assert.doesNotMatch(layoutSource, /<Topbar/);
  assert.equal(fs.existsSync("src/components/Topbar.tsx"), false);
  assert.doesNotMatch(layoutSource, /!live\.isStudentLive/);

  const sidebarMountIndex = layoutSource.indexOf("<Sidebar");
  const backdropIndex = layoutSource.indexOf("sidebar-drawer-backdrop");
  assert.ok(sidebarMountIndex >= 0, "Sidebar should be mounted in layout");
  assert.ok(backdropIndex > sidebarMountIndex, "Backdrop should render after Sidebar in layout source");

  assert.match(cssSource, /sidebar-drawer/);
  assert.match(cssSource, /layout-floating-toggle/);
  assert.doesNotMatch(cssSource, /platform-topbar/);
  assert.doesNotMatch(cssSource, /topbar-collapse-toggle/);
  assert.match(cssSource, /min-width: 1024px/);

  console.log("Sidebar responsive layout rules passed");
});
