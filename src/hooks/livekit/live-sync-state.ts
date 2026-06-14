import type { Dispatch, SetStateAction } from "react";
import type { Room } from "livekit-client";
import type { LivePollState, LiveSharedResource, LiveSyncMessage, LiveWhiteboardStroke } from "../../live/live-sync";
import { appendWhiteboardStroke, applyPollStart, mergePollVote } from "../../live/live-sync";

export function applyLiveSyncMessage(
  message: LiveSyncMessage,
  localIdentity: string,
  setters: {
    setWhiteboardStrokes: Dispatch<SetStateAction<LiveWhiteboardStroke[]>>;
    setLivePoll: Dispatch<SetStateAction<LivePollState>>;
    setMyPollVote: Dispatch<SetStateAction<string | null>>;
    setSharedResource: Dispatch<SetStateAction<LiveSharedResource | null>>;
  },
) {
  switch (message.type) {
    case "WHITEBOARD_STROKE":
      setters.setWhiteboardStrokes((prev) => appendWhiteboardStroke(prev, message.stroke));
      break;
    case "WHITEBOARD_CLEAR":
      setters.setWhiteboardStrokes([]);
      break;
    case "WHITEBOARD_SNAPSHOT":
      setters.setWhiteboardStrokes(message.strokes);
      break;
    case "POLL_START":
      setters.setLivePoll(applyPollStart(message.question, message.options));
      setters.setMyPollVote(null);
      break;
    case "POLL_SYNC":
      setters.setLivePoll(message.poll);
      setters.setMyPollVote(message.poll.voters[localIdentity] || null);
      break;
    case "POLL_VOTE":
      setters.setLivePoll((prev) => mergePollVote(prev, message.voterId, message.option) || prev);
      if (message.voterId === localIdentity) {
        setters.setMyPollVote(message.option);
      }
      break;
    case "POLL_END":
      setters.setLivePoll((prev) => ({ ...prev, active: false }));
      break;
    case "RESOURCE_SHARE":
      setters.setSharedResource(message.resource);
      break;
    case "RESOURCE_DISMISS":
      setters.setSharedResource(null);
      break;
    default:
      break;
  }
}

export async function respondToLiveSyncRequest(
  room: Room,
  requesterIdentity: string | undefined,
  canModerateLive: boolean,
  refs: {
    whiteboardStrokes: LiveWhiteboardStroke[];
    livePoll: LivePollState;
    sharedResource: LiveSharedResource | null;
  },
  publishLiveSync: (room: Room | null, message: LiveSyncMessage) => Promise<void>,
) {
  if (!canModerateLive || !requesterIdentity || requesterIdentity === room.localParticipant.identity) return;

  if (refs.whiteboardStrokes.length > 0) {
    await publishLiveSync(room, {
      type: "WHITEBOARD_SNAPSHOT",
      strokes: refs.whiteboardStrokes,
    });
  }
  if (refs.livePoll.active) {
    await publishLiveSync(room, { type: "POLL_SYNC", poll: refs.livePoll });
  }
  if (refs.sharedResource) {
    await publishLiveSync(room, { type: "RESOURCE_SHARE", resource: refs.sharedResource });
  }
}
