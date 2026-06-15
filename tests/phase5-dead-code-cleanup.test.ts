import assert from "node:assert/strict";
import fs from "node:fs";
import { readApiRouteSources } from "./helpers/api-route-sources.ts";
import { readLiveKitHookSources } from "./helpers/live-classroom-sources.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("phase5-dead-code-cleanup", () => {
  // P14 — dead study-schedule helpers removed from profile-routes
  const profileRoutes = fs.readFileSync("src/routes/profile-routes.ts", "utf8");
  assert.doesNotMatch(profileRoutes, /_listStudentStudyScheduleSessions/);
  assert.doesNotMatch(profileRoutes, /_getOwnedStudentStudyScheduleSession/);
  assert.doesNotMatch(profileRoutes, /studentStudyScheduleSession/);

  const objectivesRoutes = fs.readFileSync("src/routes/objectives-routes.ts", "utf8");
  assert.match(objectivesRoutes, /listStudentStudyScheduleSessions/);
  assert.match(objectivesRoutes, /getOwnedStudentStudyScheduleSession/);

  // P20 — no unused _requireAdmin (or similar) middleware aliases in route modules
  const routeSources = readApiRouteSources();
  assert.doesNotMatch(routeSources, /requireAdmin:\s*_requireAdmin/);
  assert.doesNotMatch(routeSources, /requireRbac:\s*_requireRbac/);
  assert.doesNotMatch(routeSources, /validateBody:\s*_validateBody/);

  // P17 — innerHTML replaced with DOM-safe APIs in live media attach
  const liveKitSources = readLiveKitHookSources();
  assert.doesNotMatch(liveKitSources, /\.innerHTML\s*=/);
  assert.match(liveKitSources, /replaceChildren/);

  console.log("Phase 5 dead-code cleanup guards passed");
});
