import assert from "node:assert/strict";import { readFileSync } from "node:fs";import { readAppSources } from "./helpers/app-sources.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("live-subject-input", () => {
const appSource = readAppSources();

assert.match(appSource, /liveSubject|liveCourseId|handleUpdateCourseLiveSubject/);

});
