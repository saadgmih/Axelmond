import assert from "node:assert/strict";
import {
  buildLiveReplayBody,
  buildLiveReplayTitle,
  isLiveReplayContent,
  parseLiveReplayBody,
} from "../src/live/live-replay.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("live-replay", () => {
  const body = buildLiveReplayBody("session-123");
  assert.equal(isLiveReplayContent(body), true);
  assert.equal(parseLiveReplayBody(body)?.liveSessionId, "session-123");
  assert.match(buildLiveReplayTitle("Programmation C++", "Labo AVL"), /^Rediffusion — Labo AVL — /);
});
