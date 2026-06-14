import React from "react";
import { PlayCircle, Volume2, VolumeX, Maximize } from "lucide-react";
import { useCourseVideoPlayer } from "../hooks/useCourseVideoPlayer";

interface PremiumVideoPlayerProps {
  src: string;
  title: string;
  instructor: string;
  activeSector: string;
}

export default function PremiumVideoPlayer({ src, title, instructor, activeSector }: PremiumVideoPlayerProps) {
  void title;

  const {
    videoRef,
    containerRef,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    isMuted,
    progressPercent,
    togglePlay,
    handleSeek,
    toggleMute,
    cycleSpeed,
    toggleFullscreen,
    formatTime,
  } = useCourseVideoPlayer(src);

  const isStudent = activeSector === "student";
  const themeAccentClass = isStudent ? "accent-indigo-500" : "accent-pink-500";
  const playButtonThemeClass = isStudent ? "text-indigo-600 fill-indigo-600" : "text-pink-600 fill-pink-600";
  const pauseButtonThemeClass = isStudent
    ? "bg-indigo-600 border-indigo-400 text-white hover:bg-indigo-700 hover:border-indigo-500"
    : "bg-pink-600 border-pink-400 text-white hover:bg-pink-700 hover:border-pink-500";

  return (
    <div
      ref={containerRef}
      onClick={() => togglePlay()}
      className="group relative w-full aspect-video bg-slate-950 rounded-2xl overflow-hidden shadow-md border border-slate-800 flex flex-col items-center justify-center cursor-pointer select-none"
    >
      <video
        ref={videoRef}
        src={src}
        playsInline
        className="w-full h-full object-contain"
        onContextMenu={(e) => e.preventDefault()}
      />

      <div
        className={`absolute inset-0 flex flex-col items-center justify-center z-10 bg-slate-950/20 transition-opacity duration-300 ${isPlaying ? "opacity-0 group-hover:opacity-100" : "opacity-100"}`}
      >
        {!isPlaying ? (
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={togglePlay}
              className="w-20 h-20 bg-white/95 text-indigo-900 rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:bg-slate-100 hover:scale-105 transition-all"
            >
              <PlayCircle className={`w-10 h-10 ml-0.5 ${playButtonThemeClass}`} />
            </button>
            <p className="text-white text-xs font-bold font-mono tracking-wide bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-700/50 shadow-sm animate-in fade-in duration-200">
              {instructor} • {formatTime(duration)}
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={togglePlay}
            className={`w-20 h-20 rounded-full flex items-center justify-center animate-pulse cursor-pointer border-4 shadow-lg ${pauseButtonThemeClass}`}
          >
            <span className="text-sm font-bold tracking-tight">Pause</span>
          </button>
        )}
      </div>

      <div
        onClick={(e) => e.stopPropagation()}
        className={`absolute bottom-0 left-0 right-0 bg-slate-950/90 border-t border-slate-800 p-4 flex items-center justify-between gap-4 z-20 text-xs text-white transition-opacity duration-300 ${isPlaying ? "opacity-0 group-hover:opacity-100" : "opacity-100"}`}
      >
        <span className="font-mono text-[11px] min-w-[85px] text-center">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        <div className="flex-1 flex items-center">
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

        <button
          type="button"
          onClick={toggleMute}
          className="p-1 hover:text-slate-300 transition-colors cursor-pointer"
          title={isMuted ? "Réactiver le son" : "Couper le son"}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={cycleSpeed}
          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded font-bold font-mono text-[10px] cursor-pointer transition-colors"
          title="Modifier la vitesse de lecture"
        >
          Vitesse: {playbackRate.toFixed(1)}x
        </button>

        <button
          type="button"
          onClick={toggleFullscreen}
          className="p-1 hover:text-slate-300 transition-colors cursor-pointer"
          title="Plein écran"
        >
          <Maximize className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
