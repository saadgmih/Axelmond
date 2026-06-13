import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canAccessApiRoute } from "../src/rbac.ts";

import { readApiRouteSources } from "./helpers/api-route-sources.ts";

const schemaSource = readFileSync("prisma/schema.prisma", "utf8");
const serverSource = readApiRouteSources();
const migrationSource = readFileSync("prisma/migrations/20260613174000_module_progress/migration.sql", "utf8");

assert.match(schemaSource, /model ModuleProgress/);
assert.match(schemaSource, /@@unique\(\[userId, courseId, moduleId\]\)/);
assert.match(schemaSource, /moduleProgress\s+ModuleProgress\[\]/);
assert.match(migrationSource, /CREATE TABLE "ModuleProgress"/);
assert.match(migrationSource, /CREATE UNIQUE INDEX "ModuleProgress_userId_courseId_moduleId_key"/);

assert.match(serverSource, /prisma\.moduleProgress\.upsert/);
assert.match(serverSource, /userId_courseId_moduleId/);
assert.match(serverSource, /getStudentCompletedModuleIds/);
assert.match(serverSource, /toCourseForUser/);
const completeRouteStart = serverSource.indexOf('app.post("/api/courses/:courseId/modules/:moduleId/complete"');
const nextRouteStart = serverSource.indexOf('app.post("/api/courses/:courseId/modules"', completeRouteStart + 1);
assert.ok(completeRouteStart > 0, "complete route must exist");
assert.ok(nextRouteStart > completeRouteStart, "next module route must exist");
const completeRouteSource = serverSource.slice(completeRouteStart, nextRouteStart);
assert.doesNotMatch(completeRouteSource, /prisma\.course\.update/);
assert.doesNotMatch(completeRouteSource, /modules:\s*course\.modules/);
assert.doesNotMatch(completeRouteSource, /progress:\s*course\.progress/);

assert.equal(canAccessApiRoute("STUDENT", "POST", "/api/courses/1/modules/101/complete"), true);
assert.equal(canAccessApiRoute("PROFESSOR", "POST", "/api/courses/1/modules/101/complete"), false);

console.log("Module progress ownership rules passed");
