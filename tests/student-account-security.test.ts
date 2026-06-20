import assert from "node:assert/strict";
import fs from "node:fs";
import { parsePlatformPath } from "../src/navigation/platformPaths.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("student-account-security", () => {
  const profileViewSource = fs.readFileSync("src/views/student/StudentProfileView.tsx", "utf8");
  const securityViewSource = fs.readFileSync("src/views/student/StudentAccountSecurityView.tsx", "utf8");
  const sharedSource = fs.readFileSync("src/views/shared/AccountSecurityView.tsx", "utf8");
  const sidebarConfigSource = fs.readFileSync("src/navigation/sidebar-config.ts", "utf8");
  const routeSwitchSource = fs.readFileSync("src/app/StudentRouteSwitch.tsx", "utf8");
  const platformPathsSource = fs.readFileSync("src/navigation/platformPaths.ts", "utf8");
  const lazyViewsSource = fs.readFileSync("src/lazyViews.tsx", "utf8");

  assert.doesNotMatch(profileViewSource, /SecuritySettingsPanel/);
  assert.match(securityViewSource, /AccountSecurityView/);
  assert.match(sharedSource, /SecuritySettingsPanel/);
  assert.match(sharedSource, /Sécurité du compte/);

  assert.match(sidebarConfigSource, /nav-account-security/);
  assert.match(sidebarConfigSource, /Sécurité du compte/);
  assert.match(sidebarConfigSource, /navigateTo\("account-security"\)/);

  assert.match(routeSwitchSource, /currentView === "account-security"/);
  assert.match(routeSwitchSource, /LazyStudentAccountSecurityView/);
  assert.match(platformPathsSource, /"account-security"/);
  assert.match(lazyViewsSource, /LazyStudentAccountSecurityView/);

  assert.deepEqual(parsePlatformPath("/student/account-security"), {
    studentView: "account-security",
    teacherView: "dashboard",
    institutionalView: null,
  });

  console.log("Student account security routing tests passed");
});
