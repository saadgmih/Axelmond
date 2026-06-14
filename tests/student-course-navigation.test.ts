import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readAppSources } from "./helpers/app-sources.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("student-course-navigation", () => {
  const appSource = readAppSources();
  const courseContentSource = readFileSync("src/hooks/useCourseContent.ts", "utf8");
  const studentCourseViewSource = readFileSync("src/views/student/StudentCourseView.tsx", "utf8");

  assert.match(courseContentSource, /setSelectedLessonContent\(\(current\) =>/);
  assert.match(courseContentSource, /return null;/);
  assert.doesNotMatch(courseContentSource, /contents\[0\]/);

  assert.match(appSource, /onModuleSelect=\{\(mod\) => \{/);
  assert.match(appSource, /setSelectedModule\(mod\)/);
  assert.match(appSource, /setSelectedLessonContent\(null\)/);

  assert.match(studentCourseViewSource, /setSelectedLessonContent\(content\)/);
  assert.match(studentCourseViewSource, /!selectedLessonContent[\s\S]*?selectedModule\.type === "video"/);
  assert.match(studentCourseViewSource, /selectedLessonContent &&/);
});
