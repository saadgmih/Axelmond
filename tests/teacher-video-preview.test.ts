import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const curriculumSource = readFileSync("src/views/teacher/TeacherCurriculumView.tsx", "utf8");

assert.match(curriculumSource, /import PremiumVideoPlayer from "\.\.\/\.\.\/components\/PremiumVideoPlayer"/);
assert.match(curriculumSource, /content\.type === "VIDEO" &&/);
assert.match(curriculumSource, /src=\{attachment\.url\}/);
assert.match(curriculumSource, /title=\{content\.title\}/);
assert.match(curriculumSource, /instructor=\{managedCourse\?\.instructor \?\? "Professeur"\}/);
assert.match(curriculumSource, /activeSector="teacher"/);
assert.doesNotMatch(curriculumSource, /<video[\s\S]*controls/);

console.log("Teacher video preview rules passed");
