import type { Dispatch, SetStateAction } from "react";
import type { Room } from "livekit-client";
import { api } from "../../api";
import { LIVE_SYNC_TOPIC, type LivePollState, type LiveSyncMessage, type LiveWhiteboardStroke } from "../../live/live-sync";
import {
  shouldPublishLiveSyncViaServer,
  validateOutgoingLiveSyncMessage,
} from "../../live/live-sync-validation";

export interface LiveSyncPublisherContext {
  activeLiveCourseId: number | undefined;
  canModerateLive: boolean;
  livePollRef: React.RefObject<LivePollState>;
  whiteboardStrokesRef: React.RefObject<LiveWhiteboardStroke[]>;
}

export function createPublishLiveSync(context: LiveSyncPublisherContext) {
  return async (room: Room | null, message: LiveSyncMessage) => {
    if (!room || !context.activeLiveCourseId) return;

    const validated = validateOutgoingLiveSyncMessage(message, {
      localIdentity: room.localParticipant.identity,
      canModerate: context.canModerateLive,
      currentPoll: context.livePollRef.current,
      currentStrokeCount: context.whiteboardStrokesRef.current.length,
    });
    if (!validated) {
      console.warn("[livekit] Live sync publish rejected", { type: message.type });
      return;
    }

    try {
      if (shouldPublishLiveSyncViaServer(validated, context.canModerateLive)) {
        await api.publishLiveSync(context.activeLiveCourseId, validated);
        return;
      }
      await room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify(validated)), {
        reliable: true,
        topic: LIVE_SYNC_TOPIC,
      });
    } catch (err) {
      console.error("[livekit] Live sync publish failed", err);
    }
  };
}

export async function refreshLiveAttendanceReport(
  courseId: number,
  setLiveAttendanceReport: Dispatch<SetStateAction<any | null>>,
) {
  try {
    const report = await api.getLiveAttendance(courseId);
    setLiveAttendanceReport(report);
  } catch (err) {
    console.warn("[livekit] Attendance report unavailable", err);
  }
}
