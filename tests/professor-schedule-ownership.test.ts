import assert from "node:assert/strict";
import { readApiRouteSources } from "./helpers/api-route-sources.ts";
import { readAppSources } from "./helpers/app-sources.ts";
import fs from "node:fs";
import { canAccessApiRoute } from "../src/rbac.ts";

const serverSource = readApiRouteSources();
const schemaSource = fs.readFileSync("prisma/schema.prisma", "utf8");
const apiSource = fs.readFileSync("src/api.ts", "utf8");
const appSource = readAppSources();
const sidebarSource = fs.readFileSync("src/components/Sidebar.tsx", "utf8");
const platformPathsSource = fs.readFileSync("src/navigation/platformPaths.ts", "utf8");
const migrationSource = fs.readFileSync("prisma/migrations/20260607103000_professor_schedule/migration.sql", "utf8");

assert.match(schemaSource, /model ProfessorScheduleSession/);
assert.match(schemaSource, /professorId\s+String/);
assert.match(schemaSource, /enum ScheduleSessionType/);
assert.match(migrationSource, /CREATE TABLE "ProfessorScheduleSession"/);

assert.match(serverSource, /app\.get\("\/api\/me\/schedule"/);
assert.match(serverSource, /app\.post\("\/api\/me\/schedule"/);
assert.match(serverSource, /app\.put\("\/api\/me\/schedule\/:id"/);
assert.match(serverSource, /app\.delete\("\/api\/me\/schedule\/:id"/);
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
assert.match(sidebarSource, /Emploi du Temps/);
assert.match(platformPathsSource, /"schedule"/);

console.log("Professor schedule ownership rules passed");
