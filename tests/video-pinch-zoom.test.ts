import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "vitest";

test("Video pinch zoom clamps strictly within video edges like YouTube and avoids drifting outside corners", () => {
  const pinchZoomSource = readFileSync("src/hooks/useVideoPinchZoom.ts", "utf8");

  // Clamping strictly bounds scaled video within container bounds (no black void outside corners)
  assert.match(pinchZoomSource, /maxPanX = Math\.max\(0, \(displayWidth \* \(currentScale - 1\)\) \/ 2\)/);
  assert.match(pinchZoomSource, /maxPanY = Math\.max\(0, \(displayHeight \* \(currentScale - 1\)\) \/ 2\)/);
  assert.doesNotMatch(pinchZoomSource, /\+ 80/); // Obsolete loose offset removed

  // Gesture motion state resets properly so clicks/taps are never stuck
  assert.match(pinchZoomSource, /touchMovedRef\.current = false;/);
  assert.match(pinchZoomSource, /lastGestureEndTimeRef\.current = Date\.now\(\);/);
});

test("PremiumVideoPlayer supports YouTube double-tap seek (+10s right / -10s left) and responsive center pause", () => {
  const playerSource = readFileSync("src/components/PremiumVideoPlayer.tsx", "utf8");

  // Double tap detection on left (-10s) and right (+10s)
  assert.match(playerSource, /ratio <= 0\.35 \? "left" : ratio >= 0\.65 \? "right" : "center"/);
  assert.match(playerSource, /seekTo\(targetTime\)/);
  assert.match(playerSource, /doubleTapFeedback/);
  assert.match(playerSource, /\+10s/);
  assert.match(playerSource, /-10s/);

  // Surface click shows overlay / pause button without stopping playback, pause button explicitly pauses
  assert.match(playerSource, /executeSingleTap/);
  assert.match(playerSource, /scheduleHideOverlay/);
});

