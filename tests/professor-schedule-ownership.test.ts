import assert from "node:assert/strict";
import { readApiRouteSources } from "./helpers/api-route-sources.ts";
import { readAppSources } from "./helpers/app-sources.ts";
import fs from "node:fs";
import { canAccessApiRoute } from "../src/rbac.ts";
import { matchAppRoute } from "./helpers/source-patterns.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("professor-schedule-ownership", () => {
  const serverSource = readApiRouteSources();
  const schemaSource = fs.readFileSync("prisma/schema.prisma", "utf8");
  const apiSource = fs.readFileSync("src/api.ts", "utf8");
  const appSource = readAppSources();
  const sidebarConfigSource = fs.readFileSync("src/navigation/sidebar-config.ts", "utf8");
  const platformPathsSource = fs.readFileSync("src/navigation/platformPaths.ts", "utf8");
  const migrationSource = fs.readFileSync("prisma/migrations/20260607103000_professor_schedule/migration.sql", "utf8");

  assert.match(schemaSource, /model ProfessorScheduleSession/);
  assert.match(schemaSource, /professorId\s+String/);
  assert.match(schemaSource, /enum ScheduleSessionType/);
  assert.match(migrationSource, /CREATE TABLE "ProfessorScheduleSession"/);

  assert.ok(matchAppRoute(serverSource, "get", "/api/me/schedule"));
  assert.ok(matchAppRoute(serverSource, "post", "/api/me/schedule"));
  assert.ok(matchAppRoute(serverSource, "put", "/api/me/schedule/:id"));
  assert.ok(matchAppRoute(serverSource, "delete", "/api/me/schedule/:id"));
  assert.match(serverSource, /getOwnedProfessorScheduleSession/);
  assert.match(serverSource, /where:\s*\{\s*professorId:\s*authUser\.id\s*\}/);
  assert.match(serverSource, /validateSchedulePayload/);
  assert.match(serverSource, /Accès refusé pour modifier cette séance/);
  assert.match(serverSource, /Accès refusé pour supprimer cette séance/);

  assert.equal(canAccessApiRoute("PROFESSOR", "GET", "/api/me/schedule"), true);
  assert.equal(canAccessApiRoute("PROFESSOR", "POST", "/api/me/schedule"), true);
  assert.equal(canAccessApiRoute("PROFESSOR", "PUT", "/api/me/schedule/abc123"), true);
  assert.equal(canAccessApiRoute("PROFESSOR", "DELETE", "/api/me/schedule/abc123"), true);
  assert.equal(canAccessApiRoute("STUDENT", "GET", "/api/me/schedule"), false);

  assert.match(apiSource, /getSchedule/);
  assert.match(apiSource, /createScheduleSession/);
  assert.match(apiSource, /updateScheduleSession/);
  assert.match(apiSource, /deleteScheduleSession/);

  assert.match(appSource, /TeacherScheduleView/);
  assert.match(appSource, /teacherView === "schedule"/);
  assert.match(sidebarConfigSource, /Emploi du Temps/);
  assert.match(platformPathsSource, /"schedule"/);
});
