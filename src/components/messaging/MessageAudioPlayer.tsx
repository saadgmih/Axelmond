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
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    setIsPlaying(false);
    setProgress(0);
    setDuration(0);
  }, [url]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };
    const handleTimeUpdate = () => {
      if (!audio.duration) return;
      setProgress((audio.currentTime / audio.duration) * 100);
    };
    const handleLoadedMetadata = () => setDuration(audio.duration);

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [url]);

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      audio.currentTime = 0;
      setProgress(0);
      return;
    }

    void audio.play().catch(() => {
      setIsPlaying(false);
    });
  };

  return (
    <div
      className={`mt-2 flex min-w-[180px] items-center gap-3 rounded-xl border px-3 py-2.5 ${
        mine ? "border-white/20 bg-white/10" : "border-white/10 bg-black/20"
      }`}
    >
      <audio ref={audioRef} src={url} preload="metadata" className="hidden" aria-hidden="true" />
      <button
        type="button"
        onClick={togglePlayback}
        aria-label={isPlaying ? "Arrêter le message vocal" : "Lire le message vocal"}
        aria-pressed={isPlaying}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors ${
          mine
            ? "border-white/30 bg-white/15 text-white hover:bg-white/25"
            : "border-emerald-400/30 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25"
        }`}
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 pl-0.5" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold">Message vocal</p>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full transition-[width] duration-150 ${mine ? "bg-white/75" : "bg-emerald-400"}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className={`mt-1 text-[10px] ${mine ? "text-emerald-100/70" : "text-slate-400"}`}>
          {formatDuration(duration)}
        </p>
      </div>
    </div>
  );
}
