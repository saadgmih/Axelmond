import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("student-quiz-design", () => {
  const source = readFileSync("src/views/student/StudentCourseView.tsx", "utf8");
  const quizBlock = source.match(/\{\/\* CASE C: INTERACTIVE QUIZ \*\/\}[\s\S]*?selectedModule\.type !== "quiz"/)?.[0];

  assert.ok(quizBlock, "student quiz block must exist");
  assert.match(quizBlock, /data-testid="student-quiz-panel"/);
  assert.match(quizBlock, /data-testid="quiz-question-card"/);
  assert.match(quizBlock, /bg-\[#041b17\]/);
  assert.match(quizBlock, /bg-\[#08231e\]/);
  assert.match(quizBlock, /aria-pressed=\{isSelected\}/);
  assert.match(quizBlock, /focus-visible:ring-2/);
  assert.match(quizBlock, /Progression du quiz/);
  assert.match(quizBlock, /disabled:cursor-not-allowed/);
  assert.match(quizBlock, /quizQuestions && quizQuestions\.length > 0/);
  assert.doesNotMatch(quizBlock, /rounded-3xl border border-slate-200 bg-white/);
});
