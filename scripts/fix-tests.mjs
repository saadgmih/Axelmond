import fs from "fs";
for (const f of ["tests/quiz-flexible-workflow.test.ts", "tests/content-flexible-workflow.test.ts"]) {
  let t = fs.readFileSync("C:/Users/saadg/Desktop/AxelmondResearchLab/" + f, "utf8");
  if (t.includes('assert.match(appSource, /Directement dans le module/);')) {
    t = t.replace(
      'const appSource = readFileSync("src/App.tsx", "utf8");',
      'const appSource = readFileSync("src/App.tsx", "utf8");\nconst curriculumSource = readFileSync("src/views/teacher/TeacherCurriculumView.tsx", "utf8");',
    );
    t = t.replace(
      'assert.match(appSource, /Directement dans le module/);',
      'assert.match(curriculumSource, /Directement dans le module/);',
    );
    fs.writeFileSync("C:/Users/saadg/Desktop/AxelmondResearchLab/" + f, t);
  }
}
