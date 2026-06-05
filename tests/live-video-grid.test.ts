import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const classroomSource = readFileSync("src/components/VirtualClassroom.tsx", "utf8");

assert.match(classroomSource, /videoParticipants/);
assert.match(classroomSource, /live-video-grid/);
assert.match(classroomSource, /videoParticipants\.map/);
assert.doesNotMatch(classroomSource, /shouldShowFilmstrip/);
assert.match(classroomSource, /bg-red-600\/20 border border-red-500\/40 text-red-300/);

console.log("Live video grid rules passed");
