import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync("src/App.tsx", "utf8");

assert.match(appSource, /selectedLessonContent\.type === "VIDEO" && selectedLessonContent\.attachments\[0\]\?\.url/);
assert.match(appSource, /<video controls/);

console.log("Student video playback protection rules passed");
