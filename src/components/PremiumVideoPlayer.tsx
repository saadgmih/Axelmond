import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize, PauseCircle, PlayCircle, Volume2, VolumeX } from "lucide-react";
import { COURSE_VIDEO_PLAYBACK_RATES, useCourseVideoPlayer } from "../hooks/useCourseVideoPlayer";

interface PremiumVideoPlayerProps {
  src: string;
  title: string;
  instructor: string;
  activeSector: string;
  showMetadata?: boolean;
}

export default function PremiumVideoPlayer({
  src,
  title,
  instructor,
  activeSector,
  showMetadata = true,
}: PremiumVideoPlayerProps) {
  const {
    videoRef,
    containerRef,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    volume,
    isMuted,
    progressPercent,
    togglePlay,
    handleSeek,
    toggleMute,
    handleVolumeChange,
    handlePlaybackRateChange,
    toggleFullscreen,
    formatTime,
  } = useCourseVideoPlayer(src);

  const isStudent = activeSector === "student";
  const themeAccentClass = isStudent ? "accent-indigo-500" : "accent-pink-500";
  const playButtonThemeClass = isStudent ? "text-indigo-600 fill-indigo-600" : "text-pink-600 fill-pink-600";
  const controlFocusClass = isStudent ? "focus:ring-indigo-400" : "focus:ring-pink-400";
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideControlsTimeoutRef = useRef<number | null>(null);

  const clearHideControlsTimeout = useCallback(() => {
    if (hideControlsTimeoutRef.current) {
      window.clearTimeout(hideControlsTimeoutRef.current);
      hideControlsTimeoutRef.current = null;
    }
  }, []);

  const revealControlsTemporarily = useCallback(() => {
    setControlsVisible(true);
    clearHideControlsTimeout();

    if (isPlaying && showMetadata) {
      hideControlsTimeoutRef.current = window.setTimeout(() => {
        setControlsVisible(false);
      }, 1600);
    }
  }, [clearHideControlsTimeout, isPlaying, showMetadata]);

  useEffect(() => {
    if (!isPlaying) {
      clearHideControlsTimeout();
      setControlsVisible(true);
      return;
    }

    revealControlsTemporarily();
    return clearHideControlsTimeout;
  }, [clearHideControlsTimeout, isPlaying, revealControlsTemporarily]);

  const handleSurfaceClick = () => {
    revealControlsTemporarily();
    togglePlay();
  };

  const chromeVisible = !isPlaying || controlsVisible || !showMetadata;
  const volumePercent = Math.round(volume * 100);
  const overlayButtonClass = showMetadata ? "w-20 h-20" : "w-14 h-14";
  const overlayIconClass = showMetadata ? "w-10 h-10" : "w-7 h-7";

  return (
    <div
      ref={containerRef}
      onClick={handleSurfaceClick}
      onMouseEnter={() => revealControlsTemporarily()}
      onMouseMove={() => revealControlsTemporarily()}
      onTouchStart={() => revealControlsTemporarily()}
      className="group relative w-full aspect-video bg-slate-950 rounded-2xl overflow-hidden shadow-md border border-slate-800 flex flex-col items-center justify-center cursor-pointer select-none"
    >
      <video
        ref={videoRef}
        src={src}
        playsInline
        controlsList="nodownload"
        className="w-full h-full object-contain"
        onContextMenu={(e) => e.preventDefault()}
      />

      <div
        className={`absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/20 transition-opacity duration-300 ${chromeVisible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      >
        {!isPlaying ? (
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={togglePlay}
              className={`${overlayButtonClass} bg-white/95 text-indigo-900 rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:bg-slate-100 hover:scale-105 transition-all`}
            >
              <PlayCircle className={`${overlayIconClass} ml-0.5 ${playButtonThemeClass}`} />
            </button>
            {showMetadata && (
              <p className="max-w-[90%] truncate text-white text-xs font-bold font-mono tracking-wide bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-700/50 shadow-sm animate-in fade-in duration-200">
                {title} • {instructor} • {formatTime(duration)}
              </p>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={togglePlay}
            className={`${overlayButtonClass} rounded-full bg-white/95 text-slate-950 flex items-center justify-center cursor-pointer shadow-lg hover:bg-slate-100 hover:scale-105 transition-all`}
            title="Mettre en pause"
          >
            <PauseCircle className={overlayIconClass} />
          </button>
        )}
      </div>

      <div
        onClick={(e) => e.stopPropagation()}
        onMouseMove={() => revealControlsTemporarily()}
        onTouchStart={() => revealControlsTemporarily()}
        className={`absolute bottom-0 left-0 right-0 z-20 flex flex-wrap items-center gap-3 border-t border-slate-800 bg-slate-950/90 p-3 text-xs text-white transition-all duration-300 sm:flex-nowrap sm:p-4 ${chromeVisible ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-2 pointer-events-none"}`}
      >
        <span className="w-[92px] text-center font-mono text-[11px]">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        <div className="flex min-w-[140px] flex-1 items-center">
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={progressPercent}
            onChange={handleSeek}
            className={`w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer outline-none ${themeAccentClass}`}
          />
        </div>

        <div className="group/volume relative flex items-center">
          <button
            type="button"
            onClick={toggleMute}
            className={`p-1.5 hover:text-slate-300 transition-colors cursor-pointer rounded-lg focus:outline-none focus:ring-2 ${controlFocusClass}`}
            title={isMuted || volumePercent === 0 ? "Réactiver le son" : "Couper le son"}
          >
            {isMuted || volumePercent === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <div
            onMouseMove={() => revealControlsTemporarily()}
            onTouchStart={() => revealControlsTemporarily()}
            className={`absolute bottom-[calc(100%+0.5rem)] left-1/2 z-30 flex -translate-x-1/2 flex-col items-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-950/95 px-2.5 py-2 shadow-lg transition-all duration-200 ${
              chromeVisible
                ? "pointer-events-none opacity-0 group-hover/volume:pointer-events-auto group-hover/volume:opacity-100 group-focus-within/volume:pointer-events-auto group-focus-within/volume:opacity-100"
                : "pointer-events-none opacity-0"
            }`}
          >
            <span className="font-mono text-[10px] text-slate-400">{volumePercent}%</span>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={volumePercent}
              onChange={handleVolumeChange}
              aria-label="Volume vidéo"
              className={`video-volume-slider-vertical ${themeAccentClass}`}
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-300">
          <span>Vitesse</span>
          <select
            value={playbackRate}
            onChange={handlePlaybackRateChange}
            className={`h-8 rounded-lg border border-slate-700 bg-slate-900 px-2 font-mono text-[11px] text-white outline-none cursor-pointer focus:ring-2 ${controlFocusClass}`}
            title="Modifier la vitesse de lecture"
          >
            {COURSE_VIDEO_PLAYBACK_RATES.map((rate) => (
              <option key={rate} value={rate}>
                {rate}x
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={toggleFullscreen}
          className={`p-1.5 hover:text-slate-300 transition-colors cursor-pointer rounded-lg focus:outline-none focus:ring-2 ${controlFocusClass}`}
          title="Plein écran"
        >
          <Maximize className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
