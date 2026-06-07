import assert from "node:assert/strict";
import {
  DEFAULT_LIVE_SETTINGS,
  isTeacherLikeRole,
  readStoredLiveSettings,
} from "../src/live/liveSettings.ts";

assert.equal(isTeacherLikeRole("PROFESSOR"), true);
assert.equal(isTeacherLikeRole("RESEARCHER"), true);
assert.equal(isTeacherLikeRole("ADMIN"), true);
assert.equal(isTeacherLikeRole("STUDENT"), false);

const stored = readStoredLiveSettings();
assert.equal(stored.videoQuality, DEFAULT_LIVE_SETTINGS.videoQuality);
assert.equal(stored.layoutMode, DEFAULT_LIVE_SETTINGS.layoutMode);
assert.equal(stored.focusMode, false);

console.log("Live settings tests passed");
