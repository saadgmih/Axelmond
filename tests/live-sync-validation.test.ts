import assert from "node:assert/strict";
import fs from "node:fs";
import { applyPollStart, buildSharedResource, createEmptyPoll } from "../src/live/live-sync.ts";
import {
  extractParticipantRole,
  isModeratorOnlyLiveSyncType,
  isSafeLiveResourceUrl,
  isWhiteboardStrokeRateLimited,
  sanitizeWhiteboardStroke,
  trackWhiteboardStrokeTimestamp,
  validateIncomingLiveSyncMessage,
  validateOutgoingLiveSyncMessage,
} from "../src/live/live-sync-validation.ts";
import { readApiRouteSources } from "./helpers/api-route-sources.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("live-sync-validation", () => {
  const poll = applyPollStart("Question ?", ["A", "B"]);
  const baseContext = {
    senderIdentity: "axelmond-user-student-1",
    senderRole: "STUDENT" as const,
    localIdentity: "axelmond-user-student-1",
    currentPoll: poll,
    currentStrokeCount: 0,
    payloadSize: 128,
  };

  assert.equal(isModeratorOnlyLiveSyncType("RESOURCE_SHARE"), true);
  assert.equal(isModeratorOnlyLiveSyncType("POLL_VOTE"), false);
  assert.equal(extractParticipantRole({ attributes: { role: "PROFESSOR" } }), "PROFESSOR");

  assert.equal(isSafeLiveResourceUrl("https://ufs.sh/doc.pdf"), true);
  assert.equal(isSafeLiveResourceUrl("https://example.com/doc.pdf"), false);
  assert.equal(isSafeLiveResourceUrl("javascript:alert(1)"), false);
  assert.equal(isSafeLiveResourceUrl("http://ufs.sh/doc.pdf"), false);

  const forgedResource = validateIncomingLiveSyncMessage(
    {
      type: "RESOURCE_SHARE",
      resource: {
        title: "Phishing",
        url: "javascript:alert(1)",
        sharedBy: "Hacker",
        kind: "link",
      },
    },
    { ...baseContext, senderRole: "STUDENT" },
  );
  assert.equal(forgedResource, null);

  const moderatorResource = validateIncomingLiveSyncMessage(
    {
      type: "RESOURCE_SHARE",
      resource: {
        title: "Slides",
        url: "https://ufs.sh/doc.pdf",
        sharedBy: "Prof",
        kind: "pdf",
      },
    },
    { ...baseContext, senderRole: "PROFESSOR", senderIdentity: "axelmond-user-prof-1" },
  );
  assert.ok(moderatorResource && moderatorResource.type === "RESOURCE_SHARE");

  const forgedPollStart = validateIncomingLiveSyncMessage(
    { type: "POLL_START", question: "Hack ?", options: ["X"] },
    baseContext,
  );
  assert.equal(forgedPollStart, null);

  const forgedVote = validateIncomingLiveSyncMessage(
    { type: "POLL_VOTE", voterId: "axelmond-user-other", option: "A" },
    baseContext,
  );
  assert.equal(forgedVote, null);

  const validVote = validateIncomingLiveSyncMessage(
    { type: "POLL_VOTE", voterId: "axelmond-user-student-1", option: "A" },
    baseContext,
  );
  assert.ok(validVote && validVote.type === "POLL_VOTE");

  const stroke = sanitizeWhiteboardStroke(
    {
      id: "axelmond-user-student-1-123-abc",
      tool: "draw",
      color: "#8b5cf6",
      width: 3,
      points: [{ x: 0.1, y: 0.2 }],
    },
    "axelmond-user-student-1",
  );
  assert.ok(stroke);

  const impersonatedStroke = sanitizeWhiteboardStroke(
    {
      id: "axelmond-user-prof-1-123-abc",
      tool: "draw",
      color: "#8b5cf6",
      width: 3,
      points: [{ x: 0.1, y: 0.2 }],
    },
    "axelmond-user-student-1",
  );
  assert.equal(impersonatedStroke, null);

  const outgoing = validateOutgoingLiveSyncMessage(
    { type: "WHITEBOARD_STROKE", stroke: stroke! },
    {
      localIdentity: "axelmond-user-student-1",
      canModerate: false,
      currentPoll: poll,
      currentStrokeCount: 0,
    },
  );
  assert.ok(outgoing);

  const blockedModeratorAction = validateOutgoingLiveSyncMessage(
    { type: "RESOURCE_DISMISS" },
    {
      localIdentity: "axelmond-user-student-1",
      canModerate: false,
      currentPoll: createEmptyPoll(),
      currentStrokeCount: 0,
    },
  );
  assert.equal(blockedModeratorAction, null);

  assert.equal(buildSharedResource("Slides", "javascript:alert(1)", "Prof"), null);
  assert.ok(buildSharedResource("Slides", "https://ufs.sh/doc.pdf", "Prof"));

  const timestamps = Array.from({ length: 120 }, (_, index) => 1_000 + index);
  assert.equal(isWhiteboardStrokeRateLimited(timestamps, 61_000), true);
  assert.equal(
    isWhiteboardStrokeRateLimited(trackWhiteboardStrokeTimestamp(timestamps.slice(0, 10), 61_000), 61_000),
    false,
  );

  const hookSource = fs.readFileSync("src/hooks/useLiveKitRoom.tsx", "utf8");
  const serverSource = readApiRouteSources();
  const resourceStageSource = fs.readFileSync("src/components/live/LiveResourceStage.tsx", "utf8");

  assert.match(hookSource, /validateIncomingLiveSyncMessage/);
  assert.match(hookSource, /shouldPublishLiveSyncViaServer/);
  assert.match(hookSource, /api\.publishLiveSync/);
  assert.match(hookSource, /if \(!canModerateLive \|\| !requesterIdentity/);
  assert.match(serverSource, /\/api\/livekit\/sync/);
  assert.match(serverSource, /roomService\.sendData/);
  assert.match(resourceStageSource, /sandbox=/);
  assert.doesNotMatch(resourceStageSource, /allow-scripts/);
});
