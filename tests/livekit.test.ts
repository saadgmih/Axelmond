import assert from "node:assert/strict";import {
  buildLiveKitRoomName,
  getLiveKitConfig,
  getLiveKitParticipantIdentity,
} from "../src/livekit.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("livekit", () => {
assert.equal(buildLiveKitRoomName(1), "axelmond-course-1");
assert.equal(buildLiveKitRoomName(601), "axelmond-course-601");

assert.equal(getLiveKitParticipantIdentity("student-123"), "axelmond-user-student-123");
assert.equal(getLiveKitParticipantIdentity("professor 456"), "axelmond-user-professor-456");

assert.deepEqual(
  getLiveKitConfig({
    LIVEKIT_URL: "wss://axelmond-research-labs.livekit.cloud",
    LIVEKIT_API_KEY: "key",
    LIVEKIT_API_SECRET: "secret",
  }),
  {
    url: "wss://axelmond-research-labs.livekit.cloud",
    apiKey: "key",
    apiSecret: "secret",
  }
);

assert.equal(
  getLiveKitConfig({
    LIVEKIT_URL: "wss://axelmond-research-labs.livekit.cloud",
    LIVEKIT_API_KEY: "key",
  }),
  null
);

});
