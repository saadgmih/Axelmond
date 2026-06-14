import assert from "node:assert/strict";import { readFileSync } from "node:fs";import { readAppSources } from "./helpers/app-sources.ts";
import { readLiveClassroomSources, readLiveKitHookSources } from "./helpers/live-classroom-sources.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("livekit-microphone", () => {
const appSource = readAppSources();
const liveKitHookSource = readLiveKitHookSources();
const liveKitSource = appSource + readLiveKitHookSources();
const classroomSource = readLiveClassroomSources();

assert.match(liveKitSource, /getMicrophonePermissionState/);
assert.match(liveKitSource, /Microphone bloqué par le navigateur/);
assert.match(liveKitSource, /setMicrophoneEnabled\(nextState\)/);
assert.doesNotMatch(liveKitSource, /navigator\.mediaDevices\.getUserMedia\(\{\s*audio:\s*true\s*\}\)/);
assert.match(classroomSource, /Autoriser le micro/);
assert.match(classroomSource, /icône cadenas/);

});
