import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const studentCourseViewSource = readFileSync("src/views/student/StudentCourseView.tsx", "utf8");
const sessionSource = readFileSync("src/hooks/useStudentCourseSession.ts", "utf8");

assert.match(studentCourseViewSource, /selectedLessonContent\.type === "VIDEO" && selectedLessonContent\.attachments\[0\]\?\.url/);
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

console.log("Student video playback protection rules passed");
