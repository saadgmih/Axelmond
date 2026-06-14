import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readApiRouteSources } from "./helpers/api-route-sources.ts";

import { rulesTest } from "./helpers/rulesTest.ts";

import { readAppSources } from "./helpers/app-sources.ts";
import { readCurriculumViewSources } from "./helpers/live-classroom-sources.ts";

rulesTest("professor-course-ownership", () => {
const serverSource = readApiRouteSources();
const appSource = readAppSources() + readCurriculumViewSources()
  + readFileSync("src/views/teacher/TeacherLiveControlView.tsx", "utf8")
  + readFileSync("src/views/teacher/TeacherDashboardView.tsx", "utf8");
const projectMap = readFileSync("PROJECT_MAP.md", "utf8");

assert.match(serverSource, /app\.get\("\/api\/courses"[\s\S]*?authUser && \(authUser\.role === "PROFESSOR" \|\| authUser\.role === "RESEARCHER"\)[\s\S]*?\{ createdById: authUser\.id \}/);
assert.doesNotMatch(serverSource, /OR:\s*\[\{ createdById: authUser\.id \},\s*\{ published: true \}\]/);

assert.match(appSource, /managedCourses\.map\(\(c\) =>/);
assert.match(appSource, /<option key=\{c\.id\} value=\{c\.id\}/);
assert.match(appSource, /quizCourseId/);
assert.match(appSource, /courses\.find\(\(course\) => course\.id === liveCourseId\)/);
assert.match(appSource, /managedCourses\.filter\(c => c\.published\)\.length|managedCourses\.filter\(\(course\) => course\.published\)/);
assert.match(appSource, /managedCourses\.map\(\(course\)|managedCourses\.map\(\(c, idx\) =>/);

assert.match(projectMap, /Professor\/Researcher course ownership/);

console.log("Professor course ownership rules passed");
});
