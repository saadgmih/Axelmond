import assert from "node:assert/strict";
import fs from "node:fs";
import { readApiRouteSources } from "./helpers/api-route-sources.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("student-course-live-pdf", () => {
  const studentCourseViewSource = fs.readFileSync("src/views/student/StudentCourseView.tsx", "utf8");
  const pdfViewerSource = fs.readFileSync("src/components/PdfLessonViewer.tsx", "utf8");
  const contentRoutesSource = fs.readFileSync("src/routes/content-routes.ts", "utf8");
  const lessonDocumentSource = fs.readFileSync("src/server/lesson-document.ts", "utf8");
  const rbacSource = fs.readFileSync("src/rbac.ts", "utf8");
  const serverSource = readApiRouteSources();

  assert.match(studentCourseViewSource, /selectedCourse\.isLiveNow/);
  assert.match(studentCourseViewSource, /PdfLessonViewer/);
  assert.doesNotMatch(studentCourseViewSource, /iframe[\s\S]*safeAttachmentUrl/);
  assert.doesNotMatch(studentCourseViewSource, /Contenus publiés/);
  assert.doesNotMatch(studentCourseViewSource, /<Download/);
  assert.doesNotMatch(studentCourseViewSource, /downloadUrl/);
  assert.doesNotMatch(studentCourseViewSource, /target="_blank"[\s\S]*safeAttachmentUrl/);

  assert.match(pdfViewerSource, /\/api\/lesson-contents\/\$\{contentId\}\/document/);
  assert.doesNotMatch(pdfViewerSource, /downloadUrl/);
  assert.doesNotMatch(pdfViewerSource, /Ouvrir le PDF/);
  assert.match(pdfViewerSource, /mediaType === "IMAGE"/);
  assert.doesNotMatch(pdfViewerSource, /FitMode|fitMode|setFitMode/);
  assert.doesNotMatch(pdfViewerSource, /Ajuster à la page/);
  assert.doesNotMatch(pdfViewerSource, /renderHeight|height=\{renderHeight\}/);
  assert.match(pdfViewerSource, /const renderWidth = Math\.round\(baseReadingWidth \* scale\)/);
  assert.match(pdfViewerSource, /scale === 1 \? "Largeur"/);

  assert.match(contentRoutesSource, /\/api\/lesson-contents\/:contentId\/document/);
  assert.match(contentRoutesSource, /result\.contentType/);
  assert.match(contentRoutesSource, /no-store/);

  assert.match(lessonDocumentSource, /content\.type !== "PDF" && content\.type !== "IMAGE"/);
  assert.match(lessonDocumentSource, /contentType/);

  assert.match(rbacSource, /lesson-contents.*\/document/);
  assert.match(serverSource, /streamLessonContentDocument/);

  console.log("Student course live/pdf rules passed");
});
