import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const liveKitHookSource = readFileSync(new URL("../src/hooks/useLiveKitRoom.tsx", import.meta.url), "utf8");
const liveKitSource = appSource + liveKitHookSource;
const classroomSource = readFileSync(new URL("../src/components/VirtualClassroom.tsx", import.meta.url), "utf8");

assert.match(classroomSource, /<ScreenShare\b/);
assert.match(classroomSource, /<Fullscreen\b/);
assert.doesNotMatch(appSource, /<Maximize\b/);
assert.match(appSource, /activeLiveCourse/);
assert.match(liveKitSource, /leaveLiveRoom/);
assert.match(appSource, /renderLiveRoomInterface\("teacher"\)/);
assert.match(liveKitSource, /api\.leaveLiveAttendance/);
assert.match(liveKitSource, /api\.moderateLiveParticipant/);
assert.match(classroomSource, /Classe virtuelle sécurisée/);
assert.match(classroomSource, /Tableau blanc collaboratif/);
assert.match(classroomSource, /Rapport de présence/);
assert.match(appSource, /Live actif/);

console.log("LiveKit UI rules passed");
