import assert from "node:assert/strict";
import fs from "node:fs";
import { readApiRouteSources } from "./helpers/api-route-sources.ts";
import { readLiveClassroomSources } from "./helpers/live-classroom-sources.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("live-session-timer", () => {
  const serverSource = readApiRouteSources();
  const typesSource = fs.readFileSync("src/types.ts", "utf8");
  const classroomSource = readLiveClassroomSources();
  const projectMap = fs.readFileSync("PROJECT_MAP.md", "utf8");

  assert.match(typesSource, /liveStartedAt\?:\s*string\s*\|\s*null/);

  assert.match(serverSource, /liveStartedAt:\s*getLiveStartedAt\(course\)/);
  assert.match(serverSource, /if\s*\(!course\.isLiveNow\)\s*return\s+null/);
  assert.match(serverSource, /liveSessions:\s*activeLiveSessionInclude/);
  const catalogMappersSource = fs.readFileSync("src/server/mappers/catalog-mappers.ts", "utf8");
  assert.match(catalogMappersSource, /select:\s*activeLiveSessionSelect/);
  assert.match(catalogMappersSource, /startTime:\s*true/);
  const liveMappersSource = fs.readFileSync("src/server/mappers/live-mappers.ts", "utf8");
  assert.match(liveMappersSource, /upsertActiveLiveSessionRecord/);
  assert.match(liveMappersSource, /Falling back to legacy live session upsert/);
  const coursesRoutesSource = fs.readFileSync("src/routes/courses-routes.ts", "utf8");
  assert.match(coursesRoutesSource, /patchTouchesPricing/);
  assert.match(coursesRoutesSource, /upsertActiveLiveSessionRecord/);
  assert.match(serverSource, /Live session synced/);

  assert.match(classroomSource, /course\.liveStartedAt/);
  assert.match(classroomSource, /liveStartedAtMs/);
  assert.doesNotMatch(classroomSource, /meetingStartedAtRef/);

  assert.match(projectMap, /Live timer/);
});
