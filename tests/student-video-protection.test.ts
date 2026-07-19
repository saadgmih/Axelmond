import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("student-video-protection", () => {
  const studentCourseViewSource = readFileSync("src/views/student/StudentCourseView.tsx", "utf8");
  const sessionSource = readFileSync("src/hooks/useStudentCourseSession.ts", "utf8");
  const playerSource = readFileSync("src/components/PremiumVideoPlayer.tsx", "utf8");
  const lessonMediaRoutesSource = readFileSync("src/routes/lesson-media-routes.ts", "utf8");

  assert.match(studentCourseViewSource, /sanitizeCourseAttachmentUrl/);
  assert.match(studentCourseViewSource, /PdfLessonViewer/);
  assert.match(studentCourseViewSource, /selectedLessonContent\.type === "VIDEO" && safeAttachmentUrl/);
  assert.match(studentCourseViewSource, /PremiumVideoPlayer/);
  assert.match(studentCourseViewSource, /contentId=\{selectedLessonContent\.id\}/);
  assert.match(studentCourseViewSource, /activeSector="student"/);
  assert.match(studentCourseViewSource, /selectedModule\.attachmentUrl/);
  assert.match(studentCourseViewSource, /Vidéo à venir/);
  assert.match(studentCourseViewSource, /Contenu en préparation/);
  assert.match(
    studentCourseViewSource,
    /selectedLessonContent\.type !== "VIDEO" &&\s*selectedLessonContent\.type !== "IMAGE" && \([\s\S]*selectedLessonContent\.attachments\[0\]\?\.fileName \|\| "Contenu texte"/,
  );
  assert.doesNotMatch(studentCourseViewSource, /<video controls/);
  assert.doesNotMatch(studentCourseViewSource, /<iframe/);
  assert.doesNotMatch(studentCourseViewSource, /isVideoPlaying/);
  assert.doesNotMatch(studentCourseViewSource, /unsplash/);

  assert.doesNotMatch(sessionSource, /isVideoPlaying/);
  assert.doesNotMatch(sessionSource, /videoProgress/);
  assert.doesNotMatch(sessionSource, /videoSpeed/);

  assert.match(playerSource, /getLessonContentMediaSource\(contentId\)/);
  assert.match(playerSource, /sourceResolutionVersion/);
  assert.match(playerSource, /VIDEO_MAX_AUTOMATIC_RETRIES = 2/);
  assert.match(playerSource, /Mise en mémoire tampon/);
  assert.match(lessonMediaRoutesSource, /\/api\/lesson-contents\/:contentId\/media-source/);
  assert.match(lessonMediaRoutesSource, /\/api\/lesson-contents\/:contentId\/media/);
  assert.match(lessonMediaRoutesSource, /createLessonMediaTicket/);
  assert.match(lessonMediaRoutesSource, /Readable\.fromWeb/);
  assert.match(lessonMediaRoutesSource, /private, no-store/);
});
