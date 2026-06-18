import assert from "node:assert/strict";
import fs from "node:fs";
import { findMissingEnrolledCourseIds } from "../src/app/hooks/useEnrolledCoursesHydration.ts";
import type { Course } from "../src/types.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("student-dashboard-enrolled-modules", () => {
  const dashboardSource = fs.readFileSync("src/views/student/StudentDashboardView.tsx", "utf8");
  const coursesRoutesSource = fs.readFileSync("src/routes/courses-routes.ts", "utf8");
  const catalogSource = fs.readFileSync("src/server/mappers/catalog-mappers.ts", "utf8");
  const hydrationSource = fs.readFileSync("src/app/hooks/useEnrolledCoursesHydration.ts", "utf8");

  assert.match(dashboardSource, /Mes Modules d'Étude Actifs \(\{enrolledList\.length\}\)/);
  assert.doesNotMatch(dashboardSource, /Mes Modules d'Étude Actifs \(\{enrolledCourses\.length\}\)/);
  assert.match(dashboardSource, /isEnrolledCatalogSyncing/);
  assert.match(dashboardSource, /enrolledList\.length === 0/);

  assert.match(coursesRoutesSource, /authUser\?\.role === "STUDENT"/);
  assert.match(coursesRoutesSource, /OR: \[\{ published: true \}, \{ id: \{ in: enrolledIds \} \}\]/);

  assert.match(catalogSource, /attachSyncedCourseModules\(courses\)/);
  assert.doesNotMatch(catalogSource, /syncPublishedLessonModulesForCourses/);

  assert.match(hydrationSource, /api\.getCourse/);

  const sampleCourse = { id: 2, title: "C++" } as Course;
  assert.deepEqual(findMissingEnrolledCourseIds([2], []), [2]);
  assert.deepEqual(findMissingEnrolledCourseIds([2], [sampleCourse]), []);
  assert.deepEqual(findMissingEnrolledCourseIds([2, 3], [sampleCourse]), [3]);

  console.log("Student dashboard enrolled modules rules passed");
});
