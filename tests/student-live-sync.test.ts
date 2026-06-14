import assert from "node:assert/strict";
import fs from "node:fs";
import { readApiRouteSources } from "./helpers/api-route-sources.ts";
import { readAppSources } from "./helpers/app-sources.ts";

import { readLiveKitHookSources } from "./helpers/live-classroom-sources.ts";

import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("student-live-sync", () => {
  const apiSource = fs.readFileSync("src/api.ts", "utf8");
  const appSource = readAppSources();
  const studentCourseSessionSource = fs.readFileSync("src/hooks/useStudentCourseSession.ts", "utf8");
  const studentCourseBundle = appSource + studentCourseSessionSource;
  const liveKitSource = appSource + readLiveKitHookSources();
  const serverSource = readApiRouteSources();

  assert.doesNotMatch(apiSource, /enrollMock:/);
  assert.doesNotMatch(apiSource, /syncUser:/);
  assert.doesNotMatch(apiSource, /getUser:\s*\(/);

  assert.match(studentCourseSessionSource, /if \(!syncedUser\)/);
  assert.match(studentCourseSessionSource, /syncedUser\.enrolledCourses\?\.includes\(courseId\)/);
  assert.match(studentCourseSessionSource, /updateSessionUser\(syncedUser\)/);
  assert.doesNotMatch(studentCourseSessionSource, /await\s+api\.enrollMock\(courseId\)/);
  assert.doesNotMatch(studentCourseBundle, /setEnrolledCourses\(\(prev\)\s*=>\s*\[\.\.\.prev,\s*courseId\]\)/);
  assert.match(
    liveKitSource,
    /if\s*\(\(err as any\)\?\.status === 403 && currentUser && isStudentRole\(currentUser\.role\)\)/,
  );
  assert.match(liveKitSource, /const syncedUser = await api\.me\(\)/);
  assert.match(liveKitSource, /setCourseToPurchase\(activeLiveCourse\)/);

  assert.match(serverSource, /api\.persistCoursePaymentEnrollment\(/);
  assert.match(serverSource, /provider:\s*"MOCK"/);
  assert.match(serverSource, /user:\s*api\.toAppUser\(result\.user\)/);

  console.log("Student live synchronization rules passed");
});
