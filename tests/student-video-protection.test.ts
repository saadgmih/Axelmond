import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const studentCourseViewSource = readFileSync("src/views/student/StudentCourseView.tsx", "utf8");

assert.match(studentCourseViewSource, /selectedLessonContent\.type === "VIDEO" && selectedLessonContent\.attachments\[0\]\?\.url/);
assert.match(studentCourseViewSource, /PremiumVideoPlayer/);
assert.match(studentCourseViewSource, /activeSector="student"/);
assert.doesNotMatch(studentCourseViewSource, /<video controls/);

console.log("Student video playback protection rules passed");
