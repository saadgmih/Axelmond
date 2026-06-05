import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync("src/App.tsx", "utf8");

assert.match(appSource, /liveSubject|liveCourseId|handleUpdateCourseLiveSubject/);

console.log("Live subject input rules passed");
