import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("teacher-module-creation-display", () => {
  const curriculumHookSource = readFileSync("src/hooks/useTeacherCurriculum.tsx", "utf8");
  const modulesStepSource = readFileSync("src/views/teacher/curriculum-steps/CurriculumModulesStep.tsx", "utf8");

  assert.match(curriculumHookSource, /const \[newCourseDisciplineId, setNewCourseDisciplineId\] = useState\(0\)/);
  assert.doesNotMatch(curriculumHookSource, /useState\(601\)/);
  assert.match(curriculumHookSource, /disciplineIdsKey/);
  assert.match(curriculumHookSource, /setNewCourseDisciplineId\(allDisciplines\[0\]\.id\)/);
  assert.match(curriculumHookSource, /Choisissez un sous-domaine valide avant de créer le module/);

  assert.match(modulesStepSource, /const hasDisciplineOptions = allDisciplines\.length > 0/);
  assert.match(modulesStepSource, /disabled=\{!hasDisciplineOptions\}/);
  assert.match(modulesStepSource, /Aucun sous-domaine disponible/);
  assert.match(modulesStepSource, /value=\{hasDisciplineOptions \? newCourseDisciplineId : 0\}/);

  console.log("Teacher module creation display rules passed");
});
