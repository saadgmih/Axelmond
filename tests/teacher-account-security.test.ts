import assert from "node:assert/strict";
import fs from "node:fs";
import { parsePlatformPath } from "../src/navigation/platformPaths.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("teacher-account-security", () => {
  const profileViewSource = fs.readFileSync("src/views/teacher/TeacherAcademicProfileView.tsx", "utf8");
  const securityViewSource = fs.readFileSync("src/views/teacher/TeacherAccountSecurityView.tsx", "utf8");
  const sharedSource = fs.readFileSync("src/views/shared/AccountSecurityView.tsx", "utf8");
  const sidebarConfigSource = fs.readFileSync("src/navigation/sidebar-config.ts", "utf8");
  const routeSwitchSource = fs.readFileSync("src/app/TeacherRouteSwitch.tsx", "utf8");
  const platformPathsSource = fs.readFileSync("src/navigation/platformPaths.ts", "utf8");
  const lazyViewsSource = fs.readFileSync("src/lazyViews.tsx", "utf8");
  const academicHookSource = fs.readFileSync("src/hooks/useAcademicProfile.ts", "utf8");

  assert.doesNotMatch(profileViewSource, /SecuritySettingsPanel/);
  assert.doesNotMatch(profileViewSource, /handleChangeAcademicPassword/);
  assert.match(securityViewSource, /AccountSecurityView/);
  assert.match(securityViewSource, /getProfileRoleTheme/);
  assert.match(sharedSource, /SecuritySettingsPanel/);
  assert.match(sharedSource, /AccountPasswordChangeForm/);
  assert.match(sharedSource, /PrivilegedMfaSetupBanner/);
  assert.doesNotMatch(profileViewSource, /multi-facteurs/);
  assert.match(academicHookSource, /isMfaSetupRequiredError/);

  assert.match(sidebarConfigSource, /setTeacherView\("account-security"\)/);
  assert.match(sidebarConfigSource, /Sécurité du compte/);

  assert.match(routeSwitchSource, /teacherView === "account-security"/);
  assert.match(routeSwitchSource, /LazyTeacherAccountSecurityView/);
  assert.match(platformPathsSource, /TEACHER_VIEWS[\s\S]*"account-security"/);
  assert.match(lazyViewsSource, /LazyTeacherAccountSecurityView/);
  assert.doesNotMatch(academicHookSource, /academicPasswordForm/);

  assert.deepEqual(parsePlatformPath("/teacher/account-security"), {
    studentView: "dashboard",
    teacherView: "account-security",
    institutionalView: null,
  });

  console.log("Teacher account security routing tests passed");
});
