-- Phase 3: Course syllabus modules are relational-only (CourseModule table).
ALTER TABLE "AxelmondResearchLab"."Course" DROP COLUMN IF EXISTS "modules";
