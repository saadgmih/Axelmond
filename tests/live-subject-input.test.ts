import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readAppSources } from "./helpers/app-sources.ts";

const appSource = readAppSources();

assert.match(appSource, /liveSubject|liveCourseId|handleUpdateCourseLiveSubject/);

console.log("Live subject input rules passed");
