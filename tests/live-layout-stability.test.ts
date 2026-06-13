import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const classroomSource = readFileSync("src/components/VirtualClassroom.tsx", "utf8");
const tutorSource = readFileSync("src/components/AITutorChat.tsx", "utf8");
const themeSource = readFileSync("src/views/teacher/live-control-theme.ts", "utf8");
const appSource = readFileSync("src/App.tsx", "utf8");

assert.match(classroomSource, /data-live-video-stage/);
assert.match(classroomSource, /live-classroom-main/);
assert.match(classroomSource, /live-classroom-video-stage/);
assert.match(classroomSource, /data-live-sidebar/);
assert.match(classroomSource, /overflow-hidden/);
assert.match(classroomSource, /isSidebarOpen \? "lg:grid-cols-\[minmax\(0,1fr\)_360px\]" : "lg:grid-cols-1"/);
assert.doesNotMatch(classroomSource, /max-h-\[min\(72dvh,780px\)\]/);
assert.doesNotMatch(classroomSource, /lg:min-h-\[480px\]/);

assert.match(tutorSource, /isLive[\s\S]*h-full min-h-0 flex-1/);
assert.doesNotMatch(tutorSource, /min-h-\[min\(620px,calc\(100dvh-11rem\)\)\]/);

assert.match(themeSource, /roomShell:[\s\S]*overflow-hidden/);
assert.match(themeSource, /roomShell:[\s\S]*h-\[min\(78dvh,820px\)\]/);

assert.match(appSource, /lockMainScroll = currentView === "course" \|\| isStudentLive/);
assert.match(appSource, /hideGlobalFooter = currentView === "course" \|\| isLiveSessionView/);

console.log("Live layout stability rules passed");
