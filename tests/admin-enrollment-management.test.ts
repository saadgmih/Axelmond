import assert from "node:assert/strict";
import fs from "node:fs";
import { readApiRouteSources } from "./helpers/api-route-sources.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("admin-enrollment-management", () => {
  const apiSource = readApiRouteSources();
  const adminRoutes = fs.readFileSync("src/routes/admin-routes.ts", "utf8");
  const apiClient = fs.readFileSync("src/api.ts", "utf8");
  const dashboardHook = fs.readFileSync("src/hooks/useTeacherDashboard.ts", "utf8");
  const dashboardView = fs.readFileSync("src/views/teacher/TeacherDashboardView.tsx", "utf8");

  assert.match(
    adminRoutes,
    /app\.delete\("\/api\/admin\/courses\/:courseId\/enrollments\/:studentId",\s*requireAuth,\s*requireAdmin/,
  );
  assert.match(adminRoutes, /active:\s*false/);
  assert.match(adminRoutes, /endDate:\s*new Date\(\)/);
  assert.match(adminRoutes, /payment\.count/);
  assert.match(adminRoutes, /paidEnrollment:\s*paymentCount > 0/);
  assert.match(adminRoutes, /invalidateAuthUserCache\(student\.id\)/);
  assert.match(adminRoutes, /invalidateStudentCatalogCache\(student\.id\)/);
  assert.match(adminRoutes, /ADMIN_REMOVE_COURSE_ENROLLMENT/);
  assert.doesNotMatch(adminRoutes, /payment\.delete|invoice\.delete/);

  assert.match(apiClient, /removeStudentFromCourse/);
  assert.match(apiClient, /DELETE",\s*`\/api\/admin\/courses\/\$\{courseId\}\/enrollments\/\$\{studentId\}`/);
  assert.match(dashboardHook, /currentUser\?\.role !== "ADMIN"/);
  assert.match(dashboardHook, /api\.removeStudentFromCourse\(courseId,\s*studentId\)/);
  assert.match(dashboardHook, /setCourseGrades\(\(prev\) => prev\.filter/);
  assert.match(dashboardView, /const canRemoveEnrollment = currentUser\.role === "ADMIN"/);
  assert.match(
    dashboardView,
    /handleRemoveStudentEnrollment\(gradesCourseId,\s*grade\.studentId,\s*grade\.studentName\)/,
  );
  assert.match(dashboardView, /Retirer cet étudiant du module/);
  assert.match(apiSource, /\/api\/admin\/courses\/:courseId\/enrollments\/:studentId/);
});
