import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const classroomSource = readFileSync(new URL("../src/components/VirtualClassroom.tsx", import.meta.url), "utf8");

assert.match(appSource, /getMicrophonePermissionState/);
assert.match(appSource, /Microphone bloqué par le navigateur/);
assert.match(appSource, /setMicrophoneEnabled\(nextState\)/);
assert.doesNotMatch(appSource, /navigator\.mediaDevices\.getUserMedia\(\{\s*audio:\s*true\s*\}\)/);
assert.match(classroomSource, /Autoriser le micro/);
assert.match(classroomSource, /icône cadenas/);

console.log("LiveKit microphone rules passed");
