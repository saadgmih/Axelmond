import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const liveKitHookSource = readFileSync(new URL("../src/hooks/useLiveKitRoom.tsx", import.meta.url), "utf8");
const liveKitSource = appSource + liveKitHookSource;
const classroomSource = readFileSync(new URL("../src/components/VirtualClassroom.tsx", import.meta.url), "utf8");

assert.match(liveKitSource, /getMicrophonePermissionState/);
assert.match(liveKitSource, /Microphone bloqué par le navigateur/);
assert.match(liveKitSource, /setMicrophoneEnabled\(nextState\)/);
assert.doesNotMatch(liveKitSource, /navigator\.mediaDevices\.getUserMedia\(\{\s*audio:\s*true\s*\}\)/);
assert.match(classroomSource, /Autoriser le micro/);
assert.match(classroomSource, /icône cadenas/);

console.log("LiveKit microphone rules passed");
