import assert from "node:assert/strict";
import fs from "node:fs";
import {
  courseModuleRowFromJsonItem,
  resolveCourseModules,
} from "../src/course-syllabus-modules.ts";
import type { CourseModule } from "../src/types.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("course-syllabus-modules", () => {
  const jsonModules: CourseModule[] = [
    {
      id: 101,
      title: "Intro",
      type: "video",
      duration: "10 min",
      completed: false,
    },
  ];

  assert.equal(resolveCourseModules({ courseModules: [] }).length, 0);

  const relational = resolveCourseModules({
    courseModules: [courseModuleRowFromJsonItem(1, jsonModules[0], 0)],
  });
  assert.equal(relational[0]?.title, "Intro");

  assert.match(fs.readFileSync("docs/MIGRATION-COURSE-MODULES.md", "utf8"), /CourseModule/);
  assert.match(fs.readFileSync("prisma/schema.prisma", "utf8"), /model CourseModule/);
  assert.doesNotMatch(fs.readFileSync("prisma/schema.prisma", "utf8"), /modules\s+Json/);
  assert.match(fs.readFileSync("src/routes/courses-routes.ts", "utf8"), /courseModule\.create/);
});
