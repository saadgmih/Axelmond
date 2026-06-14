import assert from "node:assert/strict";
import { readCurriculumViewSources } from "./helpers/live-classroom-sources.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("teacher-video-preview", () => {
  const curriculumSource = readCurriculumViewSources();

  assert.match(curriculumSource, /import PremiumVideoPlayer from/);
  assert.match(curriculumSource, /content\.type === "VIDEO" &&/);
  assert.match(curriculumSource, /src=\{attachment\.url\}/);
  assert.match(curriculumSource, /title=\{content\.title\}/);
  assert.match(curriculumSource, /instructor=\{managedCourse\?\.instructor \?\? "Professeur"\}/);
  assert.match(curriculumSource, /activeSector="teacher"/);
  assert.doesNotMatch(curriculumSource, /<video[\s\S]*controls/);
});
