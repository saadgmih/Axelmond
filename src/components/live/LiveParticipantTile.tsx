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
  const tileRef = useRef<HTMLDivElement | null>(null);
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
      const activeFullscreenElement =
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement;
      setIsFullscreen(activeFullscreenElement === tileRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
  }, []);

  const handleDoubleClick = useCallback(() => {
    if (!hasVideo) return;
    const element = tileRef.current;
    if (!element) return;

    const activeFullscreenElement =
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement;

    if (activeFullscreenElement === element) {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((err) => console.error("Error exiting fullscreen:", err));
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
    } else {
      if (element.requestFullscreen) {
        element.requestFullscreen().catch((err) => console.error("Error entering fullscreen:", err));
      } else if ((element as any).webkitRequestFullscreen) {
        (element as any).webkitRequestFullscreen();
      } else if ((element as any).mozRequestFullScreen) {
        (element as any).mozRequestFullScreen();
      } else if ((element as any).msRequestFullscreen) {
        (element as any).msRequestFullscreen();
      }
    }
  }, [hasVideo]);

  return (
    <div
      ref={tileRef}
      onDoubleClick={handleDoubleClick}
      className={`live-participant-tile-fullscreen relative rounded-2xl overflow-hidden border shadow-xl transition-all ${
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

      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent pt-10 transition-all ${
          isFullscreen ? "px-6 pb-6" : "px-3 pb-3"
        }`}
      >
        <div className="flex items-end justify-between gap-2 min-w-0">
          <div className="min-w-0 flex-1">
            <p className={`truncate font-black text-white ${isFullscreen ? "text-base sm:text-lg" : "text-xs sm:text-sm"}`}>
              {participant.name}
            </p>
            <p className={`truncate text-zinc-300 ${isFullscreen ? "text-xs sm:text-sm" : "text-[10px] sm:text-[11px]"}`}>
              {liveRoleLabel(participant.role)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 pb-0.5">
            {participant.hasAudio ? (
              <Mic className={`${isFullscreen ? "h-5 w-5" : "h-3.5 w-3.5"} text-emerald-400`} />
            ) : (
              <MicOff className={`${isFullscreen ? "h-5 w-5" : "h-3.5 w-3.5"} text-red-400`} />
            )}
            {participant.handRaised && (
              <Hand className={`${isFullscreen ? "h-5 w-5" : "h-3.5 w-3.5"} text-amber-400`} />
            )}
            {isActive && <Wifi className={`${isFullscreen ? "h-5 w-5" : "h-3.5 w-3.5"} text-indigo-300`} />}
          </div>
        </div>
      </div>

      {participant.reaction && (
        <div className={`absolute right-3 top-3 rounded-xl border border-white/10 bg-black/60 px-2.5 py-1 backdrop-blur-md transition-all ${isFullscreen ? "text-2xl px-4 py-2" : "text-lg"}`}>
          {participant.reaction}
        </div>
      )}
    </div>
  );
}

export default memo(LiveParticipantTile);
