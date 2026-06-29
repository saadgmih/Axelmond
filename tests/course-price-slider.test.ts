import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readAppSources } from "./helpers/app-sources.ts";
import {
  clampCoursePrice,
  getCoursePriceSliderPct,
  getCoursePriceSliderPercentage,
} from "../src/components/CoursePriceSlider.tsx";
import {
  MAX_COURSE_PRICE,
  MIN_PAID_COURSE_PRICE,
  formatFreeAccessDurationLabel,
  freeAccessDurationInputValue,
  isValidCoursePrice,
  normalizeFreeAccessDurationDays,
  normalizeCoursePrice,
} from "../src/utils/course-pricing.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("course-price-slider", () => {
  const appSource = readAppSources();
  const teacherDashboardSource = readFileSync("src/views/teacher/TeacherDashboardView.tsx", "utf8");
  const sliderSource = readFileSync("src/components/CoursePriceSlider.tsx", "utf8");
  const curriculumModulesSource = readFileSync("src/views/teacher/curriculum-steps/CurriculumModulesStep.tsx", "utf8");
  const routeSchemasSource = readFileSync("src/server/route-schemas.ts", "utf8");
  const cssSource = readFileSync("src/index.css", "utf8");

  assert.match(appSource, /TeacherDashboardView/);
  assert.match(teacherDashboardSource, /CoursePriceSlider/);
  assert.match(teacherDashboardSource, /Gestion des Tarifs/);
  assert.doesNotMatch(teacherDashboardSource, /Gestion des Tarifs & Séminaires/);
  assert.match(sliderSource, /type="range"/);
  assert.match(sliderSource, /Gratuit/);
  assert.match(sliderSource, /Payant/);
  assert.match(sliderSource, /formatFreeAccessDurationLabel/);
  assert.match(curriculumModulesSource, /Durée de gratuité/);
  assert.match(curriculumModulesSource, /FREE_ACCESS_DURATION_OPTIONS/);
  assert.match(curriculumModulesSource, /Gratuité illimitée/);
  assert.match(sliderSource, /onCommit/);
  assert.match(sliderSource, /draggingRef/);
  assert.match(sliderSource, /course-price-slider-root/);
  assert.match(sliderSource, /is-free/);
  assert.match(sliderSource, /--slider-pct/);
  assert.match(sliderSource, /getCoursePriceSliderPct/);
  assert.match(routeSchemasSource, /isValidCoursePrice/);
  assert.match(routeSchemasSource, /MIN_PAID_COURSE_PRICE/);
  assert.match(routeSchemasSource, /freeAccessDurationDays/);
  assert.doesNotMatch(teacherDashboardSource, /handleUpdateCoursePrice\(course\.id, parseFloat/);
  assert.doesNotMatch(teacherDashboardSource, /Actuellement en cours/);
  assert.doesNotMatch(teacherDashboardSource, /Séminaire Virtuel Live/);
  assert.match(cssSource, /\.course-price-slider-root/);
  assert.match(cssSource, /\.course-price-slider-active/);
  assert.match(cssSource, /\.course-price-slider-thumb/);
  assert.match(cssSource, /\.course-price-slider-root\.is-free/);
  assert.match(cssSource, /translate\(-50%, -50%\)/);

  assert.equal(getCoursePriceSliderPct(0), 0);
  assert.equal(getCoursePriceSliderPct(MAX_COURSE_PRICE), 1);
  assert.ok(Math.abs(getCoursePriceSliderPercentage((MIN_PAID_COURSE_PRICE + MAX_COURSE_PRICE) / 2) - 50) < 0.2);
  assert.equal(clampCoursePrice(500), MAX_COURSE_PRICE);
  assert.equal(clampCoursePrice(-10), 0);
  assert.equal(clampCoursePrice(1), MIN_PAID_COURSE_PRICE);
  assert.equal(normalizeCoursePrice(0), 0);
  assert.equal(normalizeCoursePrice(1), MIN_PAID_COURSE_PRICE);
  assert.equal(isValidCoursePrice(0), true);
  assert.equal(isValidCoursePrice(MIN_PAID_COURSE_PRICE), true);
  assert.equal(isValidCoursePrice(MIN_PAID_COURSE_PRICE - 1), false);
  assert.equal(normalizeFreeAccessDurationDays(""), null);
  assert.equal(normalizeFreeAccessDurationDays("30"), 30);
  assert.equal(freeAccessDurationInputValue(null), "");
  assert.equal(freeAccessDurationInputValue(14), "14");
  assert.equal(formatFreeAccessDurationLabel(null), "Gratuit illimité");
  assert.equal(formatFreeAccessDurationLabel(7), "Gratuit 7 jours");
});
