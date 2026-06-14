import assert from "node:assert/strict";import fs from "node:fs";import {
  courseModuleRowFromJsonItem,
  resolveCourseModules,
  shouldReadRelationalCourseModules,
} from "../src/course-syllabus-modules.ts";import type { CourseModule } from "../src/types.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("course-syllabus-modules", () => {
assert.equal(shouldReadRelationalCourseModules({ COURSE_MODULES_READ_RELATIONAL: "true" }), true);
assert.equal(shouldReadRelationalCourseModules({ COURSE_MODULES_READ_RELATIONAL: "false" }), false);

const jsonModules: CourseModule[] = [{
  id: 101,
  title: "Intro",
  type: "video",
  duration: "10 min",
  completed: false,
}];

assert.equal(resolveCourseModules({ modules: jsonModules }).length, 1);

const relational = resolveCourseModules({
  modules: jsonModules,
  courseModules: [courseModuleRowFromJsonItem(1, jsonModules[0], 0)],
}, undefined, { COURSE_MODULES_READ_RELATIONAL: "true" });
assert.equal(relational[0]?.title, "Intro");

assert.match(fs.readFileSync("docs/MIGRATION-COURSE-MODULES.md", "utf8"), /CourseModule/);
assert.match(fs.readFileSync("prisma/schema.prisma", "utf8"), /model CourseModule/);
assert.match(fs.readFileSync("src/routes/courses-routes.ts", "utf8"), /courseModule\.create/);

});
