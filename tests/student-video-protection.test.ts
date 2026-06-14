import assert from "node:assert/strict";import { readFileSync } from "node:fs";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("student-video-protection", () => {
const studentCourseViewSource = readFileSync("src/views/student/StudentCourseView.tsx", "utf8");
const sessionSource = readFileSync("src/hooks/useStudentCourseSession.ts", "utf8");

assert.match(studentCourseViewSource, /sanitizeCourseAttachmentUrl/);
assert.match(studentCourseViewSource, /sandbox="allow-same-origin allow-popups allow-forms"/);
assert.match(studentCourseViewSource, /referrerPolicy="no-referrer"/);
assert.match(studentCourseViewSource, /selectedLessonContent\.type === "VIDEO" && safeAttachmentUrl/);
assert.match(studentCourseViewSource, /PremiumVideoPlayer/);
assert.match(studentCourseViewSource, /activeSector="student"/);
assert.match(studentCourseViewSource, /selectedModule\.attachmentUrl/);
assert.match(studentCourseViewSource, /Vidéo à venir/);
assert.match(studentCourseViewSource, /Contenu en préparation/);
assert.doesNotMatch(studentCourseViewSource, /<video controls/);
assert.doesNotMatch(studentCourseViewSource, /isVideoPlaying/);
assert.doesNotMatch(studentCourseViewSource, /unsplash/);

assert.doesNotMatch(sessionSource, /isVideoPlaying/);
assert.doesNotMatch(sessionSource, /videoProgress/);
assert.doesNotMatch(sessionSource, /videoSpeed/);

});
