import assert from "node:assert/strict";
import { parsePlatformPath } from "../src/navigation/platformPaths.ts";

import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("platform-paths", () => {
  assert.deepEqual(parsePlatformPath("/student/catalog"), {
    studentView: "catalog",
    teacherView: "dashboard",
    institutionalView: null,
  });

  assert.deepEqual(parsePlatformPath("/student/study-plan"), {
    studentView: "study-plan",
    teacherView: "dashboard",
    institutionalView: null,
  });

  assert.deepEqual(parsePlatformPath("/student/objectives"), {
    studentView: "study-plan",
    teacherView: "dashboard",
    institutionalView: null,
  });

  assert.deepEqual(parsePlatformPath("/student/study-schedule"), {
    studentView: "study-plan",
    teacherView: "dashboard",
    institutionalView: null,
  });

  assert.deepEqual(parsePlatformPath("/student/not-a-view"), {
    studentView: "dashboard",
    teacherView: "dashboard",
    institutionalView: null,
  });

  assert.deepEqual(parsePlatformPath("/teacher/curriculum"), {
    studentView: "dashboard",
    teacherView: "curriculum",
    institutionalView: null,
  });

  assert.deepEqual(parsePlatformPath("/teacher/not-a-view"), {
    studentView: "dashboard",
    teacherView: "dashboard",
    institutionalView: null,
  });

  console.log("Platform path parsing tests passed");
});
