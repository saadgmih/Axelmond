import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync("src/App.tsx", "utf8");
const classroomSource = readFileSync("src/components/VirtualClassroom.tsx", "utf8");
const workspaceSource = readFileSync("src/views/teacher/TeacherWorkspace.tsx", "utf8");
const liveThemeSource = readFileSync("src/views/teacher/live-control-theme.ts", "utf8");

assert.match(appSource, /lockMainScroll/);
assert.match(appSource, /overflow-y-auto/);
assert.match(appSource, /isLiveSessionView/);
assert.match(appSource, /lockMainScroll = currentView === "course" \|\| isStudentLive/);
assert.match(appSource, /flex h-full min-h-0 flex-col overflow-hidden/);

const liveControlSource = readFileSync("src/views/teacher/TeacherLiveControlView.tsx", "utf8");
assert.match(liveControlSource, /roomShell/);
assert.match(liveControlSource, /Éteindre le live/);

assert.doesNotMatch(workspaceSource, /immersive[\s\S]*h-full min-h-0/);

assert.match(liveThemeSource, /roomShell:[\s\S]*overflow-hidden/);

assert.doesNotMatch(liveControlSource, /Entrer dans la salle/);
assert.doesNotMatch(liveControlSource, /Éteindre le signal/);
assert.match(classroomSource, /Control Bar — au-dessus de la vidéo/);
assert.match(classroomSource, /Quitter/);
assert.doesNotMatch(classroomSource, /h-full min-h-0 w-full max-w-full bg-zinc-950/);

console.log("Live scroll accessibility rules passed");
