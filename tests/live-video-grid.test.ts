import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const classroomSource = readFileSync("src/components/VirtualClassroom.tsx", "utf8");
const mediaControlSource = readFileSync("src/components/live/LiveMediaControl.tsx", "utf8");

assert.match(classroomSource, /stageParticipants/);
assert.match(classroomSource, /live-video-grid/);
assert.match(classroomSource, /LiveParticipantTile/);
assert.match(classroomSource, /LiveMediaControl/);
assert.match(mediaControlSource, /border-emerald-500\/40 bg-emerald-500\/10/);
assert.match(classroomSource, /LiveReactionBar/);
assert.match(classroomSource, /formatLiveStat/);
assert.match(classroomSource, /isSolo/);
assert.doesNotMatch(mediaControlSource, /uppercase tracking-wide/);
