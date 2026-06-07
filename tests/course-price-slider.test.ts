import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync("src/App.tsx", "utf8");
const teacherDashboardSource = readFileSync("src/views/teacher/TeacherDashboardView.tsx", "utf8");
const sliderSource = readFileSync("src/components/CoursePriceSlider.tsx", "utf8");
const cssSource = readFileSync("src/index.css", "utf8");

assert.match(appSource, /TeacherDashboardView/);
assert.match(teacherDashboardSource, /CoursePriceSlider/);
assert.match(teacherDashboardSource, /Gestion des Tarifs/);
assert.doesNotMatch(teacherDashboardSource, /Gestion des Tarifs & Séminaires/);
assert.match(sliderSource, /type="range"/);
assert.match(sliderSource, /onCommit/);
assert.match(sliderSource, /draggingRef/);
assert.doesNotMatch(teacherDashboardSource, /handleUpdateCoursePrice\(course\.id, parseFloat/);
assert.doesNotMatch(teacherDashboardSource, /Actuellement en cours/);
assert.doesNotMatch(teacherDashboardSource, /Séminaire Virtuel Live/);
assert.match(cssSource, /\.course-price-slider/);

console.log("Course price slider rules passed");
