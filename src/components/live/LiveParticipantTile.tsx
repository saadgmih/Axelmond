import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Hand, Mic, MicOff, Wifi } from "lucide-react";
import type { LiveParticipantCard } from "../VirtualClassroom";
import LiveParticipantAvatar from "./LiveParticipantAvatar";

function liveRoleLabel(role?: string) {
  if (role === "ADMIN") return "Administrateur";
  if (role === "RESEARCHER") return "Chercheur";
  if (role === "PROFESSOR") return "Professeur";
  return "Étudiant";
}

interface LiveParticipantTileProps {
  participant: LiveParticipantCard;
  isActive: boolean;
  isFeatured: boolean;
  isSolo?: boolean;
  registerVideoRef: (identity: string, element: HTMLVideoElement | null) => void;
}

function LiveParticipantTile({
  participant,
  isActive,
  isFeatured,
  isSolo = false,
  registerVideoRef,
}: LiveParticipantTileProps) {
  const hasVideo = Boolean(participant.videoTrack);
  const avatarSize = isSolo || isFeatured ? "xl" : "lg";
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const setVideoRef = useCallback(
    (element: HTMLVideoElement | null) => {
      videoRef.current = element;
      registerVideoRef(participant.identity, element);
    },
    [participant.identity, registerVideoRef],
  );

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === videoRef.current);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const handleDoubleClick = useCallback(() => {
    if (!hasVideo) return;
    const element = videoRef.current;
    if (!element) return;

    if (document.fullscreenElement === element) {
      document.exitFullscreen().catch((err) => {
        console.error("Error exiting fullscreen:", err);
      });
    } else {
      element.requestFullscreen().catch((err) => {
        console.error("Error entering fullscreen:", err);
      });
    }
  }, [hasVideo]);

  return (
    <div
      onDoubleClick={handleDoubleClick}
      className={`relative rounded-2xl overflow-hidden border shadow-xl transition-all ${
        isSolo
          ? "h-full min-h-[240px]"
          : isFeatured
            ? "min-h-[220px] sm:min-h-[280px]"
            : "min-h-[140px] sm:min-h-[180px]"
      } ${isActive ? "border-indigo-400 ring-2 ring-indigo-500/40" : "border-white/10 bg-zinc-900/80"} ${
        hasVideo ? "cursor-pointer" : ""
      }`}
    >
      {hasVideo ? (
        <video
          ref={setVideoRef}
          autoPlay
          playsInline
          muted={participant.isLocal}
          className="absolute inset-0 h-full w-full object-cover bg-black"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-950 via-[#0b1020] to-indigo-950/40">
          <LiveParticipantAvatar
            name={participant.name}
            initials={participant.initials}
            avatarUrl={participant.avatarUrl}
            size={avatarSize}
            isSpeaking={participant.isSpeaking}
            isFeatured={isFeatured || isSolo}
          />
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent px-3 pb-3 pt-10">
        <div className="flex items-end justify-between gap-2 min-w-0">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-black text-white sm:text-sm">{participant.name}</p>
            <p className="truncate text-[10px] text-zinc-300 sm:text-[11px]">{liveRoleLabel(participant.role)}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1 pb-0.5">
            {participant.hasAudio ? (
              <Mic className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <MicOff className="h-3.5 w-3.5 text-red-400" />
            )}
            {participant.handRaised && <Hand className="h-3.5 w-3.5 text-amber-400" />}
            {isActive && <Wifi className="h-3.5 w-3.5 text-indigo-300" />}
          </div>
        </div>
      </div>

      {participant.reaction && (
        <div className="absolute right-3 top-3 rounded-xl border border-white/10 bg-black/60 px-2.5 py-1 text-lg backdrop-blur-md">
          {participant.reaction}
        </div>
      )}
    </div>
  );
}

export default memo(LiveParticipantTile);
