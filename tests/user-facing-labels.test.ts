import assert from "node:assert/strict";
import fs from "node:fs";
import { formatInvoiceReference, formatLessonContentTypeLabel, formatTicketReference } from "../src/utils/user-facing-labels.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("user-facing-labels", () => {
  assert.equal(formatLessonContentTypeLabel("VIDEO"), "Vidéo");
  assert.equal(formatLessonContentTypeLabel("PDF"), "Document PDF");
  assert.equal(formatInvoiceReference("INV-PAYPAL-12345"), "Reçu n° 12345");
  assert.equal(formatInvoiceReference("INV-FREE-67890"), "Reçu n° 67890");
  assert.equal(formatTicketReference("TK-123456"), "Ticket n° 123456");
});

rulesTest("no-technical-ids-in-ui", () => {
  const curriculumModules = fs.readFileSync("src/views/teacher/curriculum-steps/CurriculumModulesStep.tsx", "utf8");
  const curriculumChapters = fs.readFileSync("src/views/teacher/curriculum-steps/CurriculumChaptersStep.tsx", "utf8");
  const curriculumOutline = fs.readFileSync("src/views/teacher/curriculum-steps/CurriculumOutlineStep.tsx", "utf8");
  const curriculumMedia = fs.readFileSync("src/views/teacher/curriculum-steps/CurriculumMediaStep.tsx", "utf8");
  const curriculumStepper = fs.readFileSync("src/views/teacher/curriculum-steps/CurriculumStepper.tsx", "utf8");
  const studentProfile = fs.readFileSync("src/views/student/StudentProfileView.tsx", "utf8");
  const teacherDashboard = fs.readFileSync("src/views/teacher/TeacherDashboardView.tsx", "utf8");
  const teacherCurriculum = fs.readFileSync("src/hooks/useTeacherCurriculum.tsx", "utf8");

  assert.doesNotMatch(curriculumModules, /ID \{course\.id\}/);
  assert.doesNotMatch(curriculumModules, /Modifier le module #/);
  assert.doesNotMatch(curriculumChapters, /Chapitre ID:/);
  assert.doesNotMatch(curriculumChapters, /Section ID:/);
  assert.doesNotMatch(curriculumOutline, /ID \{section\.id\}/);
  assert.doesNotMatch(curriculumMedia, /ID: \{content\.id\}/);
  assert.doesNotMatch(curriculumStepper, /ID \{managedCourse\.id\}/);
  assert.doesNotMatch(studentProfile, /ID-\$\{/);
  assert.doesNotMatch(teacherDashboard, /Module #\$\{/);
  assert.doesNotMatch(teacherCurriculum, /UploadThing/);
  assert.doesNotMatch(teacherCurriculum, /enregistré en base/);
  assert.doesNotMatch(teacherCurriculum, /ID \$\{/);

  console.log("No technical IDs in UI rules passed");
});
