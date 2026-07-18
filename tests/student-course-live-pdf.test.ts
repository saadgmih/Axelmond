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
  assert.match(pdfViewerSource, /timeoutMs:\s*30_000/);
  assert.match(pdfViewerSource, /WAITING_FOR_SESSION/);
  assert.match(pdfViewerSource, /TEMPORARY_ERROR/);
  assert.match(pdfViewerSource, /Réessayer/);
  assert.doesNotMatch(pdfViewerSource, /numPages \|\| "\?"/);
  assert.match(pdfViewerSource, /new URL\(\s*"pdfjs-dist\/build\/pdf\.worker\.min\.mjs",\s*import\.meta\.url/);
  assert.doesNotMatch(pdfViewerSource, /unpkg\.com\/pdfjs-dist/);
  assert.doesNotMatch(pdfViewerSource, /downloadUrl/);
  assert.doesNotMatch(pdfViewerSource, /Ouvrir le PDF/);
  assert.match(pdfViewerSource, /mediaType === "IMAGE"/);
  assert.match(pdfViewerSource, /type ImageViewMode = "width" \| "screen" \| "actual"/);
  assert.match(pdfViewerSource, /handleImageFitWidth/);
  assert.match(pdfViewerSource, /handleImageFitScreen/);
  assert.match(pdfViewerSource, /handleImageResetZoom/);
  assert.match(pdfViewerSource, /onPointerDown=\{handleImagePointerDown\}/);
  assert.match(pdfViewerSource, /cursor-grab/);
  assert.match(pdfViewerSource, /naturalWidth/);
  assert.match(pdfViewerSource, /imageRenderWidth/);
  assert.match(pdfViewerSource, /Ajuster à la largeur/);
  assert.match(pdfViewerSource, /Ajuster à l'écran/);
  assert.match(pdfViewerSource, /Réinitialiser le zoom à 100%/);
  assert.doesNotMatch(pdfViewerSource, /FitMode|fitMode|setFitMode/);
  assert.doesNotMatch(pdfViewerSource, /Ajuster à la page/);
  assert.doesNotMatch(pdfViewerSource, /renderHeight|height=\{renderHeight\}/);
  assert.match(pdfViewerSource, /const renderWidth = Math\.round\(baseReadingWidth \* scale\)/);
  assert.doesNotMatch(pdfViewerSource, />\s*Largeur\s*</);
  assert.match(pdfViewerSource, /toolbarDividerClass/);
  assert.match(pdfViewerSource, /Fullscreen/);
  assert.match(pdfViewerSource, /touch-target/);
  assert.match(pdfViewerSource, /pointer-events-none absolute inset-0/);
  assert.match(pdfViewerSource, /isPseudoFullscreen/);
  assert.doesNotMatch(pdfViewerSource, /download=\{title \|\| "document\.pdf"\}/);
  assert.match(
    studentCourseViewSource,
    /selectedLessonContent\.type !== "VIDEO" &&\s*selectedLessonContent\.type !== "IMAGE"/,
  );

  assert.match(contentRoutesSource, /\/api\/lesson-contents\/:contentId\/document/);
  assert.match(contentRoutesSource, /result\.contentType/);
  assert.match(contentRoutesSource, /no-store/);

  assert.match(lessonDocumentSource, /content\.type !== "PDF" && content\.type !== "IMAGE"/);
  assert.match(lessonDocumentSource, /contentType/);
  assert.match(lessonDocumentSource, /isExpectedDocumentPayload/);
  assert.match(lessonDocumentSource, /text\/html/);

  assert.match(rbacSource, /lesson-contents.*document\|media-source/);
  assert.match(serverSource, /streamLessonContentDocument/);

  console.log("Student course live/pdf rules passed");
});
