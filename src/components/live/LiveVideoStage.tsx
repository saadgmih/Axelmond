import React from "react";
import type { LiveParticipantCard } from "../VirtualClassroom";
import type { LiveSharedResource, LiveWhiteboardStroke } from "../../live/live-sync";
import LiveConnectionNotice from "./LiveConnectionNotice";
import LiveParticipantTile from "./LiveParticipantTile";
import LiveResourceStage from "./LiveResourceStage";
import LiveWhiteboardPanel from "./LiveWhiteboardPanel";

export interface LiveVideoStageProps {
  connectionNotice: { message: string; variant: "info" | "success" | "warning" } | null;
  whiteboardExpanded: boolean;
  onCollapseWhiteboard: () => void;
  canModerate: boolean;
  whiteboardStrokes: LiveWhiteboardStroke[];
  localIdentity: string;
  onWhiteboardStroke: (stroke: LiveWhiteboardStroke) => void;
  onWhiteboardClear: () => void;
  videoGridClass: string;
  stageParticipants: LiveParticipantCard[];
  activeSpeaker: LiveParticipantCard | undefined;
  featuredLayout: boolean;
  registerVideoRef: (identity: string, element: HTMLVideoElement | null) => void;
  sharedResource: LiveSharedResource | null;
  onDismissResource: () => void;
}

export default function LiveVideoStage({
  connectionNotice,
  whiteboardExpanded,
  onCollapseWhiteboard,
  canModerate,
  whiteboardStrokes,
  localIdentity,
  onWhiteboardStroke,
  onWhiteboardClear,
  videoGridClass,
  stageParticipants,
  activeSpeaker,
  featuredLayout,
  registerVideoRef,
  sharedResource,
  onDismissResource,
}: LiveVideoStageProps) {
  return (
    <div className="live-classroom-video-shell flex-1 min-h-0 p-0 lg:p-4 flex flex-col relative min-w-0 bg-[#0a0a0a] overflow-hidden">
      <div
        data-live-video-stage
        className="live-classroom-video-stage flex-1 min-h-0 w-full h-full relative lg:rounded-2xl overflow-hidden bg-zinc-950 lg:border border-white/5 lg:shadow-2xl flex items-center justify-center box-border"
      >
        {connectionNotice && !whiteboardExpanded && (
          <LiveConnectionNotice message={connectionNotice.message} variant={connectionNotice.variant} />
        )}
        {whiteboardExpanded ? (
          <div className="h-full w-full p-3">
            <LiveWhiteboardPanel
              expanded
              onToggleExpanded={onCollapseWhiteboard}
              canModerate={canModerate}
              strokes={whiteboardStrokes}
              localIdentity={localIdentity}
              onStrokeComplete={onWhiteboardStroke}
              onClear={onWhiteboardClear}
            />
          </div>
        ) : (
          <>
            <div
              className={`live-video-grid grid ${videoGridClass} gap-3 w-full h-full p-3 ${stageParticipants.length === 1 ? "grid-rows-1" : ""}`}
            >
              {stageParticipants.map((participant) => {
                const isActive = participant.identity === activeSpeaker?.identity || participant.isSpeaking;
                const isFeatured = featuredLayout && participant.identity === stageParticipants[0]?.identity;
                const isSolo = stageParticipants.length === 1;
                return (
                  <LiveParticipantTile
                    key={participant.identity}
                    participant={participant}
                    isActive={Boolean(isActive)}
                    isFeatured={isFeatured}
                    isSolo={isSolo}
                    registerVideoRef={registerVideoRef}
                  />
                );
              })}
            </div>
            {sharedResource && (
              <LiveResourceStage resource={sharedResource} canModerate={canModerate} onDismiss={onDismissResource} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
