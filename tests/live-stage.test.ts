import assert from "node:assert/strict";
import test from "node:test";
import { resolveStageParticipants, stageGridClass } from "../src/components/live/live-stage";

const baseParticipants = [
  { identity: "a", name: "Alice", initials: "AL", isLocal: false, role: "STUDENT" },
  { identity: "b", name: "Bob", initials: "BO", isLocal: true, role: "PROFESSOR" },
];

test("resolveStageParticipants returns all participants in tile mode without video", () => {
  const result = resolveStageParticipants(baseParticipants as any, "tile", baseParticipants[1] as any, "teacher");
  assert.equal(result.length, 2);
});

test("stageGridClass adapts to participant count", () => {
  assert.match(stageGridClass(1, false), /grid-cols-1/);
  assert.match(stageGridClass(6, false), /grid-cols-2/);
});
