import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canAccessApiRoute } from "../src/rbac.ts";
import { readApiRouteSources } from "./helpers/api-route-sources.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("module-progress-ownership", () => {
  const schemaSource = readFileSync("prisma/schema.prisma", "utf8");
  const serverSource = readApiRouteSources();
  const progressSource = readFileSync("src/student-content-progress.ts", "utf8");
  const migrationSource = readFileSync("prisma/migrations/20260613174000_module_progress/migration.sql", "utf8");
  const contentProgressMigrationSource = readFileSync(
    "prisma/migrations/20260618062000_student_content_progress/migration.sql",
    "utf8",
  );

  assert.match(schemaSource, /model ModuleProgress/);
  assert.match(schemaSource, /model StudentContentProgress/);
  assert.match(schemaSource, /@@unique\(\[userId, courseId, moduleId\]\)/);
  assert.match(schemaSource, /@@unique\(\[userId, courseId, contentKey\]\)/);
  assert.match(schemaSource, /moduleProgress\s+ModuleProgress\[\]/);
  assert.match(schemaSource, /contentProgress\s+StudentContentProgress\[\]/);
  assert.match(migrationSource, /CREATE TABLE "ModuleProgress"/);
  assert.match(migrationSource, /CREATE UNIQUE INDEX "ModuleProgress_userId_courseId_moduleId_key"/);
  assert.match(contentProgressMigrationSource, /CREATE TABLE "StudentContentProgress"/);
  assert.match(
    contentProgressMigrationSource,
    /CREATE UNIQUE INDEX "StudentContentProgress_userId_courseId_contentKey_key"/,
  );

  assert.match(progressSource, /studentContentProgress\.upsert/);
  assert.match(progressSource, /studentContentProgress\.deleteMany/);
  assert.match(progressSource, /moduleProgress\.upsert/);
  assert.match(progressSource, /getModuleContentProgressKey/);
  assert.match(progressSource, /getStudentProgressSnapshotsByCourseIds/);
  assert.match(serverSource, /setStudentModuleCompletion/);
  assert.match(progressSource, /userId_courseId_moduleId/);
  assert.match(progressSource, /userId_courseId_contentKey/);
  assert.match(serverSource, /getStudentCompletedModuleIds/);
  assert.match(serverSource, /getStudentCompletedModuleIdsByCourseIds/);
  assert.match(serverSource, /getStudentProgressSnapshot/);
  assert.match(serverSource, /toCourseForUser/);
  assert.match(progressSource, /courseId:\s*\{\s*in:\s*uniqueCourseIds\s*\}/);
  const completeRouteStart = serverSource.indexOf('app.post("/api/courses/:courseId/modules/:moduleId/complete"');
  const nextRouteStart = serverSource.indexOf('app.post("/api/courses/:courseId/modules"', completeRouteStart + 1);
  assert.ok(completeRouteStart > 0, "complete route must exist");
  assert.ok(nextRouteStart > completeRouteStart, "next module route must exist");
  const completeRouteSource = serverSource.slice(completeRouteStart, nextRouteStart);
  assert.doesNotMatch(completeRouteSource, /prisma\.course\.update/);
  assert.doesNotMatch(completeRouteSource, /modules:\s*course\.modules/);
  assert.doesNotMatch(completeRouteSource, /progress:\s*course\.progress/);

  const progressRouteStart = serverSource.indexOf('app.put("/api/courses/:courseId/modules/:moduleId/progress"');
  const progressRouteSource = serverSource.slice(progressRouteStart, nextRouteStart);
  assert.ok(progressRouteStart > completeRouteStart, "progress route must exist");
  assert.match(progressRouteSource, /typeof req\.body\?\.completed !== "boolean"/);
  assert.match(progressRouteSource, /res\.json\(\{ courseId: course\.id, moduleId: mod\.id, completed \}\)/);
  assert.doesNotMatch(progressRouteSource, /toCourseForUser/);

  assert.equal(canAccessApiRoute("STUDENT", "POST", "/api/courses/1/modules/101/complete"), true);
  assert.equal(canAccessApiRoute("PROFESSOR", "POST", "/api/courses/1/modules/101/complete"), false);
  assert.equal(canAccessApiRoute("STUDENT", "PUT", "/api/courses/1/modules/101/progress"), true);
  assert.equal(canAccessApiRoute("PROFESSOR", "PUT", "/api/courses/1/modules/101/progress"), false);
});
