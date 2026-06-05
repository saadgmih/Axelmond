import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const serverSource = readFileSync("server.ts", "utf8");
const appSource = readFileSync("src/App.tsx", "utf8");
const projectMap = readFileSync("PROJECT_MAP.md", "utf8");

const coursesRoute = serverSource.slice(
  serverSource.indexOf('app.get("/api/courses"'),
  serverSource.indexOf("// POST /api/courses")
);

assert.match(coursesRoute, /authUser && \(authUser\.role === "PROFESSOR" \|\| authUser\.role === "RESEARCHER"\)\s*\?\s*\{ createdById: authUser\.id \}/);
assert.doesNotMatch(coursesRoute, /OR:\s*\[\{ createdById: authUser\.id \},\s*\{ published: true \}\]/);

assert.match(appSource, /managedCourses\.map\(\(c\) => <option key=\{c\.id\} value=\{c\.id\}>\{c\.title\}<\/option>\)/);
assert.match(appSource, /managedCourses\.find\(c => c\.id === quizCourseId\)\?\.modules/);
assert.match(appSource, /managedCourses\.map\(\(c\) => \(\s*<option key=\{c\.id\} value=\{c\.id\}>/);
assert.match(appSource, /const selectedLiveCourse = managedCourses\.find\(\(c\) => c\.id === liveCourseId\)/);
assert.match(appSource, /managedCourses\.filter\(c => c\.published\)\.length/);
assert.match(appSource, /managedCourses\.map\(\(c, idx\) =>/);

assert.match(projectMap, /Professor\/Researcher course ownership/);

console.log("Professor course ownership rules passed");
