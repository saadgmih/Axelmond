import { useEffect, useMemo, type RefObject } from "react";
import type { LiveParticipantCard } from "../../components/VirtualClassroom";

export interface UseLiveMediaAttachOptions {
  liveParticipants: LiveParticipantCard[];
  activeSpeakerIdentity: string;
  currentView: string;
  teacherView: string;
  activeLiveCourseId: number | undefined;
  primaryLiveVideoRef: RefObject<HTMLVideoElement | null>;
  liveVideoRefs: RefObject<Record<string, HTMLVideoElement | null>>;
  liveAudioContainerRef: RefObject<HTMLDivElement | null>;
}

export function useLiveMediaAttach({
  liveParticipants,
  activeSpeakerIdentity,
  currentView,
  teacherView,
  activeLiveCourseId,
  primaryLiveVideoRef,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveMediaSignature, currentView, teacherView, activeLiveCourseId]);

  useEffect(() => {
    const primaryTrack =
      liveParticipants.find((participant) => participant.identity === activeSpeakerIdentity && participant.videoTrack)
        ?.videoTrack ||
      liveParticipants.find((participant) => !participant.isLocal && participant.videoTrack)?.videoTrack ||
      liveParticipants.find((participant) => participant.videoTrack)?.videoTrack;

    if (primaryLiveVideoRef.current && primaryTrack) {
      primaryTrack.attach(primaryLiveVideoRef.current);
    }

    return () => {
      primaryTrack?.detach(primaryLiveVideoRef.current || undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveMediaSignature, activeSpeakerIdentity]);
}
