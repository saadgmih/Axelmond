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
  SwitchCamera,
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
  canSwitchCamera: boolean;
  onSwitchCamera: () => void;
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
  canSwitchCamera,
  onSwitchCamera,
  onToggleScreenShare,
  onRaiseHand,
  onTogglePictureInPicture,
  onToggleFocusMode,
  onToggleFullscreen,
  onRecordToggle,
  onReaction,
  onExit,
}: LiveControlBarProps) {
  const [recSeconds, setRecSeconds] = React.useState(0);

  React.useEffect(() => {
    if (!isRecording) {
      setRecSeconds(0);
      return;
    }
    const timer = setInterval(() => {
      setRecSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isRecording]);

  const formatRecTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      ref={controlsRef}
      data-tv-zone="live-controls"
      className="z-30 box-border flex min-h-[72px] w-full max-w-full shrink-0 flex-wrap items-stretch justify-between gap-1 border-b border-white/5 bg-zinc-900 px-1 py-2 sm:flex-nowrap sm:justify-normal sm:gap-2 sm:px-2 xl:min-h-[80px] xl:px-3"
    >
      <div className="order-1 flex shrink-0 items-center gap-1 border-r border-white/10 pr-1 sm:order-none sm:gap-2 sm:pr-2 xl:pr-3">
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
        {canSwitchCamera && (
          <button
            type="button"
            data-tv-focusable
            tabIndex={0}
            onClick={onSwitchCamera}
            aria-label="Changer de caméra avant ou arrière"
            title="Changer de caméra"
            className="kbd-nav-focus flex h-12 min-h-12 w-12 min-w-12 flex-col items-center justify-center rounded-xl text-emerald-200 transition-all hover:bg-emerald-500/10 xl:h-[60px] xl:min-h-[60px] xl:w-[60px] xl:min-w-[60px]"
          >
            <SwitchCamera className="mb-1 h-5 w-5 xl:mb-1.5" />
            <span className="whitespace-nowrap text-[9px] font-bold xl:text-[10px]">Inverser</span>
          </button>
        )}
      </div>

      <div
        className="hide-scrollbar order-3 flex min-w-0 basis-full items-center justify-start gap-1 overflow-x-auto overscroll-x-contain border-t border-white/5 pt-1 sm:order-none sm:basis-auto sm:justify-start sm:gap-1.5 sm:border-t-0 sm:pt-0 md:justify-center xl:gap-2"
        aria-label="Commandes supplémentaires du live"
      >
        <div className="shrink-0">
          <LiveReactionBar compact activeReaction={localReaction} onReaction={onReaction} />
        </div>

        <div className="flex shrink-0 items-center gap-1 xl:gap-2">
          <button
            type="button"
            data-tv-focusable
            tabIndex={0}
            onClick={onToggleScreenShare}
            aria-label={isScreenShareEnabled ? "Arrêter le partage d'écran" : "Partager l'écran"}
            aria-pressed={isScreenShareEnabled}
            className={`kbd-nav-focus flex h-12 min-h-12 w-12 min-w-12 flex-col items-center justify-center rounded-xl transition-all xl:h-[60px] xl:min-h-[60px] xl:w-[60px] xl:min-w-[60px] ${isScreenShareEnabled ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "text-zinc-300 hover:bg-zinc-800"}`}
          >
            {isScreenShareEnabled ? (
              <ScreenShareOff className="mb-1 h-5 w-5 xl:mb-1.5" />
            ) : (
              <ScreenShare className="mb-1 h-5 w-5 xl:mb-1.5" />
            )}
            <span className="whitespace-nowrap text-[9px] font-bold xl:text-[10px]">Partager</span>
          </button>
          <button
            type="button"
            data-tv-focusable
            tabIndex={0}
            onClick={onRaiseHand}
            aria-label="Lever la main (H)"
            className="kbd-nav-focus group flex h-12 min-h-12 w-12 min-w-12 flex-col items-center justify-center rounded-xl text-zinc-300 transition-all hover:bg-zinc-800 xl:h-[60px] xl:min-h-[60px] xl:w-[60px] xl:min-w-[60px]"
          >
            <Hand className="mb-1 h-5 w-5 transition-colors group-hover:text-lime-400 xl:mb-1.5" />
            <span className="whitespace-nowrap text-[9px] font-bold xl:text-[10px]">Main</span>
          </button>
          <button
            type="button"
            data-tv-focusable
            tabIndex={0}
            onClick={onTogglePictureInPicture}
            aria-label={isPiPActive ? "Quitter Picture-in-Picture (P)" : "Activer Picture-in-Picture (P)"}
            aria-pressed={isPiPActive}
            className={`kbd-nav-focus flex h-12 min-h-12 w-12 min-w-12 flex-col items-center justify-center rounded-xl transition-all xl:h-[60px] xl:min-h-[60px] xl:w-[60px] xl:min-w-[60px] ${
              isPiPActive
                ? "bg-emerald-500/10 border border-emerald-400/30 text-emerald-300"
                : "hover:bg-zinc-800 text-zinc-300"
            }`}
          >
            <PictureInPicture2 className="mb-1 h-5 w-5 xl:mb-1.5" />
            <span className="whitespace-nowrap text-[9px] font-bold xl:text-[10px]">PiP</span>
          </button>
          <button
            type="button"
            data-tv-focusable
            tabIndex={0}
            onClick={onToggleFocusMode}
            aria-label="Mode concentration"
            aria-pressed={focusMode}
            className={`kbd-nav-focus flex h-12 min-h-12 w-12 min-w-12 flex-col items-center justify-center rounded-xl transition-all xl:h-[60px] xl:min-h-[60px] xl:w-[60px] xl:min-w-[60px] ${
              focusMode
                ? "bg-emerald-500/10 border border-emerald-400/30 text-emerald-300"
                : "hover:bg-zinc-800 text-zinc-300"
            }`}
          >
            <Focus className="mb-1 h-5 w-5 xl:mb-1.5" />
            <span className="whitespace-nowrap text-[9px] font-bold xl:text-[10px]">Focus</span>
          </button>
          <button
            type="button"
            data-tv-focusable
            tabIndex={0}
            onClick={onToggleFullscreen}
            aria-label={isFullscreen ? "Quitter le plein écran (F)" : "Plein écran (F)"}
            className="kbd-nav-focus flex h-12 min-h-12 w-12 min-w-12 flex-col items-center justify-center rounded-xl text-zinc-300 transition-all hover:bg-zinc-800 xl:h-[60px] xl:min-h-[60px] xl:w-[60px] xl:min-w-[60px]"
          >
            <Fullscreen className="mb-1 h-5 w-5 xl:mb-1.5" />
            <span className="whitespace-nowrap text-[9px] font-bold xl:text-[10px]">Plein écran</span>
          </button>
        </div>

        {canModerate && (
          <div className="ml-1 flex shrink-0 items-center gap-1 border-l border-white/10 pl-1 xl:ml-2 xl:gap-2 xl:pl-2">
            <button
              type="button"
              data-tv-focusable
              tabIndex={0}
              onClick={onRecordToggle}
              aria-label={isRecording ? "Arrêter l'enregistrement" : "Démarrer l'enregistrement"}
              aria-pressed={isRecording}
              className={`kbd-nav-focus flex h-12 min-h-12 flex-col items-center justify-center rounded-xl transition-all xl:h-[60px] xl:min-h-[60px] ${
                isRecording
                  ? "px-3 bg-red-600 border border-red-500 text-white font-bold animate-pulse"
                  : "w-12 min-w-12 text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {isRecording ? (
                <CircleStop className="mb-1 h-5 w-5 xl:mb-1.5" />
              ) : (
                <CircleDot className="mb-1 h-5 w-5 xl:mb-1.5" />
              )}
              <span className="whitespace-nowrap text-[9px] font-bold xl:text-[10px]">
                {isRecording ? `Rec en cours (${formatRecTime(recSeconds)})` : "Rec"}
              </span>
            </button>
          </div>
        )}
      </div>

      <div className="order-2 flex shrink-0 items-center border-l border-white/10 pl-1 sm:order-none sm:pl-2 xl:pl-3">
        <button
          type="button"
          data-tv-focusable
          tabIndex={0}
          onClick={onExit}
          aria-label="Quitter la salle live (L)"
          className="kbd-nav-focus touch-target flex h-12 min-h-12 items-center justify-center whitespace-nowrap rounded-xl bg-red-600 px-3 text-xs font-bold text-white shadow-md transition-all hover:bg-red-500 sm:px-4 sm:text-sm xl:px-5"
        >
          Quitter
        </button>
      </div>
    </div>
  );
}
