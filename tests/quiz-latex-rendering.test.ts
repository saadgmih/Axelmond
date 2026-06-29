import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("quiz-latex-rendering", () => {
  const packageJson = readFileSync("package.json", "utf8");
  const globalCssSource = readFileSync("src/index.css", "utf8");
  const latexTextSource = readFileSync("src/components/LatexText.tsx", "utf8");
  const teacherQuizSource = readFileSync("src/views/teacher/curriculum-steps/CurriculumQuizStep.tsx", "utf8");
  const studentCourseSource = readFileSync("src/views/student/StudentCourseView.tsx", "utf8");

  assert.match(packageJson, /"katex"/);
  assert.match(globalCssSource, /katex\/dist\/katex\.min\.css/);
  assert.match(latexTextSource, /katex\.renderToString/);
  assert.match(latexTextSource, /displayMode/);
  assert.match(latexTextSource, /splitLatexText/);

  assert.match(teacherQuizSource, /LatexText/);
  assert.match(teacherQuizSource, /LaTeX activé/);
  assert.match(teacherQuizSource, /Aperçu étudiant/);
  assert.match(teacherQuizSource, /\\begin\{pmatrix\}/);
  assert.match(teacherQuizSource, /break-all/);
  assert.match(teacherQuizSource, /overflow-x-auto/);
  assert.match(teacherQuizSource, /value=\{newQuestionText\}/);
  assert.match(teacherQuizSource, /value=\{option\}/);
  assert.match(teacherQuizSource, /value=\{newQuestionExplanation\}/);

  assert.match(studentCourseSource, /Quiz scientifique avec LaTeX/);
  assert.match(studentCourseSource, /value=\{q\.question\}/);
  assert.match(studentCourseSource, /value=\{option\}/);
  assert.match(studentCourseSource, /value=\{q\.explanation\}/);

  console.log("Quiz LaTeX rendering rules passed");
});
