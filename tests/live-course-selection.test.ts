import assert from "node:assert/strict";
import { findLiveCourse, resolveLiveCourseId } from "../src/utils/live-course-selection.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

const courses = [
  { id: 2, title: "Programmation en C++" },
  { id: 4, title: "Analyse numérique 1" },
];

rulesTest("live-course-selection", () => {
  assert.equal(resolveLiveCourseId(courses, 1), 2);
  assert.equal(resolveLiveCourseId(courses, 0), 2);
  assert.equal(resolveLiveCourseId(courses, 4), 4);
  assert.equal(resolveLiveCourseId([], 1), 1);
  assert.equal(findLiveCourse(courses, 1)?.title, "Programmation en C++");
});
