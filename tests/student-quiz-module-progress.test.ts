import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("student-quiz-module-progress", () => {
  const source = readFileSync("src/hooks/useStudentCourseSession.ts", "utf8");
  const quizRoutesSource = readFileSync("src/routes/quiz-routes.ts", "utf8");

  assert.match(source, /api\.submitQuizAttempt\(selectedCourse\.id,\s*selectedModule\.id,\s*quizAnswers\)/);
  assert.match(source, /setQuizQuestions\(correctedQuestions\)/);
  assert.match(source, /correction\.explanation/);
  assert.doesNotMatch(source, /api\.setModuleProgress\(selectedCourse\.id,\s*selectedModule\.id,\s*true\)/);
  assert.doesNotMatch(source, /\[selectedModule,\s*selectedCourse\?\.id\]/);
  assert.match(quizRoutesSource, /setStudentModuleCompletion/);
  assert.doesNotMatch(source, /const progressPercentage = Math\.round/);
  assert.doesNotMatch(source, /progress:\s*progressPercentage/);

  console.log("Student quiz module progress synchronization rules passed");
});
