import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface MessageAudioPlayerProps {
  url: string;
  mine?: boolean;
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60);
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

export function MessageAudioPlayer({ url, mine = false }: MessageAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackError, setPlaybackError] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setPlaybackError(false);
    audio.load();

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime || 0);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleDurationChange = () => setDuration(audio.duration);
    const handleError = () => {
      setIsPlaying(false);
      setPlaybackError(true);
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("durationchange", handleDurationChange);
    audio.addEventListener("error", handleError);

    return () => {
      audio.pause();
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("durationchange", handleDurationChange);
      audio.removeEventListener("error", handleError);
    };
  }, [url]);

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audio.paused) {
      audio.pause();
      return;
    }

    if (audio.readyState < HTMLMediaElement.HAVE_METADATA) {
      audio.load();
    }

    void audio.play().catch(() => {
      setIsPlaying(false);
      setPlaybackError(true);
    });
  };

  const seekTo = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(seconds)) return;
    audio.currentTime = Math.max(0, Math.min(seconds, duration || 0));
    setCurrentTime(audio.currentTime);
  };

  return (
    <div
      className={`flex min-w-[210px] items-center gap-3 rounded-2xl border px-3 py-3 ${
        mine ? "border-emerald-300/20 bg-emerald-950/25" : "border-white/10 bg-black/20"
      }`}
    >
      <audio
        key={url}
        ref={audioRef}
        src={url}
        preload="auto"
        playsInline
        className="absolute h-px w-px overflow-hidden opacity-0"
        aria-hidden="true"
      />
      <button
        type="button"
        onClick={togglePlayback}
        aria-label={isPlaying ? "Mettre le message vocal en pause" : "Lire le message vocal"}
        aria-pressed={isPlaying}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border shadow-lg transition-all hover:scale-105 ${
          mine
            ? "border-white/30 bg-white/15 text-white hover:bg-white/25"
            : "border-emerald-400/30 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25"
        }`}
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 pl-0.5" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-xs font-bold">Message vocal</p>
          <p className={`shrink-0 text-[10px] ${mine ? "text-emerald-100/70" : "text-slate-400"}`}>
            {playbackError ? "Lecture impossible" : `${formatDuration(currentTime)} / ${formatDuration(duration)}`}
          </p>
        </div>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={Math.min(currentTime, duration || 0)}
          onChange={(event) => seekTo(Number(event.target.value))}
          disabled={!duration || playbackError}
          aria-label="Position du message vocal"
          className="mt-2 h-1.5 w-full cursor-pointer accent-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
        />
      </div>
    </div>
  );
}
