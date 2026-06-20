import assert from "node:assert/strict";
import { canDeleteOwnMessage, MESSAGE_DELETE_MAX_AGE_MS } from "../src/message-delete-policy.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("message-delete-policy", () => {
  const now = Date.parse("2026-06-15T12:00:00.000Z");
  const userId = "user-1";

  assert.equal(MESSAGE_DELETE_MAX_AGE_MS, 4 * 24 * 60 * 60 * 1000);

  assert.equal(canDeleteOwnMessage({ senderId: userId, createdAt: "2026-06-14T12:00:00.000Z" }, userId, now), true);

  assert.equal(canDeleteOwnMessage({ senderId: userId, createdAt: "2026-06-11T11:59:59.000Z" }, userId, now), false);

  assert.equal(
    canDeleteOwnMessage({ senderId: "other-user", createdAt: "2026-06-14T12:00:00.000Z" }, userId, now),
    false,
  );
});
