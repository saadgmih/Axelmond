import assert from "node:assert/strict";import { readApiRouteSources } from "./helpers/api-route-sources.ts";import { readAppSources } from "./helpers/app-sources.ts";import fs from "node:fs";import { canAccessApiRoute } from "../src/rbac.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("student-study-schedule-ownership", () => {
const serverSource = readApiRouteSources();
const schemaSource = fs.readFileSync("prisma/schema.prisma", "utf8");
const apiSource = fs.readFileSync("src/api.ts", "utf8");
const appSource = readAppSources();
const sidebarSource = fs.readFileSync("src/components/Sidebar.tsx", "utf8");
const platformPathsSource = fs.readFileSync("src/navigation/platformPaths.ts", "utf8");
const migrationSource = fs.readFileSync("prisma/migrations/20260607120000_student_study_schedule/migration.sql", "utf8");

assert.match(schemaSource, /model StudentStudyScheduleSession/);
assert.match(schemaSource, /studentId\s+String/);
assert.match(schemaSource, /enum StudentStudySessionType/);
assert.match(migrationSource, /CREATE TABLE "StudentStudyScheduleSession"/);

assert.match(serverSource, /app\.get\("\/api\/me\/study-schedule"/);
assert.match(serverSource, /app\.post\("\/api\/me\/study-schedule"/);
assert.match(serverSource, /app\.put\("\/api\/me\/study-schedule\/:id"/);
assert.match(serverSource, /app\.delete\("\/api\/me\/study-schedule\/:id"/);
assert.match(serverSource, /getOwnedStudentStudyScheduleSession/);
assert.match(serverSource, /where:\s*\{\s*studentId:\s*authUser\.id\s*\}/);
assert.match(serverSource, /validateStudentStudyPayload/);
assert.match(serverSource, /Emploi du temps d'étude réservé aux étudiants/);

assert.equal(canAccessApiRoute("STUDENT", "GET", "/api/me/study-schedule"), true);
assert.equal(canAccessApiRoute("STUDENT", "POST", "/api/me/study-schedule"), true);
assert.equal(canAccessApiRoute("STUDENT", "PUT", "/api/me/study-schedule/abc123"), true);
assert.equal(canAccessApiRoute("STUDENT", "DELETE", "/api/me/study-schedule/abc123"), true);
assert.equal(canAccessApiRoute("PROFESSOR", "GET", "/api/me/study-schedule"), false);

assert.match(apiSource, /getStudySchedule/);
assert.match(apiSource, /createStudyScheduleSession/);
assert.match(apiSource, /updateStudyScheduleSession/);
assert.match(apiSource, /deleteStudyScheduleSession/);

assert.match(appSource, /StudentStudyScheduleView/);
assert.match(appSource, /currentView === "study-schedule"/);
assert.match(sidebarSource, /Mon Emploi du Temps d/);
assert.match(platformPathsSource, /"study-schedule"/);

});
