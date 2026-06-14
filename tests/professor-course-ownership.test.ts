import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readApiRouteSources } from "./helpers/api-route-sources.ts";
import { readProfessorCourseOwnershipSources } from "./helpers/professor-course-ownership-sources.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("professor-course-ownership", () => {
  const serverSource = readApiRouteSources();
  const teacherSource = readProfessorCourseOwnershipSources();
  const projectMap = readFileSync("PROJECT_MAP.md", "utf8");

  assert.match(
    serverSource,
    /app\.get\("\/api\/courses"[\s\S]*?authUser && \(authUser\.role === "PROFESSOR" \|\| authUser\.role === "RESEARCHER"\)[\s\S]*?\{ createdById: authUser\.id \}/,
  );
  assert.doesNotMatch(serverSource, /OR:\s*\[\{ createdById: authUser\.id \},\s*\{ published: true \}\]/);

  assert.match(teacherSource, /managedCourses\.map\(\(c\) => \(\s*<option key=\{c\.id\} value=\{c\.id\}/);
  assert.match(teacherSource, /loadTeacherQuizzes\(quizCourseId\)/);
  assert.match(teacherSource, /managedCourses\.filter\(\(course\) => course\.published\)\.length/);
  assert.match(teacherSource, /courses\.find\(\(course\) => course\.id === liveCourseId\)/);
  assert.match(teacherSource, /managedCourses\.map\(\(course\) =>/);

  assert.match(projectMap, /Professor\/Researcher course ownership/);
});
