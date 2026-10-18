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

export function useCourseVideoPlayer(src: string, sourceVersion = 0) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [volume, setVolume] = useState(readStoredCourseVideoVolume);
  const [isMuted, setIsMuted] = useState(() => readStoredCourseVideoVolume() === 0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPip, setIsPip] = useState(false);
  const isPipSupported = typeof document !== "undefined" && Boolean(document.pictureInPictureEnabled);
  const lastAudibleVolumeRef = useRef(volume > 0 ? volume : DEFAULT_UNMUTED_VIDEO_VOLUME);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDurationChange = () => setDuration(video.duration || 0);
    const handleEnterPip = () => setIsPip(true);
    const handleLeavePip = () => setIsPip(false);

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("durationchange", handleDurationChange);
    video.addEventListener("enterpictureinpicture", handleEnterPip);
    video.addEventListener("leavepictureinpicture", handleLeavePip);

    if (video.duration) {
      setDuration(video.duration);
    }

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("durationchange", handleDurationChange);
      video.removeEventListener("enterpictureinpicture", handleEnterPip);
      video.removeEventListener("leavepictureinpicture", handleLeavePip);
    };
  }, [src, sourceVersion]);

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
    const lockLandscapeOrientation = () => {
      if (
        typeof screen !== "undefined" &&
        screen.orientation &&
        typeof (screen.orientation as any).lock === "function"
      ) {
        try {
          (screen.orientation as any).lock("landscape").catch(() => {
            // Ignore lock rejection (unsupported/blocked or user preference)
          });
        } catch {
          // Ignore orientation lock failures
        }
      }
    };

    const unlockScreenOrientation = () => {
      if (typeof screen !== "undefined" && screen.orientation && typeof screen.orientation.unlock === "function") {
        try {
          screen.orientation.unlock();
        } catch {
          // Ignore orientation unlock failure
        }
      }
    };

    const handleFullscreenChange = () => {
      const isFs =
        document.fullscreenElement === containerRef.current ||
        (document as any).webkitFullscreenElement === containerRef.current ||
        (document as any).mozFullScreenElement === containerRef.current ||
        (document as any).msFullscreenElement === containerRef.current;

      setIsFullscreen(isFs);

      if (isFs) {
        lockLandscapeOrientation();
      } else {
        unlockScreenOrientation();
      }
    };

    const video = videoRef.current;
    const handleWebkitBeginFullscreen = () => {
      setIsFullscreen(true);
    };
    const handleWebkitEndFullscreen = () => {
      setIsFullscreen(false);
      unlockScreenOrientation();
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    if (video) {
      video.addEventListener("webkitbeginfullscreen", handleWebkitBeginFullscreen);
      video.addEventListener("webkitendfullscreen", handleWebkitEndFullscreen);
    }

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      if (video) {
        video.removeEventListener("webkitbeginfullscreen", handleWebkitBeginFullscreen);
        video.removeEventListener("webkitendfullscreen", handleWebkitEndFullscreen);
      }
      unlockScreenOrientation();
    };
  }, []);

  const togglePlay = (e?: MouseEvent) => {
    if (e) e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
    } else {
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch((err) => console.error("Error playing video:", err));
      }
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

  const setPlaybackSpeed = (speed: number) => {
    const nextRate = COURSE_VIDEO_PLAYBACK_RATES.find((rate) => rate === speed) ?? 1.0;
    setPlaybackRate(nextRate);
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
    const video = videoRef.current;
    if (!container) return;

    const lockLandscapeOrientation = () => {
      if (
        typeof screen !== "undefined" &&
        screen.orientation &&
        typeof (screen.orientation as any).lock === "function"
      ) {
        try {
          (screen.orientation as any).lock("landscape").catch(() => {});
        } catch {
          // Ignore
        }
      }
    };

    const unlockScreenOrientation = () => {
      if (typeof screen !== "undefined" && screen.orientation && typeof screen.orientation.unlock === "function") {
        try {
          screen.orientation.unlock();
        } catch {
          // Ignore
        }
      }
    };

    const isCurrentFullscreen =
      document.fullscreenElement === container ||
      (document as any).webkitFullscreenElement === container ||
      (document as any).mozFullScreenElement === container ||
      (document as any).msFullscreenElement === container;

    if (!isCurrentFullscreen) {
      let enterFsPromise: Promise<void> | null = null;
      try {
        if (container.requestFullscreen) {
          enterFsPromise = container.requestFullscreen();
        } else if ((container as any).webkitRequestFullscreen) {
          const res = (container as any).webkitRequestFullscreen();
          enterFsPromise = res instanceof Promise ? res : Promise.resolve();
        } else if ((container as any).mozRequestFullScreen) {
          const res = (container as any).mozRequestFullScreen();
          enterFsPromise = res instanceof Promise ? res : Promise.resolve();
        } else if ((container as any).msRequestFullscreen) {
          const res = (container as any).msRequestFullscreen();
          enterFsPromise = res instanceof Promise ? res : Promise.resolve();
        }
      } catch (reqErr) {
        enterFsPromise = Promise.reject(reqErr);
      }

      if (enterFsPromise) {
        enterFsPromise
          .then(() => {
            setIsFullscreen(true);
            lockLandscapeOrientation();
          })
          .catch((err) => {
            // Fallback for iOS Safari which only allows webkitEnterFullscreen on the video element
            if (video && typeof (video as any).webkitEnterFullscreen === "function") {
              try {
                (video as any).webkitEnterFullscreen();
                setIsFullscreen(true);
              } catch (iosErr) {
                console.error("iOS fullscreen failed:", iosErr);
              }
            } else {
              console.error("Error attempting to enable fullscreen:", err);
            }
          });
      } else if (video && typeof (video as any).webkitEnterFullscreen === "function") {
        try {
          (video as any).webkitEnterFullscreen();
          setIsFullscreen(true);
        } catch (iosErr) {
          console.error("iOS native video fullscreen failed:", iosErr);
        }
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((err) => console.error("Error exiting fullscreen:", err));
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if (video && typeof (video as any).webkitExitFullscreen === "function") {
        try {
          (video as any).webkitExitFullscreen();
        } catch (err) {
          console.error("iOS video exit fullscreen failed:", err);
        }
      }

      setIsFullscreen(false);
      unlockScreenOrientation();
    }
  };

  const togglePip = async (e?: MouseEvent) => {
    if (e) e.stopPropagation();
    const video = videoRef.current;
    if (!video || !isPipSupported) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPip(false);
      } else {
        await video.requestPictureInPicture();
        setIsPip(true);
      }
    } catch {
      // Ignore PiP errors in unsupported or restricted frames
    }
  };

  const seekTo = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    const maxDuration = duration || video.duration || 0;
    const target = maxDuration > 0 ? Math.min(maxDuration, Math.max(0, seconds)) : Math.max(0, seconds);
    video.currentTime = target;
    setCurrentTime(target);
  };

  const seekRelative = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    seekTo(video.currentTime + seconds);
  };

  const adjustVolume = (delta: number) => {
    const nextVolume = clampCourseVideoVolume(volume + delta);
    if (nextVolume > 0) {
      lastAudibleVolumeRef.current = nextVolume;
    }
    setVolume(nextVolume);
    setIsMuted(nextVolume === 0);
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
    isPip,
    isPipSupported,
    progressPercent,
    togglePlay,
    handleSeek,
    seekTo,
    seekRelative,
    toggleMute,
    adjustVolume,
    handleVolumeChange,
    handlePlaybackRateChange,
    setPlaybackRate,
    setPlaybackSpeed,
    toggleFullscreen,
    togglePip,
    formatTime: formatCourseVideoTime,
  };
}
