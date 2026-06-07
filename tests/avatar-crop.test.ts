import assert from "node:assert/strict";
import {
  AVATAR_CIRCLE_SIZE,
  clampAvatarPan,
  getAvatarBaseScale,
} from "../src/utils/avatar-crop.ts";

assert.equal(getAvatarBaseScale(1000, 500), AVATAR_CIRCLE_SIZE / 500);
assert.equal(getAvatarBaseScale(400, 400), AVATAR_CIRCLE_SIZE / 400);

const clamped = clampAvatarPan(500, 500, 1200, 800, 1.5);
assert.ok(Math.abs(clamped.panX) < 500);
assert.ok(Math.abs(clamped.panY) < 500);

const centered = clampAvatarPan(0, 0, 512, 512, 1);
assert.equal(centered.panX, 0);
assert.equal(centered.panY, 0);

console.log("Avatar crop utility tests passed");
