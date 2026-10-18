import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("Teacher Curriculum Pillar 3 (A à Z)", () => {
  const contentRoutes = fs.readFileSync("src/routes/content-routes.ts", "utf8");
  const routeSchemas = fs.readFileSync("src/server/route-schemas.ts", "utf8");
  const rbacSource = fs.readFileSync("src/rbac.ts", "utf8");
  const apiSource = fs.readFileSync("src/api.ts", "utf8");
  const curriculumHook = fs.readFileSync("src/hooks/useTeacherCurriculum.tsx", "utf8");
  const curriculumTypes = fs.readFileSync("src/views/teacher/curriculum-types.ts", "utf8");
  const chaptersStep = fs.readFileSync("src/views/teacher/curriculum-steps/CurriculumChaptersStep.tsx", "utf8");
  const modulesStep = fs.readFileSync("src/views/teacher/curriculum-steps/CurriculumModulesStep.tsx", "utf8");

  it("exposes backend endpoint and schema for chapter reordering", () => {
    // 1. Zod schema for reordering sections
    assert.match(routeSchemas, /export const reorderSectionsSchema = z\.object\(\{/);
    assert.match(routeSchemas, /sectionIds:\s*z\.array\(z\.string\(\)\.min\(1\)\)\.min\(1\)/);

    // 2. Route endpoint in content-routes.ts
    assert.match(contentRoutes, /\/api\/courses\/:courseId\/reorder-sections/);
    assert.match(contentRoutes, /validateBody\(api\.reorderSectionsSchema\)/);
    assert.match(contentRoutes, /api\.prisma\.contentSection\.update/);

    // 3. RBAC permission for reordering sections
    assert.match(rbacSource, /reorder-sections/);

    // 4. Client API method
    assert.match(apiSource, /reorderSections:\s*\(courseId:\s*number,\s*sectionIds:\s*string\[\]\)/);
    assert.match(apiSource, /\/api\/courses\/\$\{courseId\}\/reorder-sections/);
  });

  it("implements chapter reordering in hook and UI", () => {
    // 1. Types
    assert.match(curriculumTypes, /handleReorderSections\?:\s*\(sectionIds:\s*string\[\]\)\s*=>/);

    // 2. Hook implementation
    assert.match(curriculumHook, /const handleReorderSections = async \(sectionIds: string\[\]\)/);
    assert.match(curriculumHook, /await api\.reorderSections\(managedCourse\.id, sectionIds\)/);
    assert.match(curriculumHook, /handleReorderSections,/);

    // 3. Chapter Step handles moving chapters up and down
    assert.match(chaptersStep, /const handleMoveChapter = async \(index: number, direction: -1 \| 1\)/);
    assert.match(chaptersStep, /handleMoveChapter\(chapterIndex, -1\)/);
    assert.match(chaptersStep, /handleMoveChapter\(chapterIndex, 1\)/);
    assert.match(chaptersStep, /Monter/);
    assert.match(chaptersStep, /Descendre/);
    assert.match(chaptersStep, /#\{chapterIndex \+ 1\}/);
  });

  it("provides student preview direct access across curriculum steps", () => {
    // 1. In Chapters step: context header with student preview link
    assert.match(chaptersStep, /\/student\/course\?courseId=\$\{managedCourse\.id\}/);
    assert.match(chaptersStep, /Aperçu étudiant/);

    // 2. In Modules step: student preview button on each course card
    assert.match(modulesStep, /\/student\/course\?courseId=\$\{course\.id\}/);
    assert.match(modulesStep, /Aperçu étudiant/);
  });

  it("supports course search, status filtering, and readiness checklist", () => {
    // 1. Search and status filters
    assert.match(modulesStep, /moduleSearchQuery/);
    assert.match(modulesStep, /moduleStatusFilter/);
    assert.match(modulesStep, /filteredCourses/);
    assert.match(modulesStep, /Rechercher un module par titre ou discipline/);
    assert.match(modulesStep, /Brouillons/);
    assert.match(modulesStep, /Publiés/);

    // 2. Readiness score calculation
    assert.match(modulesStep, /getCourseReadiness/);
    assert.match(modulesStep, /readiness\.isReady/);
    assert.match(modulesStep, /Prêt/);
  });

  it("provides upload feedback and progress bar for media assets", () => {
    assert.match(chaptersStep, /isUploadingLessonAsset/);
    assert.match(chaptersStep, /Téléversement sécurisé et confirmation en cours/);
  });
});
