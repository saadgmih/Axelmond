import assert from "node:assert/strict";
import { getSyllabusChapterProgress, getSyllabusChapterModules } from "../src/utils/course-chapter-metrics.ts";
import type { CourseModule } from "../src/types.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

function module(id: number, type: CourseModule["type"], completed = false): CourseModule {
  return {
    id,
    title: `Item ${id}`,
    type,
    duration: "10 min",
    completed,
  };
}

rulesTest("course-chapter-metrics", () => {
  const modules = [module(1, "pdf", true), module(2, "quiz", true)];

  assert.equal(getSyllabusChapterModules(modules).length, 1);
  assert.deepEqual(getSyllabusChapterProgress(modules), {
    completedChapters: 1,
    totalChapters: 1,
    progressPercent: 100,
  });

  const partial = [module(1, "pdf", false), module(2, "quiz", true)];
  assert.deepEqual(getSyllabusChapterProgress(partial), {
    completedChapters: 0,
    totalChapters: 1,
    progressPercent: 0,
  });

  assert.deepEqual(getSyllabusChapterProgress([]), {
    completedChapters: 0,
    totalChapters: 0,
    progressPercent: 0,
  });

  console.log("Course chapter metrics tests passed");
});
