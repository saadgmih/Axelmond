import assert from "node:assert/strict";import {
  appendWhiteboardStroke,
  applyPollStart,
  buildSharedResource,
  createEmptyPoll,
  detectResourceKind,
  mergePollVote,
  type LiveWhiteboardStroke,
} from "../src/live/live-sync.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("live-sync", () => {
const emptyPoll = createEmptyPoll();
assert.equal(emptyPoll.active, false);
assert.equal(emptyPoll.options.length, 3);
assert.equal(emptyPoll.votes[emptyPoll.options[0]], 0);

const started = applyPollStart("Question test ?", ["A", "B"]);
assert.equal(started.active, true);
assert.equal(started.question, "Question test ?");
assert.deepEqual(started.options, ["A", "B"]);
assert.equal(started.votes.A, 0);

const voted = mergePollVote(started, "student-1", "A");
assert.ok(voted);
assert.equal(voted?.votes.A, 1);
assert.equal(voted?.voters["student-1"], "A");

const duplicateVote = mergePollVote(voted!, "student-1", "B");
assert.equal(duplicateVote, null);

const stroke: LiveWhiteboardStroke = {
  id: "stroke-1",
  tool: "draw",
  color: "#8b5cf6",
  width: 3,
  points: [{ x: 0.1, y: 0.2 }, { x: 0.5, y: 0.6 }],
};
const strokes = appendWhiteboardStroke([], stroke);
assert.equal(strokes.length, 1);
assert.equal(appendWhiteboardStroke(strokes, stroke).length, 1);

assert.equal(detectResourceKind("https://example.com/doc.pdf"), "pdf");
assert.equal(detectResourceKind("https://example.com/page"), "link");

const resource = buildSharedResource("Slides", "https://utfs.io/f/doc.pdf", "Prof");
assert.ok(resource);
assert.equal(resource?.kind, "pdf");
assert.equal(resource?.title, "Slides");

});
