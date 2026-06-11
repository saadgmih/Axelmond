import assert from "node:assert/strict";
import fs from "node:fs";
import { canAccessApiRoute } from "../src/rbac.ts";

const serverSource = fs.readFileSync("server.ts", "utf8");
const schemaSource = fs.readFileSync("prisma/schema.prisma", "utf8");
const apiSource = fs.readFileSync("src/api.ts", "utf8");
const appSource = fs.readFileSync("src/App.tsx", "utf8");
const sidebarSource = fs.readFileSync("src/components/Sidebar.tsx", "utf8");
const platformPathsSource = fs.readFileSync("src/navigation/platformPaths.ts", "utf8");
const objectiveViewSource = fs.readFileSync("src/views/student/StudentObjectivesView.tsx", "utf8");
const objectiveHookSource = fs.readFileSync("src/hooks/useStudentObjectives.ts", "utf8");
const migrationSource = fs.readFileSync("prisma/migrations/20260611013000_student_objectives/migration.sql", "utf8");

assert.match(schemaSource, /model StudentObjective/);
assert.match(schemaSource, /studentId\s+String/);
assert.match(schemaSource, /enum StudentObjectiveStatus/);
assert.match(schemaSource, /enum StudentObjectiveType/);
assert.match(schemaSource, /enum FocusContentType/);
assert.match(migrationSource, /CREATE TABLE "StudentObjective"/);
assert.match(migrationSource, /FOREIGN KEY \("studentId"\) REFERENCES "User"\("id"\) ON DELETE CASCADE/);

assert.match(serverSource, /app\.get\("\/api\/me\/objectives"/);
assert.match(serverSource, /app\.post\("\/api\/me\/objectives"/);
assert.match(serverSource, /app\.put\("\/api\/me\/objectives\/:id"/);
assert.match(serverSource, /app\.patch\("\/api\/me\/objectives\/:id\/complete"/);
assert.match(serverSource, /app\.delete\("\/api\/me\/objectives\/:id"/);
assert.match(serverSource, /getOwnedStudentObjective/);
assert.match(serverSource, /canAccessStudentObjective\(objective\.studentId,\s*authUserId\)/);
assert.match(serverSource, /where:\s*\{\s*studentId\s*\}/);
assert.match(serverSource, /Objectifs réservés aux étudiants/);

assert.equal(canAccessApiRoute("STUDENT", "GET", "/api/me/objectives"), true);
assert.equal(canAccessApiRoute("STUDENT", "POST", "/api/me/objectives"), true);
assert.equal(canAccessApiRoute("STUDENT", "PUT", "/api/me/objectives/abc123"), true);
assert.equal(canAccessApiRoute("STUDENT", "PATCH", "/api/me/objectives/abc123/complete"), true);
assert.equal(canAccessApiRoute("STUDENT", "DELETE", "/api/me/objectives/abc123"), true);
assert.equal(canAccessApiRoute("PROFESSOR", "GET", "/api/me/objectives"), false);
assert.equal(canAccessApiRoute("ADMIN", "DELETE", "/api/me/objectives/abc123"), false);

assert.match(apiSource, /getStudentObjectives/);
assert.match(apiSource, /createStudentObjective/);
assert.match(apiSource, /updateStudentObjective/);
assert.match(apiSource, /completeStudentObjective/);
assert.match(apiSource, /deleteStudentObjective/);

assert.match(appSource, /StudentObjectivesView/);
assert.match(appSource, /currentView === "objectives"/);
assert.match(sidebarSource, /nav-objectives/);
assert.match(sidebarSource, /Objectifs/);
assert.match(platformPathsSource, /"objectives"/);

assert.match(objectiveHookSource, /inProgressObjectives/);
assert.match(objectiveHookSource, /completedObjectives/);
assert.match(objectiveHookSource, /handleCompleteObjective/);

assert.match(objectiveViewSource, /Objectifs en cours/);
assert.match(objectiveViewSource, /Objectifs terminés/);
assert.match(objectiveViewSource, /Écoute \/ concentration/);
assert.match(objectiveViewSource, /Le choix du contenu appartient à l'étudiant/);
assert.match(objectiveViewSource, /Modifier/);
assert.match(objectiveViewSource, /Supprimer/);
assert.match(objectiveViewSource, /Terminer/);
assert.match(objectiveViewSource, /grid-cols-1/);
assert.match(objectiveViewSource, /sm:/);
assert.match(objectiveViewSource, /md:/);
assert.match(objectiveViewSource, /xl:/);
assert.match(objectiveViewSource, /role="dialog"/);
assert.match(objectiveViewSource, /data-tv-zone="student-objectives"/);
assert.match(objectiveViewSource, /data-tv-focusable/);

console.log("Student objectives ownership and UI rules passed");
