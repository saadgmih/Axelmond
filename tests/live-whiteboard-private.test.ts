import assert from "node:assert/strict";
import fs from "node:fs";
import { rulesTest } from "./helpers/rulesTest.ts";
import { applyLiveSyncMessage } from "../src/hooks/livekit/live-sync-state.ts";
import { createEmptyPoll } from "../src/live/live-sync.ts";

rulesTest("live-whiteboard-private", async () => {
  const controlsSource = fs.readFileSync("src/hooks/livekit/useLiveRoomControls.ts", "utf8");
  const syncStateSource = fs.readFileSync("src/hooks/livekit/live-sync-state.ts", "utf8");

  assert.doesNotMatch(controlsSource, /publishLiveSync\(liveRoom,\s*\{\s*type:\s*"WHITEBOARD_STROKE"/);
  assert.doesNotMatch(controlsSource, /publishLiveSync\(liveRoom,\s*\{\s*type:\s*"WHITEBOARD_CLEAR"/);
  assert.doesNotMatch(syncStateSource, /type:\s*"WHITEBOARD_SNAPSHOT"/);
  assert.doesNotMatch(
    fs.readFileSync("src/components/live/LiveWhiteboardPanel.tsx", "utf8"),
    /Géométrie|Dessin libre|ZoomIn/,
  );

  let strokes: Array<{
    id: string;
    tool: "draw";
    color: string;
    width: number;
    points: Array<{ x: number; y: number }>;
  }> = [];
  const setWhiteboardStrokes = (updater: typeof strokes | ((prev: typeof strokes) => typeof strokes)) => {
    strokes = typeof updater === "function" ? updater(strokes) : updater;
  };

  applyLiveSyncMessage(
    {
      type: "WHITEBOARD_STROKE",
      stroke: { id: "other-1", tool: "draw", color: "#000000", width: 2, points: [{ x: 0.1, y: 0.1 }] },
    },
    "me",
    {
      setWhiteboardStrokes,
      setLivePoll: () => undefined,
      setMyPollVote: () => undefined,
      setSharedResource: () => undefined,
    },
  );

  assert.equal(strokes.length, 0, "incoming whiteboard strokes must be ignored");

  applyLiveSyncMessage(
    {
      type: "WHITEBOARD_SNAPSHOT",
      strokes: [{ id: "snap-1", tool: "draw", color: "#fff", width: 2, points: [{ x: 0.5, y: 0.5 }] }],
    },
    "me",
    {
      setWhiteboardStrokes,
      setLivePoll: () => undefined,
      setMyPollVote: () => undefined,
      setSharedResource: () => undefined,
    },
  );

  assert.equal(strokes.length, 0, "whiteboard snapshots must be ignored");

  let poll = createEmptyPoll();
  applyLiveSyncMessage({ type: "POLL_START", question: "Test?", options: ["A", "B"] }, "me", {
    setWhiteboardStrokes,
    setLivePoll: (value) => {
      poll = typeof value === "function" ? value(poll) : value;
    },
    setMyPollVote: () => undefined,
    setSharedResource: () => undefined,
  });

  assert.equal(poll.active, true, "other live sync messages must still apply");
});
