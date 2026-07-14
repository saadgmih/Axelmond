import assert from "node:assert/strict";
import { getCourseContentProgress } from "../src/utils/course-content-metrics.ts";
import type { CourseModule } from "../src/types.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

function content(id: number, type: CourseModule["type"], completed = false): CourseModule {
  return {
    id,
    title: `Contenu ${id}`,
    type,
    duration: "10 min",
    completed,
  };
}

rulesTest("course-content-metrics", () => {
  const contents = [
    content(1, "video", true),
    content(2, "pdf", true),
    content(3, "image", false),
    content(4, "quiz", true),
  ];

  assert.deepEqual(getCourseContentProgress(contents), {
    completedContents: 3,
    totalContents: 4,
    progressPercent: 75,
  });

  assert.deepEqual(getCourseContentProgress([]), {
    completedContents: 0,
    totalContents: 0,
    progressPercent: 0,
  });

  console.log("Course content metrics tests passed");
});
