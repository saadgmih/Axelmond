import assert from "node:assert/strict";
import fs from "node:fs";
import { readApiRouteSources } from "./helpers/api-route-sources.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("student-course-live-pdf", () => {
  const studentCourseViewSource = fs.readFileSync("src/views/student/StudentCourseView.tsx", "utf8");
  const pdfViewerSource = fs.readFileSync("src/components/PdfLessonViewer.tsx", "utf8");
  const contentRoutesSource = fs.readFileSync("src/routes/content-routes.ts", "utf8");
  const rbacSource = fs.readFileSync("src/rbac.ts", "utf8");
  const serverSource = readApiRouteSources();

  assert.match(studentCourseViewSource, /selectedCourse\.isLiveNow/);
  assert.match(studentCourseViewSource, /PdfLessonViewer/);
  assert.doesNotMatch(studentCourseViewSource, /iframe[\s\S]*safeAttachmentUrl/);
  assert.match(pdfViewerSource, /\/api\/lesson-contents\/\$\{contentId\}\/document/);
  assert.match(contentRoutesSource, /\/api\/lesson-contents\/:contentId\/document/);
  assert.match(rbacSource, /lesson-contents\/\[\^\/\]\+\\\/document/);
  assert.match(serverSource, /streamLessonContentDocument/);

  console.log("Student course live/pdf rules passed");
});
