import fs from "fs";
const f = "C:/Users/saadg/Desktop/unicode/tests/ui-production-cleanup.test.ts";
let t = fs.readFileSync(f, "utf8");
if (!t.includes("curriculumSource")) {
  t = t.replace(
    'const appSource = fs.readFileSync("src/App.tsx", "utf8");',
    'const appSource = fs.readFileSync("src/App.tsx", "utf8");\nconst curriculumSource = fs.readFileSync("src/views/teacher/TeacherCurriculumView.tsx", "utf8");',
  );
  t = t.replace('assert.match(appSource, /Titre du module/);', 'assert.match(curriculumSource, /Titre du module/);');
  t = t.replace('assert.match(appSource, /Crédits ECTS/);', 'assert.match(curriculumSource, /Crédits ECTS/);');
  fs.writeFileSync(f, t);
}
