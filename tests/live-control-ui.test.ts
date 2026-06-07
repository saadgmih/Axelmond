import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const liveControlSource = readFileSync("src/views/teacher/TeacherLiveControlView.tsx", "utf8");
const themeSource = readFileSync("src/views/teacher/live-control-theme.ts", "utf8");

assert.match(liveControlSource, /Console de visioconférence Axelmond Research Labs/);
assert.match(liveControlSource, /Module académique en direct/i);
assert.match(liveControlSource, /Sujet de révision actif/i);
assert.match(liveControlSource, /État de la diffusion en direct/i);
assert.match(liveControlSource, /Éteindre le signal/);
assert.match(liveControlSource, /Entrer dans la salle/);
assert.match(liveControlSource, /handleUpdateCourseLiveSubject/);
assert.match(liveControlSource, /handleToggleCourseLive/);
assert.match(liveControlSource, /liveControlUi/);
assert.match(themeSource, /#070b14/);
assert.doesNotMatch(liveControlSource, /bg-white border border-slate-200/);

console.log("Live control UI rules passed");
