import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  clampCoursePrice,
  getCoursePriceSliderPct,
  getCoursePriceSliderPercentage,
} from "../src/components/CoursePriceSlider.tsx";

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
assert.match(sliderSource, /course-price-slider-root/);
assert.match(sliderSource, /--slider-pct/);
assert.match(sliderSource, /getCoursePriceSliderPct/);
assert.doesNotMatch(teacherDashboardSource, /handleUpdateCoursePrice\(course\.id, parseFloat/);
assert.doesNotMatch(teacherDashboardSource, /Actuellement en cours/);
assert.doesNotMatch(teacherDashboardSource, /Séminaire Virtuel Live/);
assert.match(cssSource, /\.course-price-slider-root/);
assert.match(cssSource, /\.course-price-slider-active/);
assert.match(cssSource, /\.course-price-slider-thumb/);
assert.match(cssSource, /translate\(-50%, -50%\)/);

assert.equal(getCoursePriceSliderPct(0), 0);
assert.equal(getCoursePriceSliderPct(499), 1);
assert.equal(getCoursePriceSliderPercentage(249.5), 50);
assert.equal(clampCoursePrice(500), 499);
assert.equal(clampCoursePrice(-10), 0);

console.log("Course price slider rules passed");
