import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync("src/App.tsx", "utf8");
const classroomSource = readFileSync("src/components/VirtualClassroom.tsx", "utf8");
const workspaceSource = readFileSync("src/views/teacher/TeacherWorkspace.tsx", "utf8");
const liveThemeSource = readFileSync("src/views/teacher/live-control-theme.ts", "utf8");

assert.match(appSource, /lockMainScroll/);
assert.match(appSource, /overflow-y-auto/);
assert.doesNotMatch(appSource, /isImmersiveView \? "overflow-hidden min-h-0"/);
assert.doesNotMatch(appSource, /<div className="h-full min-h-0">\s*\n\s*<StudentLiveView/);
assert.match(appSource, /!isStudentLive && !isTeacherLiveRoom/);

const liveControlSource = readFileSync("src/views/teacher/TeacherLiveControlView.tsx", "utf8");
assert.match(liveControlSource, /if \(isRoomOpen && activeLiveCourse\)/);

assert.doesNotMatch(workspaceSource, /immersive[\s\S]*h-full min-h-0/);

assert.doesNotMatch(liveThemeSource, /100dvh,960px/);
assert.doesNotMatch(liveThemeSource, /roomShell:[\s\S]*overflow-hidden/);

assert.match(classroomSource, /min-h-\[560px\]/);
assert.doesNotMatch(classroomSource, /h-full min-h-0 w-full max-w-full bg-zinc-950/);

console.log("Live scroll accessibility rules passed");
