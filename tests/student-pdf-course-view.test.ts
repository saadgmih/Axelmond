import { test, assert } from "vitest";
import fs from "node:fs";

test("student pdf course view guards and navigation isolation", () => {
  const navSource = fs.readFileSync("src/hooks/usePlatformNavigation.ts", "utf8");
  assert.match(
    navSource,
    /activeCourse\?\.modules\?\.some/,
    "usePlatformNavigation must check if the currentModule belongs to the activeCourse modules",
  );

  const studentCourseViewSource = fs.readFileSync("src/views/student/StudentCourseView.tsx", "utf8");
  assert.match(
    studentCourseViewSource,
    /!selectedLessonContent && selectedModule\.type === "pdf" && selectedModule\.attachmentUrl/,
    "StudentCourseView must render the PDF viewer when selectedModule has an attachmentUrl even without selectedLessonContent",
  );

  assert.match(
    studentCourseViewSource,
    /<PdfLessonViewer[\s\S]*?documentUrl=\{selectedModule\.attachmentUrl\}/,
    "StudentCourseView must pass documentUrl to PdfLessonViewer",
  );

  assert.match(
    studentCourseViewSource,
    /!\(selectedModule\.type === "pdf" && \(selectedModule\.contentMarkdown \|\| selectedModule\.attachmentUrl\)\)/,
    "StudentCourseView fallback info box must not trigger when attachmentUrl is present",
  );
});
