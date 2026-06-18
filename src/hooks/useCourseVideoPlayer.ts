import { useEffect, useRef, useState, type ChangeEvent, type MouseEvent } from "react";

export const COURSE_VIDEO_PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 3.5, 4] as const;
const COURSE_VIDEO_VOLUME_STORAGE_KEY = "axelmond-course-video-volume";
const DEFAULT_COURSE_VIDEO_VOLUME = 1;
const DEFAULT_UNMUTED_VIDEO_VOLUME = 0.8;

function clampCourseVideoVolume(volume: number): number {
  if (!Number.isFinite(volume)) return DEFAULT_COURSE_VIDEO_VOLUME;
  return Math.min(1, Math.max(0, volume));
}

function readStoredCourseVideoVolume(): number {
  if (typeof window === "undefined") return DEFAULT_COURSE_VIDEO_VOLUME;

  try {
    const storedVolume = window.localStorage.getItem(COURSE_VIDEO_VOLUME_STORAGE_KEY);
    if (storedVolume === null) return DEFAULT_COURSE_VIDEO_VOLUME;
    return clampCourseVideoVolume(Number(storedVolume));
  } catch {
    return DEFAULT_COURSE_VIDEO_VOLUME;
  }
}

export function formatCourseVideoTime(timeInSeconds: number): string {
  if (isNaN(timeInSeconds) || !isFinite(timeInSeconds)) return "0:00";
  const hours = Math.floor(timeInSeconds / 3600);
  const minutes = Math.floor((timeInSeconds % 3600) / 60);
  const seconds = Math.floor(timeInSeconds % 60);

  const pad = (num: number) => String(num).padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${minutes}:${pad(seconds)}`;
}

export function useCourseVideoPlayer(src: string) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [volume, setVolume] = useState(readStoredCourseVideoVolume);
  const [isMuted, setIsMuted] = useState(() => readStoredCourseVideoVolume() === 0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const lastAudibleVolumeRef = useRef(volume > 0 ? volume : DEFAULT_UNMUTED_VIDEO_VOLUME);

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

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted || volume === 0;
    }
  }, [isMuted, volume]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  useEffect(() => {
    try {
      window.localStorage.setItem(COURSE_VIDEO_VOLUME_STORAGE_KEY, String(volume));
    } catch {
      // Local storage can be unavailable in private or restricted browser contexts.
    }
  }, [volume]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const togglePlay = (e?: MouseEvent) => {
    if (e) e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch((err) => console.error("Error playing video:", err));
    }
  };

  const handleSeek = (e: ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    const newPercentage = Number(e.target.value);
    const newTime = (newPercentage / 100) * duration;
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleMute = (e: MouseEvent) => {
    e.stopPropagation();
    if (isMuted || volume === 0) {
      setVolume((prev) => {
        if (prev > 0) return prev;
        return lastAudibleVolumeRef.current || DEFAULT_UNMUTED_VIDEO_VOLUME;
      });
      setIsMuted(false);
    } else {
      setIsMuted(true);
    }
  };

  const handleVolumeChange = (e: ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const nextVolume = clampCourseVideoVolume(Number(e.target.value) / 100);
    if (nextVolume > 0) {
      lastAudibleVolumeRef.current = nextVolume;
    }
    setVolume(nextVolume);
    setIsMuted(nextVolume === 0);
  };

  const handlePlaybackRateChange = (e: ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    const requestedRate = Number(e.target.value);
    const nextRate = COURSE_VIDEO_PLAYBACK_RATES.find((rate) => rate === requestedRate) ?? 1.0;
    setPlaybackRate(nextRate);
  };

  const toggleFullscreen = (e: MouseEvent) => {
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

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return {
    videoRef,
    containerRef,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    volume,
    isMuted,
    isFullscreen,
    progressPercent,
    togglePlay,
    handleSeek,
    toggleMute,
    handleVolumeChange,
    handlePlaybackRateChange,
    toggleFullscreen,
    formatTime: formatCourseVideoTime,
  };
}
