import assert from "node:assert/strict";
import fs from "node:fs";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("live-attendance-student-hidden", async () => {
  const uiSource = fs.readFileSync("src/hooks/useVirtualClassroomUI.ts", "utf8");
  const classroomSource = fs.readFileSync("src/components/VirtualClassroom.tsx", "utf8");
  const rbacSource = fs.readFileSync("src/rbac.ts", "utf8");
  const liveRoutesSource = fs.readFileSync("src/routes/live-routes.ts", "utf8");
  const connectionSource = fs.readFileSync("src/hooks/livekit/useLiveKitConnection.ts", "utf8");

  assert.match(uiSource, /canViewLiveAttendance = !isStudentRole\(currentUserRole\)/);
  assert.match(uiSource, /tab\.id !== "attendance"/);
  assert.match(classroomSource, /ui\.canViewLiveAttendance/);
  assert.match(rbacSource, /isTeacherSpaceRole\(normalized\)/);
  assert.match(rbacSource, /livekit\\\/attendance\\\/\\d\+/);
  assert.match(liveRoutesSource, /Rapport de présence réservé au personnel enseignant/);
  assert.doesNotMatch(connectionSource, /90000/);
});
