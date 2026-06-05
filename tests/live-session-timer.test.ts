import assert from "node:assert/strict";
import fs from "node:fs";

const serverSource = fs.readFileSync("server.ts", "utf8");
const typesSource = fs.readFileSync("src/types.ts", "utf8");
const classroomSource = fs.readFileSync("src/components/VirtualClassroom.tsx", "utf8");
const projectMap = fs.readFileSync("PROJECT_MAP.md", "utf8");

assert.match(typesSource, /liveStartedAt\?:\s*string\s*\|\s*null/);

assert.match(serverSource, /liveStartedAt:\s*getLiveStartedAt\(course\)/);
assert.match(serverSource, /if\s*\(!course\.isLiveNow\)\s*return\s+null/);
assert.match(serverSource, /liveSessions:\s*activeLiveSessionInclude/);
assert.match(serverSource, /startTime:\s*liveStartedAt/);
assert.match(serverSource, /Live session synced/);

assert.match(classroomSource, /course\.liveStartedAt/);
assert.match(classroomSource, /liveStartedAtMs/);
assert.doesNotMatch(classroomSource, /meetingStartedAtRef/);

assert.match(projectMap, /Live timer/);

console.log("Live session timer rules passed");
