import assert from "node:assert/strict";import { readFileSync } from "node:fs";import { readApiRouteSources } from "./helpers/api-route-sources.ts";import { readAppSources } from "./helpers/app-sources.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("professor-course-ownership", () => {
const serverSource = readApiRouteSources();
const appSource = readAppSources();
const projectMap = readFileSync("PROJECT_MAP.md", "utf8");

assert.match(serverSource, /app\.get\("\/api\/courses"[\s\S]*?authUser && \(authUser\.role === "PROFESSOR" \|\| authUser\.role === "RESEARCHER"\)[\s\S]*?\{ createdById: authUser\.id \}/);
assert.doesNotMatch(serverSource, /OR:\s*\[\{ createdById: authUser\.id \},\s*\{ published: true \}\]/);

assert.match(appSource, /managedCourses\.map\(\(c\) => <option key=\{c\.id\} value=\{c\.id\}>\{c\.title\}<\/option>\)/);
assert.match(appSource, /managedCourses\.find\(c => c\.id === quizCourseId\)\?\.modules/);
assert.match(appSource, /managedCourses\.map\(\(c\) => \(\s*<option key=\{c\.id\} value=\{c\.id\}>/);
assert.match(appSource, /const selectedLiveCourse = managedCourses\.find\(\(c\) => c\.id === liveCourseId\)/);
assert.match(appSource, /managedCourses\.filter\(c => c\.published\)\.length/);
assert.match(appSource, /managedCourses\.map\(\(c, idx\) =>/);

assert.match(projectMap, /Professor\/Researcher course ownership/);

});
