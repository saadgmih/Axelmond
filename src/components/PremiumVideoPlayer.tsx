import React, { useState, useEffect, useRef } from "react";
import { PlayCircle, Pause, Volume2, VolumeX, Maximize } from "lucide-react";

interface PremiumVideoPlayerProps {
  src: string;
  title: string;
  instructor: string;
  activeSector: string;
}

export default function PremiumVideoPlayer({ src, title, instructor, activeSector }: PremiumVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sync state with HTML5 video element events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDurationChange = () => setDuration(video.duration || 0);

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("durationchange", handleDurationChange);
    
    if (video.duration) {
      setDuration(video.duration);
    }

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("durationchange", handleDurationChange);
    };
  }, [src]);

  // Adjust volume/mute status
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Adjust playback rate
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Sync fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const togglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch((err) => console.error("Error playing video:", err));
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    const newPercentage = Number(e.target.value);
    const newTime = (newPercentage / 100) * duration;
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted(!isMuted);
  };

  const cycleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPlaybackRate((prev) => {
      if (prev === 1.0) return 1.5;
      if (prev === 1.5) return 2.0;
      return 1.0;
    });
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch((err) => {
        console.error("Error attempting to enable fullscreen:", err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds) || !isFinite(timeInSeconds)) return "0:00";
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = Math.floor(timeInSeconds % 60);

    const pad = (num: number) => String(num).padStart(2, "0");

    if (hours > 0) {
      return `${hours}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${minutes}:${pad(seconds)}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
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
      {/* Video tag */}
      <video
        ref={videoRef}
        src={src}
        playsInline
        className="w-full h-full object-contain"
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Big Play/Pause Button in Center (when paused or hovered) */}
      <div className={`absolute inset-0 flex flex-col items-center justify-center z-10 bg-slate-950/20 transition-opacity duration-300 ${isPlaying ? "opacity-0 group-hover:opacity-100" : "opacity-100"}`}>
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

      {/* Control Panel Bar */}
      <div
        onClick={(e) => e.stopPropagation()} // Prevent play/pause when clicking controls
        className={`absolute bottom-0 left-0 right-0 bg-slate-950/90 border-t border-slate-800 p-4 flex items-center justify-between gap-4 z-20 text-xs text-white transition-opacity duration-300 ${isPlaying ? "opacity-0 group-hover:opacity-100" : "opacity-100"}`}
      >
        {/* Playback time */}
        <span className="font-mono text-[11px] min-w-[85px] text-center">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        {/* Range Slider for seeking */}
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

        {/* Mute/Unmute */}
        <button
          type="button"
          onClick={toggleMute}
          className="p-1 hover:text-slate-300 transition-colors cursor-pointer"
          title={isMuted ? "Réactiver le son" : "Couper le son"}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {/* Speed button */}
        <button
          type="button"
          onClick={cycleSpeed}
          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded font-bold font-mono text-[10px] cursor-pointer transition-colors"
          title="Modifier la vitesse de lecture"
        >
          Vitesse: {playbackRate.toFixed(1)}x
        </button>

        {/* Fullscreen button */}
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
