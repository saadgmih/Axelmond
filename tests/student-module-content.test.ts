import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readApiRouteSources } from "./helpers/api-route-sources.ts";
import { readAppSources } from "./helpers/app-sources.ts";

import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("student-module-content", () => {
  const appSource = readAppSources();
  const studentCourseSessionSource = readFileSync("src/hooks/useStudentCourseSession.ts", "utf8");
  const studentCourseBundle = appSource + studentCourseSessionSource;
  const studentCourseViewSource = readFileSync("src/views/student/StudentCourseView.tsx", "utf8");
  const serverSource = readApiRouteSources();

  assert.match(serverSource, /export function invalidateAuthUserCache\(userId: string\)/);
  assert.match(serverSource, /persistCoursePaymentEnrollment\(\{[\s\S]*auditAction:\s*"ENROLL_MOCK"/);
  assert.match(serverSource, /provider:\s*"MOCK"/);

  assert.match(studentCourseBundle, /refreshCourseContent\(selectedCourse\.id\)/);
  assert.match(appSource, /currentView === "course" && selectedCourse && selectedModule/);
  assert.match(appSource, /StudentCourseView/);
  assert.match(studentCourseViewSource, /selectedCourse\.title/);
  assert.match(studentCourseViewSource, /selectedLessonContent/);
  assert.match(studentCourseViewSource, /getContentCompletionLabel/);
  assert.match(studentCourseViewSource, /Marquer comme terminée/);
  assert.match(studentCourseViewSource, /Marquer comme consultée/);
  assert.match(studentCourseViewSource, /Annuler terminé/);
  assert.match(studentCourseViewSource, /markModuleCompleted\(selectedModule\.id,\s*false\)/);

  console.log("Student module content synchronization rules passed");
});
