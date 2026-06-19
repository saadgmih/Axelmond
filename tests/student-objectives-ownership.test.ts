import assert from "node:assert/strict";
import fs from "node:fs";
import { canAccessApiRoute } from "../src/rbac.ts";

import { rulesTest } from "./helpers/rulesTest.ts";

import { readApiRouteSources } from "./helpers/api-route-sources.ts";
import { readAppSources } from "./helpers/app-sources.ts";
import { matchAppRoute } from "./helpers/source-patterns.ts";

rulesTest("student-objectives-ownership", () => {
  const serverSource = readApiRouteSources();
  const schemaSource = fs.readFileSync("prisma/schema.prisma", "utf8");
  const apiSource = fs.readFileSync("src/api.ts", "utf8");
  const appSource = readAppSources();
  const sidebarSource = fs.readFileSync("src/components/Sidebar.tsx", "utf8");
  const sidebarConfigSource = fs.readFileSync("src/navigation/sidebar-config.ts", "utf8");
  const platformPathsSource = fs.readFileSync("src/navigation/platformPaths.ts", "utf8");
  const studyPlanViewSource = fs.readFileSync("src/views/student/StudentStudyPlanView.tsx", "utf8");
  const objectiveCardSource = fs.readFileSync("src/views/student/study-plan/ObjectiveCard.tsx", "utf8");
  const statsSectionSource = fs.readFileSync("src/views/student/study-plan/ObjectivesStatsSection.tsx", "utf8");
  const objectiveFormSource = fs.readFileSync("src/views/student/study-plan/ObjectivesFormModal.tsx", "utf8");
  const objectiveHookSource = fs.readFileSync("src/hooks/useStudentObjectives.ts", "utf8");
  const migrationSource = fs.readFileSync("prisma/migrations/20260611013000_student_objectives/migration.sql", "utf8");
  const v2MigrationSource = fs.readFileSync(
    "prisma/migrations/20260611031500_student_productivity_v2/migration.sql",
    "utf8",
  );

  assert.match(schemaSource, /model StudentObjective/);
  assert.match(schemaSource, /studentId\s+String/);
  assert.match(schemaSource, /enum StudentObjectiveStatus/);
  assert.match(schemaSource, /enum StudentObjectiveType/);
  assert.match(schemaSource, /enum FocusContentType/);
  assert.match(schemaSource, /enum StudentObjectiveRecurrence/);
  assert.match(schemaSource, /recurrence\s+StudentObjectiveRecurrence\s+@default\(NONE\)/);
  assert.match(migrationSource, /CREATE TABLE "StudentObjective"/);
  assert.match(migrationSource, /FOREIGN KEY \("studentId"\) REFERENCES "User"\("id"\) ON DELETE CASCADE/);
  assert.match(v2MigrationSource, /CREATE TYPE "StudentObjectiveRecurrence"/);
  assert.match(v2MigrationSource, /ADD COLUMN "recurrence"/);

  assert.ok(matchAppRoute(serverSource, "get", "/api/me/objectives"));
  assert.ok(matchAppRoute(serverSource, "get", "/api/me/objectives/summary"));
  assert.ok(matchAppRoute(serverSource, "post", "/api/me/objectives"));
  assert.ok(matchAppRoute(serverSource, "put", "/api/me/objectives/:id"));
  assert.ok(matchAppRoute(serverSource, "patch", "/api/me/objectives/:id/complete"));
  assert.ok(matchAppRoute(serverSource, "delete", "/api/me/objectives/:id"));
  assert.match(serverSource, /getOwnedStudentObjective/);
  assert.match(serverSource, /canAccessStudentObjective\(objective\.studentId,\s*authUserId\)/);
  assert.match(serverSource, /buildStudentObjectiveSummary/);
  assert.match(serverSource, /buildNextRecurringObjectiveData/);
  assert.match(serverSource, /where:\s*\{\s*studentId\s*\}/);
  assert.match(serverSource, /Objectifs réservés aux étudiants/);

  assert.equal(canAccessApiRoute("STUDENT", "GET", "/api/me/objectives"), true);
  assert.equal(canAccessApiRoute("STUDENT", "GET", "/api/me/objectives/summary"), true);
  assert.equal(canAccessApiRoute("STUDENT", "POST", "/api/me/objectives"), true);
  assert.equal(canAccessApiRoute("STUDENT", "PUT", "/api/me/objectives/abc123"), true);
  assert.equal(canAccessApiRoute("STUDENT", "PATCH", "/api/me/objectives/abc123/complete"), true);
  assert.equal(canAccessApiRoute("STUDENT", "DELETE", "/api/me/objectives/abc123"), true);
  assert.equal(canAccessApiRoute("PROFESSOR", "GET", "/api/me/objectives"), false);
  assert.equal(canAccessApiRoute("PROFESSOR", "GET", "/api/me/objectives/summary"), false);
  assert.equal(canAccessApiRoute("ADMIN", "DELETE", "/api/me/objectives/abc123"), false);

  assert.match(apiSource, /getStudentObjectives/);
  assert.match(apiSource, /getStudentObjectivesSummary/);
  assert.match(apiSource, /createStudentObjective/);
  assert.match(apiSource, /updateStudentObjective/);
  assert.match(apiSource, /completeStudentObjective/);
  assert.match(apiSource, /deleteStudentObjective/);

  assert.match(appSource, /StudentStudyPlanView/);
  assert.match(appSource, /currentView === "study-plan"/);
  assert.match(sidebarConfigSource, /nav-study-plan/);
  assert.match(sidebarConfigSource, /Plan d/);
  assert.match(platformPathsSource, /"study-plan"/);
  assert.match(platformPathsSource, /"objectives"/);

  assert.match(objectiveHookSource, /inProgressObjectives/);
  assert.match(objectiveHookSource, /completedObjectives/);
  assert.match(objectiveHookSource, /handleCompleteObjective/);
  assert.match(objectiveHookSource, /weeklyProgress/);
  assert.match(objectiveHookSource, /calendarDays/);
  assert.match(objectiveHookSource, /dueSoonObjectives/);
  assert.match(objectiveHookSource, /overdueObjectives/);

  assert.match(statsSectionSource, /Progression hebdomadaire/);
  assert.match(statsSectionSource, /Objectifs au total/);
  assert.match(statsSectionSource, /Objectifs validés/);
  assert.match(statsSectionSource, /Objectifs en retard/);
  assert.match(statsSectionSource, /Proches de la date limite/);
  assert.match(studyPlanViewSource, /AxelCalendarShell/);
  assert.match(studyPlanViewSource, /onAddSession=/);
  assert.match(studyPlanViewSource, /onAddObjective=/);
  assert.match(studyPlanViewSource, /onCreateSessionForDay=/);
  assert.match(studyPlanViewSource, /activeTab === "calendar"/);
  assert.match(statsSectionSource, /Streak/);
  assert.match(objectiveFormSource, /Récurrence/);
  assert.match(studyPlanViewSource, /Objectifs en cours/);
  assert.match(studyPlanViewSource, /Objectifs terminés/);
  assert.match(statsSectionSource, /Écoute \/ concentration/);
  assert.match(statsSectionSource, /Le choix du contenu appartient à l'étudiant/);
  assert.match(objectiveCardSource, /Modifier/);
  assert.match(objectiveCardSource, /Supprimer/);
  assert.match(objectiveCardSource, /Terminer/);
  assert.match(studyPlanViewSource, /grid-cols-1/);
  assert.match(statsSectionSource, /sm:/);
  assert.match(studyPlanViewSource, /md:/);
  assert.match(studyPlanViewSource, /xl:/);
  assert.match(objectiveFormSource, /role="dialog"/);
  assert.match(studyPlanViewSource, /data-tv-zone="student-study-plan"/);
  assert.match(objectiveCardSource, /data-tv-focusable/);

  console.log("Student objectives ownership and UI rules passed");
});
