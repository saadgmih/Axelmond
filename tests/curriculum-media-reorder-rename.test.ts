import assert from "node:assert/strict";
import fs from "node:fs";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("curriculum-media-reorder-rename", () => {
  const schemaPrisma = fs.readFileSync("prisma/schema.prisma", "utf8");
  const contentRoutes = fs.readFileSync("src/routes/content-routes.ts", "utf8");
  const curriculumChaptersStep = fs.readFileSync(
    "src/views/teacher/curriculum-steps/CurriculumChaptersStep.tsx",
    "utf8"
  );
  const curriculumMediaStep = fs.readFileSync(
    "src/views/teacher/curriculum-steps/CurriculumMediaStep.tsx",
    "utf8"
  );
  const apiSource = fs.readFileSync("src/api.ts", "utf8");
  const syncSource = fs.readFileSync("src/course-curriculum-sync.ts", "utf8");
  const mappersSource = fs.readFileSync("src/server/mappers/content-mappers.ts", "utf8");
  const rbacSource = fs.readFileSync("src/rbac.ts", "utf8");

  // 1. Prisma schema LessonContent must contain order field
  assert.match(
    schemaPrisma,
    /model LessonContent\s*\{[\s\S]*?order\s+Int\s+@default\(0\)[\s\S]*?\}/,
    "LessonContent model must include order Int @default(0)"
  );

  // 2. content-routes must expose reorder route and order in patch
  assert.match(
    contentRoutes,
    /\/api\/courses\/:courseId\/reorder-contents/,
    "Must expose POST /api/courses/:courseId/reorder-contents"
  );
  assert.match(
    contentRoutes,
    /if\s*\(typeof order === "number"\)\s*data\.order = order;/,
    "PATCH / PUT must handle order field"
  );

  // 3. API client must export reorderLessonContents
  assert.match(
    apiSource,
    /reorderLessonContents:\s*\(courseId:\s*number,\s*contentIds:\s*string\[\]\)/,
    "api client must expose reorderLessonContents"
  );

  // 4. Curriculum sync must sort by chapter order and media order
  assert.match(
    syncSource,
    /publishedContents\.sort/,
    "syncPublishedLessonModules must sort published contents"
  );
  assert.match(
    syncSource,
    /orderA\s*-\s*orderB/,
    "syncPublishedLessonModules must prioritize media custom order"
  );

  // 5. Content mappers must sort by order
  assert.match(
    mappersSource,
    /\(a\.order \?\? 0\)\s*-\s*\(b\.order \?\? 0\)/,
    "Content tree must sort contents by order"
  );

  // 6. Teacher UI must have Monter, Descendre, Renommer, and rank display
  assert.match(
    curriculumChaptersStep,
    /handleMoveContent/,
    "CurriculumChaptersStep must implement handleMoveContent"
  );
  assert.match(
    curriculumChaptersStep,
    /Monter/,
    "CurriculumChaptersStep must have Monter button"
  );
  assert.match(
    curriculumChaptersStep,
    /Descendre/,
    "CurriculumChaptersStep must have Descendre button"
  );
  assert.match(
    curriculumChaptersStep,
    /Renommer/,
    "CurriculumChaptersStep must have Renommer button"
  );
  assert.match(
    curriculumChaptersStep,
    /#\{index \+ 1\}/,
    "CurriculumChaptersStep must display rank badge"
  );

  assert.match(
    curriculumMediaStep,
    /Renommer/,
    "CurriculumMediaStep must have Renommer button"
  );

  // 7. RBAC allows teacher roles to reorder
  assert.match(
    rbacSource,
    /reorder-contents/,
    "RBAC must allow reorder-contents"
  );

  console.log("curriculum-media-reorder-rename test passed");
});
