import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("course-image", () => {
  const schema = readFileSync("prisma/schema.prisma", "utf8");
  const migration = readFileSync("prisma/migrations/20260714060000_add_course_image/migration.sql", "utf8");
  const uploadSource = readFileSync("src/uploadthing.ts", "utf8");
  const hookSource = readFileSync("src/hooks/useTeacherCurriculum.tsx", "utf8");
  const fieldSource = readFileSync("src/components/CourseImageField.tsx", "utf8");
  const modulesStepSource = readFileSync("src/views/teacher/curriculum-steps/CurriculumModulesStep.tsx", "utf8");
  const mapperSource = readFileSync("src/server/mappers/catalog-mappers.ts", "utf8");
  const coursesRouteSource = readFileSync("src/routes/courses-routes.ts", "utf8");
  const courseImageRouteSource = readFileSync("src/routes/course-image-routes.ts", "utf8");
  const dashboardSource = readFileSync("src/views/student/StudentDashboardView.tsx", "utf8");
  const catalogSource = readFileSync("src/views/student/StudentCatalogView.tsx", "utf8");

  assert.match(schema, /imageUrl\s+String\?/);
  assert.match(schema, /imageKey\s+String\?/);
  assert.match(migration, /ADD COLUMN "imageUrl" TEXT/);
  assert.match(migration, /ADD COLUMN "imageKey" TEXT/);

  assert.match(uploadSource, /courseImage:\s*f\(/);
  assert.match(uploadSource, /courseImage:[\s\S]*?maxFileSize:\s*"8MB"/);
  assert.match(uploadSource, /courseImage:[\s\S]*?user\.role === "ADMIN"/);
  assert.match(uploadSource, /courseImage:[\s\S]*?createdById:\s*user\.id/);
  assert.match(uploadSource, /courseImage:[\s\S]*?isAllowedRasterImageUpload/);
  assert.match(uploadSource, /courseImage:[\s\S]*?\[UTFiles\]/);
  assert.match(uploadSource, /buildCourseImageCustomId\(course\.id, user\.id\)/);
  assert.match(uploadSource, /data:\s*\{ imageUrl:\s*fileUrl, imageKey:\s*file\.key \}/);
  assert.match(uploadSource, /deleteCloudFiles\(metadata\.previousImageKey\)/);
  assert.match(uploadSource, /invalidatePublicCatalogCache\(\)/);

  assert.match(hookSource, /uploadFiles as any\)\("courseImage"/);
  assert.match(hookSource, /await api\.confirmCourseImage\(courseId, customId\)/);
  assert.match(hookSource, /validateUploadFile\(newCourseImageFile, "IMAGE"\)/);
  assert.match(hookSource, /validateUploadFile\(editCourseImageFile, "IMAGE"\)/);
  assert.match(fieldSource, /RASTER_IMAGE_ACCEPT/);
  assert.match(fieldSource, /JPEG, PNG ou WebP, 8 Mo maximum/);
  assert.ok((modulesStepSource.match(/<CourseImageField/g) || []).length >= 2);

  assert.match(mapperSource, /imageUrl:\s*course\.imageUrl \|\| null/);
  assert.match(coursesRouteSource, /if \(course\.imageKey\) fileKeys\.push\(course\.imageKey\)/);
  assert.match(courseImageRouteSource, /"\/api\/courses\/:courseId\/image"/);
  assert.match(
    courseImageRouteSource,
    /data:\s*\{ imageUrl:\s*confirmed\.imageUrl, imageKey:\s*confirmed\.imageKey \}/,
  );
  assert.match(dashboardSource, /course\.imageUrl/);
  assert.match(dashboardSource, /object-cover/);
  assert.match(catalogSource, /course\.imageUrl/);
  assert.match(catalogSource, /object-cover/);
});
