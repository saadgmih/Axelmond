import React from "react";
import {
  CircleDot,
  CircleStop,
  Focus,
  Fullscreen,
  Hand,
  Mic,
  MicOff,
  PictureInPicture2,
  ScreenShare,
  ScreenShareOff,
  Video,
  VideoOff,
} from "lucide-react";
import LiveMediaControl from "./LiveMediaControl";
import LiveReactionBar from "./LiveReactionBar";

export interface LiveControlBarProps {
  controlsRef: React.RefObject<HTMLDivElement | null>;
  isMicEnabled: boolean;
  isCameraEnabled: boolean;
  isScreenShareEnabled: boolean;
  isFullscreen: boolean;
  isRecording: boolean;
  isPiPActive: boolean;
  focusMode: boolean;
  canModerate: boolean;
  localReaction: string | null;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onRaiseHand: () => void;
  onTogglePictureInPicture: () => void;
  onToggleFocusMode: () => void;
  onToggleFullscreen: () => void;
  onRecordToggle: () => void;
  onReaction: (reaction: string) => void;
  onExit: () => void;
}

export default function LiveControlBar({
  controlsRef,
  isMicEnabled,
  isCameraEnabled,
  isScreenShareEnabled,
  isFullscreen,
  isRecording,
  isPiPActive,
  focusMode,
  canModerate,
  localReaction,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onRaiseHand,
  onTogglePictureInPicture,
  onToggleFocusMode,
  onToggleFullscreen,
  onRecordToggle,
  onReaction,
  onExit,
}: LiveControlBarProps) {
  return (
    <div
      ref={controlsRef}
      data-tv-zone="live-controls"
      className="shrink-0 min-h-[80px] w-full max-w-full bg-zinc-900 border-b border-white/5 flex items-stretch z-30 px-2 sm:px-3 box-border py-2 gap-2"
    >
      <div className="flex shrink-0 items-center gap-2 border-r border-white/10 pr-2 sm:pr-3">
        <LiveMediaControl
          label="Micro"
          enabledLabel="Activé"
          disabledLabel="Désactivé"
          enabled={isMicEnabled}
          enabledIcon={Mic}
          disabledIcon={MicOff}
          onClick={onToggleMic}
          ariaLabel={isMicEnabled ? "Couper le micro (M)" : "Activer le micro (M)"}
        />
        <LiveMediaControl
          label="Caméra"
          enabledLabel="Activée"
          disabledLabel="Désactivée"
          enabled={isCameraEnabled}
          enabledIcon={Video}
          disabledIcon={VideoOff}
          onClick={onToggleCamera}
          ariaLabel={isCameraEnabled ? "Couper la caméra (V)" : "Activer la caméra (V)"}
        />
      </div>

      <div className="flex min-w-0 flex-1 items-center overflow-x-auto hide-scrollbar gap-1.5 sm:gap-2">
        <div className="hidden lg:block shrink-0">
          <LiveReactionBar compact activeReaction={localReaction} onReaction={onReaction} />
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            data-tv-focusable
            tabIndex={0}
            onClick={onToggleScreenShare}
            aria-label={isScreenShareEnabled ? "Arrêter le partage d'écran" : "Partager l'écran"}
            aria-pressed={isScreenShareEnabled}
            className={`kbd-nav-focus flex flex-col items-center justify-center min-w-[52px] min-h-[52px] w-[52px] h-[52px] sm:min-w-[60px] sm:min-h-[60px] sm:w-[60px] sm:h-[60px] rounded-xl transition-all ${isScreenShareEnabled ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "hover:bg-zinc-800 text-zinc-300"}`}
          >
            {isScreenShareEnabled ? (
              <ScreenShareOff className="w-5 h-5 mb-1.5" />
            ) : (
              <ScreenShare className="w-5 h-5 mb-1.5" />
            )}
            <span className="text-[10px] font-bold">Partager</span>
          </button>
          <button
            type="button"
            data-tv-focusable
            tabIndex={0}
            onClick={onRaiseHand}
            aria-label="Lever la main (H)"
            className="kbd-nav-focus flex flex-col items-center justify-center min-w-[52px] min-h-[52px] w-[52px] h-[52px] sm:min-w-[60px] sm:min-h-[60px] sm:w-[60px] sm:h-[60px] rounded-xl hover:bg-zinc-800 text-zinc-300 transition-all group"
          >
            <Hand className="w-5 h-5 mb-1.5 group-hover:text-amber-400 transition-colors" />
            <span className="text-[10px] font-bold">Main</span>
          </button>
          <button
            type="button"
            data-tv-focusable
            tabIndex={0}
            onClick={onTogglePictureInPicture}
            aria-label={isPiPActive ? "Quitter Picture-in-Picture (P)" : "Activer Picture-in-Picture (P)"}
            aria-pressed={isPiPActive}
            className={`kbd-nav-focus flex flex-col items-center justify-center min-w-[52px] min-h-[52px] w-[52px] h-[52px] sm:min-w-[60px] sm:min-h-[60px] sm:w-[60px] sm:h-[60px] rounded-xl transition-all ${
              isPiPActive
                ? "bg-indigo-500/10 border border-indigo-400/30 text-indigo-300"
                : "hover:bg-zinc-800 text-zinc-300"
            }`}
          >
            <PictureInPicture2 className="w-5 h-5 mb-1.5" />
            <span className="text-[10px] font-bold">PiP</span>
          </button>
          <button
            type="button"
            data-tv-focusable
            tabIndex={0}
            onClick={onToggleFocusMode}
            aria-label="Mode concentration"
            aria-pressed={focusMode}
            className={`kbd-nav-focus flex flex-col items-center justify-center min-w-[52px] min-h-[52px] w-[52px] h-[52px] sm:min-w-[60px] sm:min-h-[60px] sm:w-[60px] sm:h-[60px] rounded-xl transition-all hidden md:flex ${
              focusMode
                ? "bg-emerald-500/10 border border-emerald-400/30 text-emerald-300"
                : "hover:bg-zinc-800 text-zinc-300"
            }`}
          >
            <Focus className="w-5 h-5 mb-1.5" />
            <span className="text-[10px] font-bold">Focus</span>
          </button>
          <button
            type="button"
            data-tv-focusable
            tabIndex={0}
            onClick={onToggleFullscreen}
            aria-label={isFullscreen ? "Quitter le plein écran (F)" : "Plein écran (F)"}
            className="kbd-nav-focus flex flex-col items-center justify-center min-w-[52px] min-h-[52px] w-[52px] h-[52px] sm:min-w-[60px] sm:min-h-[60px] sm:w-[60px] sm:h-[60px] rounded-xl hover:bg-zinc-800 text-zinc-300 transition-all hidden sm:flex"
          >
            <Fullscreen className="w-5 h-5 mb-1.5" />
            <span className="text-[10px] font-bold">Plein écran</span>
          </button>
        </div>

        {canModerate && (
          <div className="flex items-center gap-2 ml-1 sm:ml-2 pl-1 sm:pl-2 border-l border-white/10 shrink-0">
            <button
              type="button"
              data-tv-focusable
              tabIndex={0}
              onClick={onRecordToggle}
              aria-label={isRecording ? "Arrêter l'enregistrement" : "Démarrer l'enregistrement"}
              aria-pressed={isRecording}
              className={`kbd-nav-focus flex flex-col items-center justify-center min-w-[52px] min-h-[52px] w-[52px] h-[52px] sm:min-w-[60px] sm:min-h-[60px] sm:w-[60px] sm:h-[60px] rounded-xl transition-all ${isRecording ? "bg-red-500/10 border border-red-500/20 text-red-400" : "hover:bg-zinc-800 text-zinc-300"}`}
            >
              {isRecording ? <CircleStop className="w-5 h-5 mb-1.5" /> : <CircleDot className="w-5 h-5 mb-1.5" />}
              <span className="text-[10px] font-bold">Rec</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center border-l border-white/10 pl-2 sm:pl-3">
        <button
          type="button"
          data-tv-focusable
          tabIndex={0}
          onClick={onExit}
          aria-label="Quitter la salle live (L)"
          className="kbd-nav-focus touch-target h-12 min-h-[48px] px-4 sm:px-5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-all shadow-md flex items-center justify-center whitespace-nowrap"
        >
          Quitter
        </button>
      </div>
    </div>
  );
}
