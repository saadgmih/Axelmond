import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync("src/App.tsx", "utf8");
const teacherDashboardSource = readFileSync("src/views/teacher/TeacherDashboardView.tsx", "utf8");
const cssSource = readFileSync("src/index.css", "utf8");

assert.match(appSource, /TeacherDashboardView/);
assert.match(teacherDashboardSource, /type="range"/);
assert.match(teacherDashboardSource, /course\.price/);
assert.match(cssSource, /\.course-price-slider/);

console.log("Course price slider rules passed");
