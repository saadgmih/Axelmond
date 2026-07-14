import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readApiRouteSources } from "./helpers/api-route-sources.ts";

import { rulesTest } from "./helpers/rulesTest.ts";

import { readAppSources } from "./helpers/app-sources.ts";
import { readCurriculumViewSources } from "./helpers/live-classroom-sources.ts";

rulesTest("professor-course-ownership", () => {
  const serverSource = readApiRouteSources();
  const appSource =
    readAppSources() +
    readCurriculumViewSources() +
    readFileSync("src/app/hooks/usePlatformCatalogData.ts", "utf8") +
    readFileSync("src/views/teacher/TeacherLiveControlView.tsx", "utf8") +
    readFileSync("src/views/teacher/TeacherDashboardView.tsx", "utf8");
  const dashboardHookSource = readFileSync("src/hooks/useTeacherDashboard.ts", "utf8");
  const projectMap = readFileSync("PROJECT_MAP.md", "utf8");

  assert.match(serverSource, /buildCatalogCourseVisibilityWhere\([\s\S]*?role: authUser\?\.role/);
  assert.match(
    readFileSync("src/catalog-visibility.ts", "utf8"),
    /role === "PROFESSOR" \|\| role === "RESEARCHER"[\s\S]*?OR: \[\{ createdById: userId \|\| undefined \}, \{ createdById: null, instructor: fullName \|\| undefined \}\]/,
  );
  assert.doesNotMatch(serverSource, /OR:\s*\[\{ createdById: authUser\.id \},\s*\{ published: true \}\]/);

  assert.match(appSource, /function canManageWorkspaceCourse/);
  assert.match(appSource, /course\.createdById === currentUser\.id \|\| course\.instructor === currentUser\.fullName/);
  assert.match(appSource, /currentUser[\s\S]*?getFreshSessionToken\(\)[\s\S]*?api\.getCourses\(/);
  assert.match(dashboardHookSource, /getFreshSessionToken\(\)[\s\S]*?api\.getDomains\(\)[\s\S]*?api\.getCourses\(\)/);
  assert.match(appSource, /managedCourses\.map\(\(c\) =>/);
  assert.match(appSource, /<option key=\{c\.id\} value=\{c\.id\}/);
  assert.match(appSource, /quizCourseId/);
  assert.match(
    appSource + readFileSync("src/utils/live-course-selection.ts", "utf8"),
    /findLiveCourse\([\s\S]*?liveCourseId\)|resolveLiveCourseId\([\s\S]*?liveCourseId\)/,
  );
  assert.match(
    appSource,
    /managedCourses\.filter\(c => c\.published\)\.length|managedCourses\.filter\(\(course\) => course\.published\)/,
  );
  assert.match(appSource, /managedCourses\.map\(\(course\)|managedCourses\.map\(\(c, idx\) =>/);

  assert.match(projectMap, /Professor\/Researcher course ownership/);

  console.log("Professor course ownership rules passed");
});
