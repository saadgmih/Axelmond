import { useEffect, useMemo, type RefObject } from "react";
import type { LiveParticipantCard } from "../../components/VirtualClassroom";

export interface UseLiveMediaAttachOptions {
  liveParticipants: LiveParticipantCard[];
  currentView: string;
  teacherView: string;
  activeLiveCourseId: number | undefined;
  liveVideoRefs: RefObject<Record<string, HTMLVideoElement | null>>;
  liveAudioContainerRef: RefObject<HTMLDivElement | null>;
}

export function useLiveMediaAttach({
  liveParticipants,
  currentView,
  teacherView,
  activeLiveCourseId,
  liveVideoRefs,
  liveAudioContainerRef,
}: UseLiveMediaAttachOptions) {
  const liveMediaSignature = useMemo(
    () =>
      liveParticipants
        .map((participant) =>
          [
            participant.identity,
            participant.isLocal ? "local" : "remote",
            participant.videoTrack?.sid || "",
            participant.audioTrack?.sid || "",
          ].join(":"),
        )
        .join("|"),
    [liveParticipants],
  );

  useEffect(() => {
    liveParticipants.forEach((participant) => {
      const videoElement = liveVideoRefs.current[participant.identity];
      if (videoElement && participant.videoTrack) {
        participant.videoTrack.attach(videoElement);
      }
    });

    const audioContainer = liveAudioContainerRef.current;
    if (audioContainer) {
      const audioElements = liveParticipants
        .filter((participant) => !participant.isLocal && participant.audioTrack)
        .map((participant) => {
          const audioElement = participant.audioTrack!.attach();
          audioElement.autoplay = true;
          return audioElement;
        });
      audioContainer.replaceChildren(...audioElements);
    }

    return () => {
      liveParticipants.forEach((participant) => {
        if (participant.videoTrack) {
          participant.videoTrack.detach(liveVideoRefs.current[participant.identity] || undefined);
        }
        if (participant.audioTrack) {
          participant.audioTrack.detach();
        }
      });
      audioContainer?.replaceChildren();
    };
  }, [liveMediaSignature, currentView, teacherView, activeLiveCourseId]);
}
