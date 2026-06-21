import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("student-live-exit", () => {
  const source = readFileSync("src/hooks/useLiveKitRoom.tsx", "utf8");
  const leaveStart = source.indexOf("const leaveLiveRoom");
  const leaveEnd = source.indexOf("const classroomBindings", leaveStart);
  const leaveSource = source.slice(leaveStart, leaveEnd);

  assert.ok(leaveStart >= 0 && leaveEnd > leaveStart, "leaveLiveRoom must be present");
  assert.match(leaveSource, /courseToOpen = courses\.find/);
  assert.match(leaveSource, /courseToOpen = await api\.getCourse\(course\.id\)/);
  assert.match(leaveSource, /navigateTo\("course", courseToOpen\)/);
  assert.doesNotMatch(
    leaveSource,
    /setSelectedCourse\(options\.liveEnded \? \{ \.\.\.course, isLiveNow: false, liveSubject: null \} : course\)/,
  );
});
