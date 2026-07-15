import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canAccessApiRoute } from "../src/rbac.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("lesson-asset-persistence", () => {
  const uploadSource = readFileSync("src/uploadthing.ts", "utf8");
  const routeSource = readFileSync("src/routes/lesson-asset-routes.ts", "utf8");
  const serviceSource = readFileSync("src/lesson-asset-service.ts", "utf8");
  const hookSource = readFileSync("src/hooks/useTeacherCurriculum.tsx", "utf8");
  const contentHookSource = readFileSync("src/hooks/useCourseContent.ts", "utf8");
  const mediaViewSource = readFileSync("src/views/teacher/curriculum-steps/CurriculumMediaStep.tsx", "utf8");

  assert.match(uploadSource, /lessonAsset:[\s\S]*?buildLessonAssetCustomId/);
  assert.match(uploadSource, /lessonAsset:[\s\S]*?\[UTFiles\]/);
  assert.match(uploadSource, /lessonAsset:[\s\S]*?persistLessonAsset/);
  assert.match(routeSource, /"\/api\/courses\/:courseId\/lesson-assets\/confirm"/);
  assert.match(routeSource, /resolveConfirmedLessonAsset/);
  assert.match(routeSource, /persistLessonAsset/);
  assert.match(serviceSource, /lessonAssetContentId/);
  assert.match(serviceSource, /code !== "P2002"/);
  assert.match(hookSource, /await api\.confirmLessonAsset/);
  assert.match(hookSource, /Média enregistré durablement et visible après actualisation/);
  assert.match(
    contentHookSource,
    /Promise\.all\(\[[\s\S]*?api\.getCourseContent\(courseId\)[\s\S]*?api\.getModuleContents\(courseId\)[\s\S]*?\]\)/,
  );
  assert.doesNotMatch(mediaViewSource, /Cascading selectors/);
  assert.match(mediaViewSource, /Destination actuelle/);

  assert.equal(canAccessApiRoute("PROFESSOR", "POST", "/api/courses/42/lesson-assets/confirm"), true);
  assert.equal(canAccessApiRoute("RESEARCHER", "POST", "/api/courses/42/lesson-assets/confirm"), true);
  assert.equal(canAccessApiRoute("ADMIN", "POST", "/api/courses/42/lesson-assets/confirm"), true);
  assert.equal(canAccessApiRoute("STUDENT", "POST", "/api/courses/42/lesson-assets/confirm"), false);
});
