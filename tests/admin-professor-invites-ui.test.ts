import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readApiRouteSources } from "./helpers/api-route-sources.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("admin-professor-invites-ui", () => {
  const apiSource = readFileSync("src/api.ts", "utf8");
  const serverSource = readApiRouteSources();
  const dashboardSource = readFileSync("src/views/teacher/TeacherDashboardView.tsx", "utf8");
  const dashboardHookSource = readFileSync("src/hooks/useTeacherDashboard.ts", "utf8");
  const accessKeysViewSource = readFileSync("src/views/teacher/AdminProfessorAccessKeysView.tsx", "utf8");
  const sidebarSource = readFileSync("src/navigation/sidebar-config.ts", "utf8");
  const routeSwitchSource = readFileSync("src/app/TeacherRouteSwitch.tsx", "utf8");

  assert.match(serverSource, /app\.get\("\/api\/admin\/professor-invites",\s*requireAuth,\s*requireAdmin/);
  assert.match(serverSource, /app\.post\("\/api\/admin\/professor-invites",\s*requireAuth,\s*requireAdmin/);
  assert.match(serverSource, /app\.delete\("\/api\/admin\/professor-invites\/:code",\s*requireAuth,\s*requireAdmin/);
  assert.match(serverSource, /usedByName/);
  assert.match(serverSource, /usedByEmail/);

  assert.match(apiSource, /getProfessorInvites/);
  assert.match(apiSource, /createProfessorInvite/);
  assert.match(apiSource, /deleteProfessorInvite/);

  assert.match(dashboardHookSource, /professorInvites/);
  assert.match(dashboardHookSource, /handleCreateProfessorInvite/);
  assert.match(dashboardHookSource, /handleDeleteProfessorInvite/);
  assert.doesNotMatch(dashboardSource, /admin-access-keys/);
  assert.match(accessKeysViewSource, /Codes d&apos;accès professeur/);
  assert.match(accessKeysViewSource, /Professeur associé/);
  assert.match(accessKeysViewSource, /usedByName/);
  assert.match(accessKeysViewSource, /handleDeleteProfessorInvite/);
  assert.match(sidebarSource, /role === "ADMIN"/);
  assert.match(sidebarSource, /Codes d'accès professeur/);
  assert.match(routeSwitchSource, /teacherView === "access-keys" && currentUser\.role === "ADMIN"/);
});
console.log("Admin professor invite UI rules passed");
