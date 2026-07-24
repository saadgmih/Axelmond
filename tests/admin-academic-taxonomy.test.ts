import assert from "node:assert/strict";
import fs from "node:fs";
import { readApiRouteSources } from "./helpers/api-route-sources.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("admin-academic-taxonomy", () => {
  const apiSource = readApiRouteSources();
  const adminRoutes = fs.readFileSync("src/routes/admin-routes.ts", "utf8");
  const routeSchemas = fs.readFileSync("src/server/route-schemas.ts", "utf8");
  const apiClient = fs.readFileSync("src/api.ts", "utf8");
  const dashboardHook = fs.readFileSync("src/hooks/useTeacherDashboard.ts", "utf8");
  const taxonomyView = fs.readFileSync("src/views/teacher/AdminAcademicTaxonomyView.tsx", "utf8");
  const curriculumView = fs.readFileSync("src/views/teacher/TeacherCurriculumView.tsx", "utf8");
  const curriculumModulesStep = fs.readFileSync("src/views/teacher/curriculum-steps/CurriculumModulesStep.tsx", "utf8");
  const curriculumStepper = fs.readFileSync("src/views/teacher/curriculum-steps/CurriculumStepper.tsx", "utf8");
  const curriculumTheme = fs.readFileSync("src/views/teacher/curriculum-theme.ts", "utf8");
  const teacherCurriculumHook = fs.readFileSync("src/hooks/useTeacherCurriculum.tsx", "utf8");
  const teacherRouteSwitch = fs.readFileSync("src/app/TeacherRouteSwitch.tsx", "utf8");
  const sidebarConfig = fs.readFileSync("src/navigation/sidebar-config.ts", "utf8");
  const platformPaths = fs.readFileSync("src/navigation/platformPaths.ts", "utf8");
  const lazyViews = fs.readFileSync("src/lazyViews.tsx", "utf8");
  const prefetch = fs.readFileSync("src/utils/prefetch.ts", "utf8");

  assert.match(routeSchemas, /export const academicDomainSchema/);
  assert.match(routeSchemas, /export const academicDisciplineSchema/);

  assert.match(
    adminRoutes,
    /app\.post\(\s*"\/api\/admin\/academic-domains",\s*requireAuth,\s*requireAdmin,\s*validateBody\(api\.academicDomainSchema\)/,
  );
  assert.match(adminRoutes, /app\.put\(\s*"\/api\/admin\/academic-domains\/:domainId"/);
  assert.match(adminRoutes, /app\.delete\("\/api\/admin\/academic-domains\/:domainId",\s*requireAuth,\s*requireAdmin/);
  assert.match(adminRoutes, /app\.post\(\s*"\/api\/admin\/academic-domains\/:domainId\/disciplines"/);
  assert.match(adminRoutes, /app\.put\(\s*"\/api\/admin\/academic-disciplines\/:disciplineId"/);
  assert.match(
    adminRoutes,
    /app\.delete\("\/api\/admin\/academic-disciplines\/:disciplineId",\s*requireAuth,\s*requireAdmin/,
  );
  assert.match(adminRoutes, /_count:\s*\{\s*select:\s*\{\s*disciplines:\s*true/);
  assert.match(adminRoutes, /_count:\s*\{\s*select:\s*\{\s*courses:\s*true/);
  assert.match(adminRoutes, /Supprimez d'abord les sous-domaines/);
  assert.match(adminRoutes, /Déplacez ou supprimez les modules attachés/);
  assert.match(adminRoutes, /invalidatePublicCatalogCache\(\)/);
  assert.match(adminRoutes, /ADMIN_CREATE_ACADEMIC_DOMAIN/);
  assert.match(adminRoutes, /ADMIN_UPDATE_ACADEMIC_DISCIPLINE/);

  assert.match(apiClient, /createAcademicDomain/);
  assert.match(apiClient, /updateAcademicDiscipline/);
  assert.match(apiClient, /DELETE",\s*`\/api\/admin\/academic-disciplines\/\$\{disciplineId\}`/);

  assert.match(dashboardHook, /currentUser\?\.role !== "ADMIN"/);
  assert.match(dashboardHook, /setDomains\(domainData\)/);
  assert.match(dashboardHook, /setCourses\(courseData\)/);
  assert.match(dashboardHook, /handleCreateAcademicDomain/);
  assert.match(dashboardHook, /handleDeleteAcademicDiscipline/);

  assert.match(taxonomyView, /Domaine → Sous-domaine → Modules/);
  assert.match(taxonomyView, /mode = "all"/);
  assert.match(taxonomyView, /mode === "domains"/);
  assert.match(taxonomyView, /mode === "disciplines"/);
  assert.match(taxonomyView, /coursesByDiscipline/);
  assert.match(taxonomyView, /handleCreateAcademicDiscipline/);
  assert.match(taxonomyView, /handleDeleteAcademicDomain/);
  assert.match(taxonomyView, /Déplacez d'abord les modules attachés/);

  assert.match(curriculumTheme, /ADMIN_CURRICULUM_STEPS/);
  assert.match(curriculumTheme, /studioGreenAccent/);
  assert.doesNotMatch(taxonomyView, /#07101f/);
  assert.doesNotMatch(taxonomyView, /#0b1528/);
  assert.doesNotMatch(taxonomyView, /bg-teal-/);
  assert.doesNotMatch(taxonomyView, /text-teal-/);
  assert.doesNotMatch(taxonomyView, /from-emerald-500/);
  assert.match(curriculumTheme, /label:\s*"Domaines"/);
  assert.match(curriculumTheme, /label:\s*"Sous-domaines"/);
  assert.match(curriculumTheme, /label:\s*"Chapitres"/);
  assert.doesNotMatch(curriculumTheme, /label:\s*"Syllabus"/);
  assert.doesNotMatch(curriculumTheme, /label:\s*"Structure"/);
  assert.match(curriculumTheme, /return canManageAcademicTaxonomy \? 3 : 1/);
  assert.match(curriculumTheme, /return canManageAcademicTaxonomy \? 6 : 4/);
  assert.match(curriculumStepper, /getCurriculumSteps\(canManageAcademicTaxonomy\)/);
  assert.match(curriculumStepper, /xl:grid-cols-6/);
  assert.match(curriculumStepper, /Parcourez les 6 étapes/);
  assert.match(curriculumStepper, /s\.step <= moduleStep/);
  assert.doesNotMatch(curriculumStepper, /Progression · étape/);
  assert.doesNotMatch(curriculumStepper, /progressTrack/);
  assert.doesNotMatch(curriculumStepper, /isCompleted/);
  assert.doesNotMatch(curriculumStepper, /<Check/);
  assert.match(curriculumView, /<AdminAcademicTaxonomyView \{\.\.\.props\} mode="domains" \/>/);
  assert.match(curriculumView, /<AdminAcademicTaxonomyView \{\.\.\.props\} mode="disciplines" \/>/);
  assert.match(
    curriculumView,
    /activeCurriculumStep === chaptersStep[\s\S]*<CurriculumChaptersStep \{\.\.\.props\} \/>[\s\S]*<CurriculumOutlineStep \{\.\.\.props\} \/>/,
  );
  assert.doesNotMatch(curriculumModulesStep, /AdminAcademicTaxonomyView/);
  assert.match(teacherCurriculumHook, /currentUser\?\.role === "ADMIN" \? 6 : 4/);
  assert.match(teacherRouteSwitch, /teacherView === "curriculum"/);
  assert.match(teacherRouteSwitch, /canManageAcademicTaxonomy=\{currentUser\.role === "ADMIN"\}/);
  assert.match(teacherRouteSwitch, /\{\.\.\.teacherDashboardBindings\}/);
  assert.doesNotMatch(teacherRouteSwitch, /teacherView === "academic-taxonomy"/);
  assert.doesNotMatch(sidebarConfig, /Domaines académiques/);
  assert.doesNotMatch(platformPaths, /"academic-taxonomy"/);
  assert.doesNotMatch(lazyViews, /LazyAdminAcademicTaxonomyView/);
  assert.doesNotMatch(prefetch, /"academic-taxonomy"/);
  assert.match(apiSource, /\/api\/admin\/academic-domains/);
});
