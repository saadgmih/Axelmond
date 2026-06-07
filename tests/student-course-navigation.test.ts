import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync("src/App.tsx", "utf8");
const courseContentSource = readFileSync("src/hooks/useCourseContent.ts", "utf8");
const studentCourseViewSource = readFileSync("src/views/student/StudentCourseView.tsx", "utf8");

assert.match(courseContentSource, /setSelectedLessonContent\(\(current\) =>/);
assert.match(courseContentSource, /return null;/);
assert.doesNotMatch(courseContentSource, /contents\[0\]/);

assert.match(appSource, /onModuleSelect=\{\(mod\) => \{/);
assert.match(appSource, /setSelectedModule\(mod\)/);
assert.match(appSource, /setSelectedLessonContent\(null\)/);

assert.match(studentCourseViewSource, /setSelectedLessonContent\(content\)/);
assert.match(studentCourseViewSource, /!selectedLessonContent && selectedModule\.type === "video"/);
assert.match(studentCourseViewSource, /selectedLessonContent &&/);

console.log("Student course navigation rules passed");
