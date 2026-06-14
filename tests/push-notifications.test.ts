import assert from "node:assert/strict";
import { test } from "vitest";
import {
  isValidVapidPublicKey,
  mapPushSubscribeError,
  urlBase64ToUint8Array,
} from "../src/utils/push-notifications";

const samplePublicKey =
  "BJHdnUNanUxaecJE5pYu9_vWIzZ2f0FLrYFxOmnurkqgP4-EOQpfQ-kyhhnkUaUCw7yQeeDcg5OXDzdyVVqQt9w";

test("isValidVapidPublicKey accepts configured production-style key", () => {
  assert.equal(isValidVapidPublicKey(samplePublicKey), true);
  const bytes = urlBase64ToUint8Array(samplePublicKey);
  assert.equal(bytes.length, 65);
  assert.equal(bytes[0], 0x04);
});

test("isValidVapidPublicKey rejects malformed keys", () => {
  assert.equal(isValidVapidPublicKey(""), false);
  assert.equal(isValidVapidPublicKey("not-a-key"), false);
});

test("mapPushSubscribeError translates browser push service failures", () => {
  const message = mapPushSubscribeError("Registration failed - push service error");
  assert.match(message, /service push/i);
  const unavailable = mapPushSubscribeError("Registration failed - push service not available");
  assert.match(unavailable, /service push/i);
});
