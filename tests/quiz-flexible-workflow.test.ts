import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const serverSource = readFileSync("server.ts", "utf8");
const apiSource = readFileSync("src/api.ts", "utf8");
const appSource = readFileSync("src/App.tsx", "utf8");
const teacherCurriculumSource = readFileSync("src/hooks/useTeacherCurriculum.tsx", "utf8");
const curriculumSource = readFileSync("src/views/teacher/TeacherCurriculumView.tsx", "utf8");
const curriculumBundle = appSource + teacherCurriculumSource;

const quizModel = schema.match(/model Quiz \{[\s\S]*?\n\}/)?.[0] || "";
assert.match(quizModel, /moduleId\s+Int\?/);
assert.match(quizModel, /sectionId\s+String\?/);
assert.match(quizModel, /published\s+Boolean\s+@default\(false\)/);
assert.match(quizModel, /section\s+ContentSection\?/);
assert.doesNotMatch(quizModel, /@@unique\(\[courseId,\s*moduleId\]\)/);

assert.match(serverSource, /sectionId:\s*z\.string\(\)\.trim\(\)\.optional\(\)\.nullable\(\)/);
assert.doesNotMatch(serverSource, /Un quiz existe déjà pour ce module/);
assert.match(serverSource, /app\.patch\("\/api\/quizzes\/:quizId"/);
assert.match(serverSource, /app\.delete\("\/api\/quizzes\/:quizId"/);
assert.match(serverSource, /app\.post\("\/api\/quizzes\/:quizId\/attempts"/);
assert.match(serverSource, /questions:\s*quiz\.questions\.map\(\(\{\s*answer,\s*explanation,\s*\.\.\.question\s*\}\)/);

assert.match(apiSource, /sectionId\?:\s*string\s*\|\s*null/);
assert.match(apiSource, /updateQuiz/);
assert.match(apiSource, /deleteQuiz/);
assert.match(apiSource, /submitQuizAttemptById/);

assert.match(curriculumBundle, /const \[quizChapterId, setQuizChapterId\]/);
assert.match(curriculumBundle, /const \[quizPartId, setQuizPartId\]/);
assert.match(curriculumBundle, /const \[quizSubpartId, setQuizSubpartId\]/);
assert.match(curriculumSource, /Directement dans le module/);
assert.match(curriculumBundle, /teacherQuizzes/);
assert.match(curriculumBundle, /loadTeacherQuizzes/);

console.log("Flexible multiple quiz workflow rules passed");
