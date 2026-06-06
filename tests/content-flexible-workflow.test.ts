import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync("src/App.tsx", "utf8");
const courseContentSource = readFileSync("src/hooks/useCourseContent.ts", "utf8");
const curriculumSource = readFileSync("src/views/teacher/TeacherCurriculumView.tsx", "utf8");
const courseContentBundle = appSource + courseContentSource;
const apiSource = readFileSync("src/api.ts", "utf8");
const serverSource = readFileSync("server.ts", "utf8");
const uploadthingSource = readFileSync("src/uploadthing.ts", "utf8");

assert.match(appSource, /useState<"chapter" \| "part" \| "subpart">\("chapter"\)/);
assert.match(appSource, /const \[uploadChapterId, setUploadChapterId\]/);
assert.match(appSource, /const \[uploadPartId, setUploadPartId\]/);
assert.match(appSource, /const \[uploadSubpartId, setUploadSubpartId\]/);
assert.match(curriculumSource, /Directement dans le module/);
assert.doesNotMatch(appSource, /!uploadFile \|\| !uploadSectionId \|\| !uploadTitle\.trim\(\)/);
assert.match(appSource, /sectionId:\s*uploadSectionId \|\| null/);
assert.match(courseContentBundle, /getCourseContent/);

assert.match(uploadthingSource, /sectionId:\s*z\.string\(\)\.min\(1\)\.optional\(\)\.nullable\(\)/);
assert.match(uploadthingSource, /sectionId:\s*input\.sectionId \|\| null/);
assert.match(uploadthingSource, /courseId:\s*input\.courseId/);

assert.match(apiSource, /getModuleContents/);
assert.match(serverSource, /\/api\/courses\/:courseId\/module-contents/);
assert.match(serverSource, /sectionId:\s*null/);

console.log("Flexible module content workflow rules passed");
