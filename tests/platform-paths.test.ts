import assert from "node:assert/strict";

import { parsePlatformPath, resolveInitialPlatformRoute } from "../src/navigation/platformPaths.ts";

import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("platform-paths", () => {
  assert.deepEqual(resolveInitialPlatformRoute("/about"), {
    currentView: "about",
    teacherView: "dashboard",
    notFound: false,
  });

  assert.deepEqual(resolveInitialPlatformRoute("/teacher/academic-profile"), {
    currentView: "dashboard",
    teacherView: "academic-profile",
    notFound: false,
  });

  assert.deepEqual(parsePlatformPath("/student/catalog"), {
    studentView: "catalog",

    teacherView: "dashboard",

    institutionalView: null,
    notFound: false,
  });

  assert.deepEqual(parsePlatformPath("/student/study-plan"), {
    studentView: "study-plan",

    teacherView: "dashboard",

    institutionalView: null,
    notFound: false,
  });

  assert.deepEqual(parsePlatformPath("/student/objectives"), {
    studentView: "study-plan",

    teacherView: "dashboard",

    institutionalView: null,
    notFound: false,
  });

  assert.deepEqual(parsePlatformPath("/student/study-schedule"), {
    studentView: "study-plan",

    teacherView: "dashboard",

    institutionalView: null,
    notFound: false,
  });

  assert.deepEqual(parsePlatformPath("/student/account-security"), {
    studentView: "account-security",

    teacherView: "dashboard",

    institutionalView: null,
    notFound: false,
  });

  assert.deepEqual(parsePlatformPath("/student/not-a-view"), {
    studentView: "dashboard",

    teacherView: "dashboard",

    institutionalView: null,
    notFound: true,
  });

  assert.deepEqual(parsePlatformPath("/teacher/curriculum"), {
    studentView: "dashboard",

    teacherView: "curriculum",

    institutionalView: null,
    notFound: false,
  });

  assert.deepEqual(parsePlatformPath("/teacher/account-security"), {
    studentView: "dashboard",

    teacherView: "account-security",

    institutionalView: null,
    notFound: false,
  });

  assert.deepEqual(parsePlatformPath("/teacher/not-a-view"), {
    studentView: "dashboard",

    teacherView: "dashboard",

    institutionalView: null,
    notFound: true,
  });

  console.log("Platform path parsing tests passed");
});
