import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  integerFromNumericInput,
  normalizeNumericInputValue,
  numberFromNumericInput,
  numericInputFromNumber,
} from "../src/utils/numeric-input.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("numeric-input", () => {
  const curriculumModulesSource = readFileSync("src/views/teacher/curriculum-steps/CurriculumModulesStep.tsx", "utf8");
  const teacherCurriculumSource = readFileSync("src/hooks/useTeacherCurriculum.tsx", "utf8");

  assert.equal(normalizeNumericInputValue(""), "");
  assert.equal(normalizeNumericInputValue("0"), "0");
  assert.equal(normalizeNumericInputValue("022"), "22");
  assert.equal(normalizeNumericInputValue("000"), "0");
  assert.equal(normalizeNumericInputValue("003.5"), "3.5");
  assert.equal(normalizeNumericInputValue("0.5"), "0.5");
  assert.equal(normalizeNumericInputValue("0."), "0.");
  assert.equal(numericInputFromNumber(3), "3");
  assert.equal(numberFromNumericInput("", 0), 0);
  assert.equal(numberFromNumericInput("22", 0), 22);
  assert.equal(integerFromNumericInput("3.8", 0), 3);

  assert.match(curriculumModulesSource, /normalizeNumericInputValue\(e\.target\.value\)/);
  assert.doesNotMatch(curriculumModulesSource, /parseInt\(e\.target\.value\)\s*\|\|\s*0/);
  assert.doesNotMatch(curriculumModulesSource, /parseFloat\(e\.target\.value\)\s*\|\|\s*0/);
  assert.match(teacherCurriculumSource, /numberFromNumericInput\(newCoursePrice,\s*0\)/);
  assert.match(teacherCurriculumSource, /integerFromNumericInput\(newCourseCredits,\s*0\)/);
});
