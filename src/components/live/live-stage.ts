import { isTeacherLikeRole, type LiveLayoutMode } from "../../live/liveSettings";
import type { LiveParticipantCard } from "../VirtualClassroom";

export function resolveStageParticipants(
  participants: LiveParticipantCard[],
  layoutMode: LiveLayoutMode,
  activeSpeaker: LiveParticipantCard | undefined,
  classroomMode: "student" | "teacher",
): LiveParticipantCard[] {
  const connected = participants.filter((participant) => participant.identity !== "connecting");
  if (connected.length === 0) return participants;

  const withVideo = connected.filter((participant) => participant.videoTrack);

  if (layoutMode === "tile" || withVideo.length === 0) {
    return connected;
  }

  if (layoutMode === "active-speaker") {
    const featured =
      (activeSpeaker?.videoTrack ? activeSpeaker : undefined) ||
      withVideo.find((participant) => participant.isSpeaking) ||
      withVideo.find((participant) => !participant.isLocal) ||
      withVideo[0];
    if (!featured) return connected;
    const others = connected.filter((participant) => participant.identity !== featured.identity);
    return [featured, ...others];
  }

  const teachers = withVideo.filter((participant) => isTeacherLikeRole(participant.role));
  if (teachers.length > 0) {
    if (classroomMode === "teacher") {
      const localTeacher = teachers.find((participant) => participant.isLocal);
      const featured = localTeacher || teachers[0]!;
      return [featured, ...connected.filter((participant) => participant.identity !== featured.identity)];
    }
    const remoteTeacher = teachers.find((participant) => !participant.isLocal);
    const featured = remoteTeacher || teachers[0]!;
    return [featured, ...connected.filter((participant) => participant.identity !== featured.identity)];
  }

  const featured = withVideo[0]!;
  return [featured, ...connected.filter((participant) => participant.identity !== featured.identity)];
}

export function stageGridClass(count: number, featuredLayout: boolean) {
  if (count <= 1) return "grid-cols-1";
  if (count === 2)
    return featuredLayout ? "grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]" : "grid-cols-1 sm:grid-cols-2";
  if (count <= 4) return "grid-cols-2";
  if (count <= 6) return "grid-cols-2 md:grid-cols-3";
  return "grid-cols-2 md:grid-cols-3 xl:grid-cols-4";
}
