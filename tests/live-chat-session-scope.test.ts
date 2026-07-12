import assert from "node:assert/strict";
import fs from "node:fs";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("live-chat-session-scope", async () => {
  const liveRoutesSource = fs.readFileSync("src/routes/live-routes.ts", "utf8");
  const liveMappersSource = fs.readFileSync("src/server/mappers/live-mappers.ts", "utf8");

  assert.match(liveRoutesSource, /listLiveChatMessagesForActiveSession/);
  assert.doesNotMatch(liveRoutesSource, /liveMessage\.findMany\(\{\s*where:\s*\{\s*roomName\s*\}/);
  assert.match(liveMappersSource, /createdAt:\s*\{\s*gte:\s*session\.startTime\s*\}/);
  assert.match(liveMappersSource, /if\s*\(!session\?\.isActive\)/);
});
