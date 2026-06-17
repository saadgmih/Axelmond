import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readApiRouteSources } from "./helpers/api-route-sources.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("admin-professor-invites-ui", () => {
  const apiSource = readFileSync("src/api.ts", "utf8");
  const serverSource = readApiRouteSources();
  const dashboardSource = readFileSync("src/views/teacher/TeacherDashboardView.tsx", "utf8");
  const dashboardHookSource = readFileSync("src/hooks/useTeacherDashboard.ts", "utf8");

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
  assert.match(dashboardSource, /Clés d&apos;accès à usage unique/);
  assert.match(dashboardSource, /Utilisée par/);
  assert.match(dashboardSource, /usedByName/);
  assert.match(dashboardSource, /Supprimer/);
});
console.log("Admin professor invite UI rules passed");
