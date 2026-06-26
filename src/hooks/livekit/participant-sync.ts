import { Track } from "livekit-client";
import type { LiveParticipantCard } from "../../components/VirtualClassroom";

export function getParticipantVideoPublication(participant: any) {
  const publications = Array.from(participant.videoTrackPublications.values()) as any[];
  const screenShare = publications.find((pub) => pub.source === Track.Source.ScreenShare && pub.videoTrack);
  return screenShare || publications.find((pub) => pub.videoTrack);
}

export function getParticipantAudioPublication(participant: any) {
  const publications = Array.from(participant.audioTrackPublications.values()) as any[];
  return publications.find((pub) => pub.audioTrack);
}

export function getParticipantRole(participant: any, fallbackRole?: string) {
  return (
    participant?.attributes?.role ||
    (() => {
      try {
        return JSON.parse(participant?.metadata || "{}")?.role;
      } catch {
        return null;
      }
    })() ||
    fallbackRole ||
    "STUDENT"
  );
}

export function buildLiveParticipantCards(
  room: { localParticipant: any; remoteParticipants: Map<string, any> },
  context: {
    currentUser?: { fullName?: string; role?: string; avatarUrl?: string | null; id?: string } | null;
    activeSpeakerIdentity: string;
    liveSignals: Record<string, { handRaised?: boolean; reaction?: string; updatedAt: number }>;
    getInitials: (name: string) => string;
  },
): LiveParticipantCard[] {
  const nextParticipants: LiveParticipantCard[] = [];
  const localName = room.localParticipant.name || context.currentUser?.fullName || "Vous";
  const localVideoPublication = getParticipantVideoPublication(room.localParticipant);
  const localAudioPublication = getParticipantAudioPublication(room.localParticipant);
  const localSignal = context.liveSignals[room.localParticipant.identity];
  nextParticipants.push({
    identity: room.localParticipant.identity,
    name: "Vous",
    initials: context.getInitials(localName),
    role: context.currentUser?.role || "STUDENT",
    avatarUrl: context.currentUser?.avatarUrl || null,
    isLocal: true,
    isSpeaking: context.activeSpeakerIdentity === room.localParticipant.identity,
    handRaised: localSignal?.handRaised,
    reaction: localSignal?.reaction,
    connectionQuality: String((room.localParticipant as any).connectionQuality || "stable"),
    hasAudio: Boolean(localAudioPublication && !localAudioPublication.isMuted),
    hasVideo: Boolean(localVideoPublication && !localVideoPublication.isMuted),
    audioTrackSid: localAudioPublication?.trackSid || null,
    videoTrackSid: localVideoPublication?.trackSid || null,
    videoTrack: localVideoPublication?.videoTrack,
    audioTrack: localAudioPublication?.audioTrack,
    isScreenShare: Boolean(localVideoPublication && localVideoPublication.source === Track.Source.ScreenShare),
  });

  room.remoteParticipants.forEach((participant) => {
    const displayName = participant.name || participant.identity.replace(/^axelmond-user-/, "");
    const videoPublication = getParticipantVideoPublication(participant);
    const audioPublication = getParticipantAudioPublication(participant);
    const signal = context.liveSignals[participant.identity];
    let avatarUrl: string | null = null;
    try {
      avatarUrl = JSON.parse(participant.metadata || "{}")?.avatarUrl || null;
    } catch {
      avatarUrl = null;
    }
    nextParticipants.push({
      identity: participant.identity,
      name: displayName,
      initials: context.getInitials(displayName),
      role: getParticipantRole(participant),
      avatarUrl,
      isLocal: false,
      isSpeaking: context.activeSpeakerIdentity === participant.identity,
      handRaised: signal?.handRaised,
      reaction: signal?.reaction,
      connectionQuality: String((participant as any).connectionQuality || "stable"),
      joinedAtLabel: "Présence en temps réel",
      hasAudio: Boolean(audioPublication && !audioPublication.isMuted),
      hasVideo: Boolean(videoPublication && !videoPublication.isMuted),
      audioTrackSid: audioPublication?.trackSid || null,
      videoTrackSid: videoPublication?.trackSid || null,
      videoTrack: videoPublication?.videoTrack,
      audioTrack: audioPublication?.audioTrack,
      isScreenShare: Boolean(videoPublication && videoPublication.source === Track.Source.ScreenShare),
    });
  });

  return nextParticipants;
}
