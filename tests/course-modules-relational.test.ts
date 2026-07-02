import assert from "node:assert/strict";
import fs from "node:fs";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("course-modules-relational", () => {
  const source = fs.readFileSync("src/course-syllabus-modules.ts", "utf8");
  const coursesRoutes = fs.readFileSync("src/routes/courses-routes.ts", "utf8");
  const schema = fs.readFileSync("prisma/schema.prisma", "utf8");

  assert.match(source, /getNextCourseModuleId/);
  assert.doesNotMatch(source, /COURSE_MODULES_READ_RELATIONAL/);
  assert.doesNotMatch(schema, /modules\s+Json/);
  assert.match(coursesRoutes, /getNextCourseModuleId/);
  assert.match(coursesRoutes, /courseModule\.create/);
  const legacyModuleRoute = coursesRoutes.slice(
    coursesRoutes.indexOf('app.post("/api/courses/:courseId/modules"'),
    coursesRoutes.indexOf(
      "// PUT /api/courses/:courseId",
      coursesRoutes.indexOf('app.post("/api/courses/:courseId/modules"'),
    ),
  );
  assert.match(legacyModuleRoute, /await api\.invalidatePublicCatalogCache\(\)/);
  assert.doesNotMatch(
    coursesRoutes.slice(coursesRoutes.indexOf('app.post("/api/courses/:courseId/modules"')),
    /data:\s*\{\s*modules:/,
  );
});
