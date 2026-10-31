import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Maximize,
  PauseCircle,
  PictureInPicture2,
  PlayCircle,
  RefreshCw,
  Settings,
  Volume2,
  VolumeX,
} from "lucide-react";
import { COURSE_VIDEO_PLAYBACK_RATES, useCourseVideoPlayer } from "../hooks/useCourseVideoPlayer";
import { api } from "../api";
import { sanitizeCourseAttachmentUrl } from "../external-url-security";
import { isNativeApp } from "../utils/platform-app";
import Hls from "hls.js";
import { AntiCaptureShield, useContentProtection } from "./security/ContentProtection";

function isHlsSource(url: unknown): boolean {
  if (typeof url !== "string") return false;
  const lower = url.trim().toLowerCase();
  return lower.includes(".m3u8") || lower.includes("/hls/");
}

function qualityToTargetHeight(quality: VideoQuality): number {
  switch (quality) {
    case "4K":
      return 2160;
    case "2K":
      return 1440;
    case "1080p":
      return 1080;
    case "720p":
      return 720;
    case "480p":
      return 480;
    case "360p":
      return 360;
    default:
      return 0;
  }
}

function heightToResolutionLabel(height: number): VideoQuality {
  if (height >= 2160) return "4K";
  if (height >= 1440) return "2K";
  if (height >= 1080) return "1080p";
  if (height >= 720) return "720p";
  if (height >= 480) return "480p";
  return "360p";
}

const OVERLAY_HIDE_DELAY_MS = 500;
const CONTROLS_HIDE_DELAY_MS = 1600;
const VOLUME_CONTROL_CLOSE_DELAY_MS = 250;
const VIDEO_MAX_AUTOMATIC_RETRIES = 2;
const VIDEO_RETRY_BASE_DELAY_MS = 500;
const MAX_BRANDED_INTRO_DURATION_SECONDS = 30;
const DEFAULT_BRANDED_INTRO_DURATION_SECONDS = 1.75;

export type VideoQuality = "auto" | "4K" | "2K" | "1080p" | "720p" | "480p" | "360p";
export type SettingsView = "main" | "quality" | "speed";

export const VIDEO_QUALITY_OPTIONS: Array<{ value: VideoQuality; label: string; badge?: string }> = [
  { value: "auto", label: "Auto" },
  { value: "4K", label: "2160p", badge: "4K" },
  { value: "2K", label: "1440p", badge: "2K" },
  { value: "1080p", label: "1080p", badge: "HD" },
  { value: "720p", label: "720p", badge: "HD" },
  { value: "480p", label: "480p" },
  { value: "360p", label: "360p" },
];

const VIDEO_QUALITY_STORAGE_KEY = "axelmond-video-quality";

function readStoredVideoQuality(): VideoQuality {
  if (typeof window === "undefined") return "auto";
  try {
    const stored = window.localStorage.getItem(VIDEO_QUALITY_STORAGE_KEY) as VideoQuality | null;
    if (stored && ["auto", "4K", "2K", "1080p", "720p", "480p", "360p"].includes(stored)) {
      return stored;
    }
  } catch {
    // Ignore storage errors in restricted contexts
  }
  return "auto";
}

type VideoLoadState = "LOADING" | "READY" | "BUFFERING" | "PLAYING" | "PAUSED" | "ERROR";
type VideoSourceKind = "DIRECT" | "PROXY";

function normalizeBrandedIntroDuration(value: unknown): number {
  const duration = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(duration) || duration < 0.5 || duration > MAX_BRANDED_INTRO_DURATION_SECONDS) return 0;
  return duration;
}

function sanitizeLessonMediaProxyUrl(value: unknown, contentId: string): string | null {
  const expected = `/api/lesson-contents/${encodeURIComponent(contentId)}/media`;
  return value === expected ? expected : null;
}

interface PremiumVideoPlayerProps {
  src: string;
  title: string;
  instructor: string;
  activeSector: string;
  showMetadata?: boolean;
  contentId?: string;
  currentUser?: { fullName?: string | null; email?: string | null; id?: string | null } | null;
}

export default function PremiumVideoPlayer({
  src,
  title,
  instructor,
  activeSector,
  showMetadata = true,
  contentId,
  currentUser,
}: PremiumVideoPlayerProps) {
  const [sourceVersion, setSourceVersion] = useState(0);
  const [sourceResolutionVersion, setSourceResolutionVersion] = useState(0);
  const [resolvedSrc, setResolvedSrc] = useState(contentId ? "" : src);
  const [proxySrc, setProxySrc] = useState("");
  const [brandedIntroDuration, setBrandedIntroDuration] = useState(0);
  const [videoLoadState, setVideoLoadState] = useState<VideoLoadState>("LOADING");
  const automaticRetryCountRef = useRef(0);
  const automaticRetryTimeoutRef = useRef<number | null>(null);
  const activeSourceKindRef = useRef<VideoSourceKind>("DIRECT");
  const {
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
    setPlaybackSpeed,
    toggleFullscreen,
    togglePip,
    formatTime,
  } = useCourseVideoPlayer(resolvedSrc, sourceVersion);

  const { shieldActive, dismissShield } = useContentProtection({
    enabled: true,
    videoRef,
  });

  const [hoverProgress, setHoverProgress] = useState<{ time: number; percent: number } | null>(null);
  const [resumeNotice, setResumeNotice] = useState<{ time: number; label: string } | null>(null);
  const lastSavedProgressTimeRef = useRef(0);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsView, setSettingsView] = useState<SettingsView>("main");
  const [selectedQuality, setSelectedQuality] = useState<VideoQuality>(readStoredVideoQuality);
  const [detectedResolution, setDetectedResolution] = useState<string | null>(null);
  const settingsContainerRef = useRef<HTMLDivElement>(null);

  const isStudent = activeSector === "student";
  const themeAccentClass = isStudent ? "accent-emerald-500" : "accent-emerald-500";
  const playButtonThemeClass = isStudent ? "text-emerald-600 fill-indigo-600" : "text-emerald-600 fill-pink-600";
  const controlFocusClass = isStudent ? "focus:ring-emerald-400" : "focus:ring-emerald-400";
  const [controlsVisible, setControlsVisible] = useState(true);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [volumeControlOpen, setVolumeControlOpen] = useState(false);
  const hideControlsTimeoutRef = useRef<number | null>(null);
  const hideOverlayTimeoutRef = useRef<number | null>(null);
  const hideVolumeControlTimeoutRef = useRef<number | null>(null);
  const volumeDraggingRef = useRef(false);
  const volumeHasFocusRef = useRef(false);

  useEffect(() => {
    if (!settingsOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (settingsContainerRef.current && !settingsContainerRef.current.contains(event.target as Node)) {
        setSettingsOpen(false);
        setSettingsView("main");
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSettingsOpen(false);
        setSettingsView("main");
      }
    };

    document.addEventListener("pointerdown", handlePointerDown as EventListener);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown as EventListener);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [settingsOpen]);

  const hlsRef = useRef<Hls | null>(null);

  const applyHlsQuality = useCallback((hls: Hls, quality: VideoQuality) => {
    if (!hls || !hls.levels || hls.levels.length === 0) return;
    if (quality === "auto") {
      hls.currentLevel = -1;
      return;
    }
    const targetHeight = qualityToTargetHeight(quality);
    let bestIdx = -1;
    let minDiff = Infinity;
    hls.levels.forEach((lvl, idx) => {
      const diff = Math.abs((lvl.height || 0) - targetHeight);
      if (diff < minDiff) {
        minDiff = diff;
        bestIdx = idx;
      }
    });
    if (bestIdx !== -1) {
      hls.currentLevel = bestIdx;
      const chosen = hls.levels[bestIdx];
      if (chosen && chosen.height) {
        setDetectedResolution(heightToResolutionLabel(chosen.height));
      }
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !resolvedSrc) return;

    if (isHlsSource(resolvedSrc) && typeof window !== "undefined" && Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      const hls = new Hls({
        enableWorker: !isNativeApp(),
        lowLatencyMode: false,
        backBufferLength: 90,
      });
      hlsRef.current = hls;

      hls.loadSource(resolvedSrc);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        applyHlsQuality(hls, selectedQuality);
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        const lvl = hls.levels[data.level];
        if (lvl && lvl.height) {
          setDetectedResolution(heightToResolutionLabel(lvl.height));
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              break;
          }
        }
      });

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (isHlsSource(resolvedSrc) && video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = resolvedSrc;
    }
  }, [resolvedSrc, sourceVersion, applyHlsQuality, selectedQuality]);

  const handleSelectQuality = useCallback((quality: VideoQuality) => {
    setSelectedQuality(quality);
    try {
      window.localStorage.setItem(VIDEO_QUALITY_STORAGE_KEY, quality);
    } catch {
      // Ignore storage errors
    }
    if (hlsRef.current) {
      applyHlsQuality(hlsRef.current, quality);
    }
    setSettingsOpen(false);
    setSettingsView("main");
  }, [applyHlsQuality]);

  const handleSelectSpeed = useCallback((speed: number) => {
    setPlaybackSpeed(speed);
    setSettingsOpen(false);
    setSettingsView("main");
  }, [setPlaybackSpeed]);

  const currentQualityLabel = selectedQuality === "auto" ? (detectedResolution ? `Auto (${detectedResolution})` : "Auto") : selectedQuality;
  const currentSpeedLabel = playbackRate === 1 ? "Normal" : `${playbackRate}x`;

  const clearAutomaticRetryTimeout = useCallback(() => {
    if (automaticRetryTimeoutRef.current !== null) {
      window.clearTimeout(automaticRetryTimeoutRef.current);
      automaticRetryTimeoutRef.current = null;
    }
  }, []);

  const reloadVideoSource = useCallback(() => {
    setVideoLoadState("LOADING");
    if (contentId) {
      setResolvedSrc("");
      setProxySrc("");
      activeSourceKindRef.current = "DIRECT";
      setSourceResolutionVersion((current) => current + 1);
    } else {
      setSourceVersion((current) => current + 1);
    }
  }, [contentId]);

  const retryVideoManually = useCallback(() => {
    clearAutomaticRetryTimeout();
    automaticRetryCountRef.current = 0;
    reloadVideoSource();
  }, [clearAutomaticRetryTimeout, reloadVideoSource]);

  const scheduleAutomaticRetry = useCallback(() => {
    clearAutomaticRetryTimeout();
    if (automaticRetryCountRef.current >= VIDEO_MAX_AUTOMATIC_RETRIES) {
      setVideoLoadState("ERROR");
      return;
    }

    const attempt = automaticRetryCountRef.current;
    automaticRetryCountRef.current += 1;
    setVideoLoadState("LOADING");
    automaticRetryTimeoutRef.current = window.setTimeout(reloadVideoSource, VIDEO_RETRY_BASE_DELAY_MS * 2 ** attempt);
  }, [clearAutomaticRetryTimeout, reloadVideoSource]);

  const handleVideoError = useCallback(() => {
    clearAutomaticRetryTimeout();
    if (contentId && activeSourceKindRef.current === "DIRECT" && proxySrc && !isHlsSource(resolvedSrc)) {
      activeSourceKindRef.current = "PROXY";
      setVideoLoadState("LOADING");
      setResolvedSrc(proxySrc);
      setSourceVersion((current) => current + 1);
      return;
    }
    scheduleAutomaticRetry();
  }, [clearAutomaticRetryTimeout, contentId, proxySrc, resolvedSrc, scheduleAutomaticRetry]);

  useEffect(() => {
    clearAutomaticRetryTimeout();
    automaticRetryCountRef.current = 0;
    setVideoLoadState("LOADING");
    setSourceVersion(0);
    setProxySrc("");
    setBrandedIntroDuration(0);
    activeSourceKindRef.current = "DIRECT";
    return clearAutomaticRetryTimeout;
  }, [clearAutomaticRetryTimeout, contentId, src]);

  useEffect(() => {
    let active = true;
    if (!contentId) {
      setBrandedIntroDuration(0);
      setResolvedSrc(src);
      return () => {
        active = false;
      };
    }

    setVideoLoadState("LOADING");
    setResolvedSrc("");
    void api
      .getLessonContentMediaSource(contentId)
      .then(({ sourceUrl, proxySourceUrl, brandedIntroDuration: resolvedIntroDuration }) => {
        if (!active) return;
        const safeSource = sanitizeCourseAttachmentUrl(sourceUrl);
        const safeProxySource = sanitizeLessonMediaProxyUrl(proxySourceUrl, contentId);
        if (!safeSource && !safeProxySource) throw new Error("Source vidéo non autorisée");
        setProxySrc(safeProxySource || "");
        setBrandedIntroDuration(normalizeBrandedIntroDuration(resolvedIntroDuration));
        activeSourceKindRef.current = safeSource ? "DIRECT" : "PROXY";
        setResolvedSrc(safeSource || safeProxySource || "");
        setSourceVersion((current) => current + 1);
      })
      .catch(() => {
        if (active) scheduleAutomaticRetry();
      });

    return () => {
      active = false;
    };
  }, [contentId, scheduleAutomaticRetry, sourceResolutionVersion, src]);

  const clearHideControlsTimeout = useCallback(() => {
    if (hideControlsTimeoutRef.current) {
      window.clearTimeout(hideControlsTimeoutRef.current);
      hideControlsTimeoutRef.current = null;
    }
  }, []);

  const clearHideOverlayTimeout = useCallback(() => {
    if (hideOverlayTimeoutRef.current) {
      window.clearTimeout(hideOverlayTimeoutRef.current);
      hideOverlayTimeoutRef.current = null;
    }
  }, []);

  const clearHideVolumeControlTimeout = useCallback(() => {
    if (hideVolumeControlTimeoutRef.current) {
      window.clearTimeout(hideVolumeControlTimeoutRef.current);
      hideVolumeControlTimeoutRef.current = null;
    }
  }, []);

  const scheduleHideOverlay = useCallback(() => {
    clearHideOverlayTimeout();
    setOverlayVisible(true);
    hideOverlayTimeoutRef.current = window.setTimeout(() => {
      setOverlayVisible(false);
    }, OVERLAY_HIDE_DELAY_MS);
  }, [clearHideOverlayTimeout]);

  const revealControlsTemporarily = useCallback(() => {
    setControlsVisible(true);
    clearHideControlsTimeout();

    if (isPlaying && showMetadata) {
      hideControlsTimeoutRef.current = window.setTimeout(() => {
        setControlsVisible(false);
      }, CONTROLS_HIDE_DELAY_MS);
    }
  }, [clearHideControlsTimeout, isPlaying, showMetadata]);

  const openVolumeControl = useCallback(() => {
    clearHideVolumeControlTimeout();
    setVolumeControlOpen(true);
    revealControlsTemporarily();
  }, [clearHideVolumeControlTimeout, revealControlsTemporarily]);

  const scheduleVolumeControlClose = useCallback(() => {
    clearHideVolumeControlTimeout();
    hideVolumeControlTimeoutRef.current = window.setTimeout(() => {
      if (volumeDraggingRef.current || volumeHasFocusRef.current) return;
      setVolumeControlOpen(false);
    }, VOLUME_CONTROL_CLOSE_DELAY_MS);
  }, [clearHideVolumeControlTimeout]);

  const finishVolumeInteraction = useCallback(() => {
    volumeDraggingRef.current = false;
    if (!volumeHasFocusRef.current) {
      scheduleVolumeControlClose();
    }
  }, [scheduleVolumeControlClose]);

  useEffect(() => {
    if (!isPlaying) {
      clearHideOverlayTimeout();
      setOverlayVisible(true);
      return;
    }

    scheduleHideOverlay();
    return clearHideOverlayTimeout;
  }, [clearHideOverlayTimeout, isPlaying, scheduleHideOverlay]);

  useEffect(() => {
    if (!isPlaying) {
      clearHideControlsTimeout();
      setControlsVisible(true);
      return;
    }

    revealControlsTemporarily();
    return clearHideControlsTimeout;
  }, [clearHideControlsTimeout, isPlaying, revealControlsTemporarily]);

  useEffect(() => {
    const handlePointerEnd = () => {
      if (!volumeDraggingRef.current) return;
      finishVolumeInteraction();
    };

    window.addEventListener("pointerup", handlePointerEnd);
    window.addEventListener("pointercancel", handlePointerEnd);
    return () => {
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerEnd);
      clearHideVolumeControlTimeout();
    };
  }, [clearHideVolumeControlTimeout, finishVolumeInteraction]);

  const progressStorageKey = contentId
    ? `pa_video_progress_${contentId}`
    : resolvedSrc
      ? `pa_video_progress_${encodeURIComponent(resolvedSrc)}`
      : "";

  useEffect(() => {
    if (!progressStorageKey || typeof window === "undefined") return;
    try {
      const saved = window.localStorage.getItem(progressStorageKey);
      if (saved) {
        const parsedTime = Number(saved);
        if (Number.isFinite(parsedTime) && parsedTime > 5) {
          setResumeNotice({
            time: parsedTime,
            label: formatTime(parsedTime),
          });
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, [progressStorageKey, formatTime]);

  useEffect(() => {
    if (!resumeNotice) return;
    const timer = window.setTimeout(() => setResumeNotice(null), 8000);
    return () => window.clearTimeout(timer);
  }, [resumeNotice]);

  useEffect(() => {
    if (!progressStorageKey || typeof window === "undefined" || !duration) return;
    const now = Date.now();
    if (now - lastSavedProgressTimeRef.current < 2000) return;
    lastSavedProgressTimeRef.current = now;

    try {
      if (currentTime >= 5 && currentTime < duration - 10) {
        window.localStorage.setItem(progressStorageKey, String(Math.floor(currentTime)));
      } else if (currentTime >= duration - 5) {
        window.localStorage.removeItem(progressStorageKey);
      }
    } catch {
      // Ignore storage errors
    }
  }, [currentTime, duration, progressStorageKey]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      if (tagName === "input" || tagName === "textarea" || tagName === "select" || target?.isContentEditable) {
        return;
      }

      const isFocused =
        container.matches(":hover") ||
        container.contains(document.activeElement) ||
        document.fullscreenElement === container;

      if (!isFocused) return;

      switch (e.key) {
        case " ":
        case "k":
        case "K":
          e.preventDefault();
          togglePlay();
          revealControlsTemporarily();
          break;
        case "f":
        case "F":
          e.preventDefault();
          toggleFullscreen(e as any);
          break;
        case "m":
        case "M":
          e.preventDefault();
          toggleMute(e as any);
          revealControlsTemporarily();
          break;
        case "p":
        case "P":
          if (isPipSupported) {
            e.preventDefault();
            togglePip();
          }
          break;
        case "ArrowLeft":
          e.preventDefault();
          seekRelative(-5);
          revealControlsTemporarily();
          break;
        case "ArrowRight":
          e.preventDefault();
          seekRelative(5);
          revealControlsTemporarily();
          break;
        case "j":
        case "J":
          e.preventDefault();
          seekRelative(-10);
          revealControlsTemporarily();
          break;
        case "l":
        case "L":
          e.preventDefault();
          seekRelative(10);
          revealControlsTemporarily();
          break;
        case "ArrowUp":
          e.preventDefault();
          adjustVolume(0.05);
          revealControlsTemporarily();
          break;
        case "ArrowDown":
          e.preventDefault();
          adjustVolume(-0.05);
          revealControlsTemporarily();
          break;
        case "0":
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
        case "9":
          if (duration > 0) {
            e.preventDefault();
            const pct = parseInt(e.key, 10) * 0.1;
            seekTo(pct * duration);
            revealControlsTemporarily();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [
    containerRef,
    duration,
    togglePlay,
    toggleFullscreen,
    toggleMute,
    togglePip,
    isPipSupported,
    seekRelative,
    seekTo,
    adjustVolume,
    revealControlsTemporarily,
  ]);

  const handleProgressMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !duration) return;
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverProgress({
      time: ratio * duration,
      percent: ratio * 100,
    });
  };

  const handleProgressMouseLeave = () => {
    setHoverProgress(null);
  };

  const handleSurfaceClick = () => {
    revealControlsTemporarily();
    if (settingsOpen) {
      setSettingsOpen(false);
      setSettingsView("main");
      return;
    }
    if (videoLoadState === "ERROR") {
      retryVideoManually();
      return;
    }
    if (isPlaying && (videoLoadState === "LOADING" || videoLoadState === "BUFFERING")) return;
    togglePlay();
  };

  const chromeVisible = !isPlaying || controlsVisible || volumeControlOpen || settingsOpen || !showMetadata;
  const centerOverlayVisible =
    !isPlaying ||
    overlayVisible ||
    videoLoadState === "LOADING" ||
    videoLoadState === "BUFFERING" ||
    videoLoadState === "ERROR";
  const volumePercent = Math.round(volume * 100);
  const effectiveIntroDuration =
    brandedIntroDuration > 0 ? brandedIntroDuration : DEFAULT_BRANDED_INTRO_DURATION_SECONDS;
  const brandedIntroVisible = currentTime < effectiveIntroDuration && videoLoadState !== "ERROR";
  const introFadeOutProgress = Math.min(1, Math.max(0, (effectiveIntroDuration - currentTime) / 0.55));
  const brandSignatureOpacity = !isPlaying && currentTime === 0 ? 1 : introFadeOutProgress;
  const brandSignatureScale =
    !isPlaying && currentTime === 0 ? 1 : 0.96 + Math.min(1, Math.max(0, currentTime / 0.75)) * 0.04;
  const overlayButtonClass = showMetadata ? "h-20 w-20" : "h-14 w-14";
  const overlayIconClass = showMetadata ? "h-10 w-10" : "h-7 w-7";

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      data-fullscreen={isFullscreen}
      onClick={handleSurfaceClick}
      onMouseEnter={() => revealControlsTemporarily()}
      onMouseMove={() => revealControlsTemporarily()}
      onTouchStart={() => revealControlsTemporarily()}
      className={`course-video-player group relative flex ${
        isFullscreen ? "fixed inset-0 z-50 h-screen w-screen !aspect-auto !rounded-none" : "aspect-video w-full"
      } cursor-pointer select-none flex-col items-center justify-center overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-md`}
    >
      <video
        key={`${resolvedSrc}-${sourceVersion}`}
        ref={videoRef}
        src={
          isHlsSource(resolvedSrc) && typeof window !== "undefined" && Hls.isSupported()
            ? undefined
            : resolvedSrc || undefined
        }
        preload="metadata"
        playsInline
        controlsList="nodownload"
        className={`h-full w-full object-contain transition-opacity duration-150 ${brandedIntroVisible ? "opacity-0" : "opacity-100"}`}
        onContextMenu={(e) => e.preventDefault()}
        onLoadStart={() => setVideoLoadState("LOADING")}
        onLoadedMetadata={() => {
          automaticRetryCountRef.current = 0;
          setVideoLoadState("READY");
          const video = videoRef.current;
          if (video && video.videoHeight) {
            if (video.videoHeight >= 2160) setDetectedResolution("4K");
            else if (video.videoHeight >= 1440) setDetectedResolution("2K");
            else if (video.videoHeight >= 1080) setDetectedResolution("1080p");
            else if (video.videoHeight >= 720) setDetectedResolution("720p");
            else if (video.videoHeight >= 480) setDetectedResolution("480p");
            else setDetectedResolution("360p");
          }
        }}
        onCanPlay={() => setVideoLoadState(isPlaying ? "PLAYING" : "READY")}
        onWaiting={() => {
          if (contentId) {
            if (isPlaying) setVideoLoadState("BUFFERING");
          } else {
            setVideoLoadState("BUFFERING");
          }
        }}
        onStalled={() => {
          if (contentId) {
            if (isPlaying) setVideoLoadState("BUFFERING");
          } else {
            setVideoLoadState("BUFFERING");
          }
        }}
        onPlaying={() => {
          automaticRetryCountRef.current = 0;
          setVideoLoadState("PLAYING");
        }}
        onPause={() => setVideoLoadState("PAUSED")}
        onEnded={() => {
          setVideoLoadState("PAUSED");
          if (progressStorageKey && typeof window !== "undefined") {
            try {
              window.localStorage.removeItem(progressStorageKey);
            } catch {}
          }
        }}
        onError={handleVideoError}
      />

      {brandedIntroVisible && (
        <div
          data-testid="branded-video-intro"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center bg-slate-950"
        >
          <div
            className={`flex flex-col items-center gap-4 transition-[opacity,transform] duration-200 ease-out ${
              !isPlaying && currentTime === 0 ? "pb-20 sm:pb-24" : ""
            }`}
            style={{ opacity: brandSignatureOpacity, transform: `scale(${brandSignatureScale})` }}
          >
            <img
              src="/performance-logo-003a24a4-192.png"
              alt=""
              className="h-auto w-24 drop-shadow-[0_10px_24px_rgba(16,185,129,0.18)] sm:w-28 lg:w-32"
              draggable={false}
            />
            <p className="text-center text-xs font-black uppercase tracking-[0.035em] text-emerald-50 sm:text-sm lg:text-base">
              Performance Académique
            </p>
          </div>
        </div>
      )}

      {/* Pitch-Black Anti-Capture Screen Shield */}
      <AntiCaptureShield active={shieldActive} onDismiss={dismissShield} />

      <div
        className={`course-video-center-overlay absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/20 transition-opacity duration-300 ${centerOverlayVisible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
      >
        {videoLoadState === "ERROR" ? (
          <div className="course-video-error flex max-w-md flex-col items-center gap-3 px-6 text-center" role="alert">
            <AlertTriangle className="course-video-error-icon h-10 w-10 text-amber-300" />
            <p className="text-sm font-bold text-white">La vidéo ne peut pas être chargée pour le moment.</p>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                retryVideoManually();
              }}
              className="course-video-retry inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
            >
              <RefreshCw className="h-4 w-4" /> Réessayer
            </button>
          </div>
        ) : contentId && resolvedSrc && !isPlaying ? (
          <div
            className={`flex flex-col items-center gap-3 ${brandedIntroVisible && currentTime === 0 ? "pt-24 sm:pt-28" : ""}`}
          >
            <button
              type="button"
              onClick={togglePlay}
              className={`course-video-overlay-button ${overlayButtonClass} flex cursor-pointer items-center justify-center rounded-full bg-white/95 text-emerald-900 shadow-lg transition-all hover:scale-105 hover:bg-slate-100`}
            >
              <PlayCircle className={`${overlayIconClass} ml-0.5 ${playButtonThemeClass}`} />
            </button>
            {showMetadata && (
              <p className="course-video-metadata max-w-[90%] animate-in truncate rounded-lg border border-slate-700/50 bg-slate-900/80 px-3 py-1.5 font-mono text-xs font-bold tracking-wide text-white shadow-sm duration-200 fade-in">
                {title} • {instructor} • {formatTime(duration)}
              </p>
            )}
          </div>
        ) : videoLoadState === "LOADING" || videoLoadState === "BUFFERING" ? (
          <div
            className={`flex flex-col items-center gap-3 ${brandedIntroVisible ? "pt-24 sm:pt-28" : ""}`}
            role="status"
          >
            <LoaderCircle className="h-10 w-10 animate-spin text-emerald-300" />
            <p className="text-xs font-bold text-white">
              {videoLoadState === "BUFFERING" ? "Mise en mémoire tampon…" : "Chargement de la vidéo…"}
            </p>
          </div>
        ) : !isPlaying ? (
          <div
            className={`flex flex-col items-center gap-3 ${brandedIntroVisible && currentTime === 0 ? "pt-24 sm:pt-28" : ""}`}
          >
            <button
              type="button"
              onClick={togglePlay}
              className={`course-video-overlay-button ${overlayButtonClass} flex cursor-pointer items-center justify-center rounded-full bg-white/95 text-emerald-900 shadow-lg transition-all hover:scale-105 hover:bg-slate-100`}
            >
              <PlayCircle className={`${overlayIconClass} ml-0.5 ${playButtonThemeClass}`} />
            </button>
            {showMetadata && (
              <p className="course-video-metadata max-w-[90%] animate-in truncate rounded-lg border border-slate-700/50 bg-slate-900/80 px-3 py-1.5 font-mono text-xs font-bold tracking-wide text-white shadow-sm duration-200 fade-in">
                {title} • {instructor} • {formatTime(duration)}
              </p>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={togglePlay}
            className={`course-video-overlay-button ${overlayButtonClass} flex cursor-pointer items-center justify-center rounded-full bg-white/95 text-slate-950 shadow-lg transition-all hover:scale-105 hover:bg-slate-100`}
            title="Mettre en pause"
          >
            <PauseCircle className={overlayIconClass} />
          </button>
        )}
      </div>

      {resumeNotice && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute top-4 left-4 z-30 flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-slate-950/90 backdrop-blur-md px-3 py-2 shadow-2xl animate-in fade-in duration-300"
        >
          <span className="text-xs font-medium text-slate-200">
            Reprendre à <span className="font-mono font-bold text-emerald-400">{resumeNotice.label}</span> ?
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              seekTo(resumeNotice.time);
              setResumeNotice(null);
              if (!isPlaying) togglePlay();
            }}
            className="cursor-pointer rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-500 transition-colors shadow-sm"
          >
            Reprendre
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setResumeNotice(null);
            }}
            className="cursor-pointer text-slate-400 hover:text-white text-sm px-1.5 py-0.5 rounded transition-colors"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
      )}

      <div
        onClick={(e) => e.stopPropagation()}
        onMouseMove={() => revealControlsTemporarily()}
        onTouchStart={() => revealControlsTemporarily()}
        className={`course-video-controls absolute bottom-0 left-0 right-0 z-20 flex min-w-0 flex-nowrap items-center gap-2 border-t border-slate-800 bg-slate-950/90 p-2 text-xs text-white transition-all duration-300 sm:gap-3 sm:p-4 ${chromeVisible ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"}`}
      >
        <span className="course-video-time shrink-0 whitespace-nowrap text-center font-mono text-[10px] sm:text-[11px]">
          <span>{formatTime(currentTime)}</span>
          <span className="course-video-duration"> / {formatTime(duration)}</span>
        </span>

        <div
          className="course-video-progress flex min-w-0 flex-1 relative items-center px-1"
          onMouseMove={handleProgressMouseMove}
          onMouseLeave={handleProgressMouseLeave}
        >
          {hoverProgress && duration > 0 && (
            <div
              className="pointer-events-none absolute bottom-full mb-2 -translate-x-1/2 rounded-md bg-slate-900/95 px-2 py-0.5 font-mono text-[11px] font-bold text-white shadow-md border border-slate-700/60"
              style={{ left: `${hoverProgress.percent}%` }}
            >
              {formatTime(hoverProgress.time)}
            </div>
          )}
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={progressPercent}
            onChange={handleSeek}
            aria-label="Progression de la vidéo"
            style={{
              background: `linear-gradient(to right, #10b981 0%, #10b981 ${progressPercent}%, rgba(255, 255, 255, 0.35) ${progressPercent}%, rgba(255, 255, 255, 0.35) 100%)`,
            }}
            className={`course-video-progress-slider w-full h-2 rounded-full appearance-none cursor-pointer outline-none transition-all hover:h-2.5 ${themeAccentClass}`}
          />
        </div>

        <div
          className="group/volume relative flex shrink-0 items-center"
          onPointerEnter={openVolumeControl}
          onPointerLeave={scheduleVolumeControlClose}
          onFocusCapture={() => {
            volumeHasFocusRef.current = true;
            openVolumeControl();
          }}
          onBlurCapture={(event) => {
            if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
            volumeHasFocusRef.current = false;
            scheduleVolumeControlClose();
          }}
        >
          <button
            type="button"
            onClick={toggleMute}
            onPointerDown={openVolumeControl}
            className={`p-1.5 hover:text-slate-300 transition-colors cursor-pointer rounded-lg focus:outline-none focus:ring-2 ${controlFocusClass}`}
            title={isMuted || volumePercent === 0 ? "Réactiver le son" : "Couper le son"}
          >
            {isMuted || volumePercent === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <div
            onMouseMove={() => revealControlsTemporarily()}
            onTouchStart={() => revealControlsTemporarily()}
            className={`absolute bottom-[calc(100%+0.5rem)] left-1/2 z-30 flex -translate-x-1/2 flex-col items-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-950/95 px-2.5 py-2 shadow-lg transition-all duration-200 ${
              chromeVisible && volumeControlOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
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
              onPointerDown={(event) => {
                event.stopPropagation();
                volumeDraggingRef.current = true;
                openVolumeControl();
              }}
              onPointerUp={(event) => {
                event.stopPropagation();
                finishVolumeInteraction();
              }}
              onPointerCancel={finishVolumeInteraction}
              aria-label="Volume vidéo"
              className={`video-volume-slider-vertical ${themeAccentClass}`}
            />
          </div>
        </div>

        {/* Settings button and popover (Quality & Speed) */}
        <div
          ref={settingsContainerRef}
          className="group/settings relative flex shrink-0 items-center"
          onMouseMove={() => revealControlsTemporarily()}
          onTouchStart={() => revealControlsTemporarily()}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSettingsOpen((prev) => !prev);
              setSettingsView("main");
              revealControlsTemporarily();
            }}
            className={`p-1.5 transition-colors cursor-pointer rounded-lg focus:outline-none focus:ring-2 ${
              settingsOpen ? "text-emerald-400 bg-white/10" : "text-slate-300 hover:text-white"
            } ${controlFocusClass}`}
            title="Paramètres vidéo (Qualité & Vitesse)"
            aria-label="Paramètres vidéo"
            aria-expanded={settingsOpen}
          >
            <Settings className={`w-4 h-4 transition-transform duration-300 ${settingsOpen ? "rotate-45 text-emerald-400" : ""}`} />
          </button>

          {/* Settings Popover Card */}
          {settingsOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-[calc(100%+0.65rem)] right-0 z-30 w-56 overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-1.5 text-slate-800 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
            >
              {settingsView === "main" && (
                <div className="space-y-0.5">
                  {/* Quality row */}
                  <button
                    type="button"
                    onClick={() => setSettingsView("quality")}
                    className="flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left font-bold text-slate-800 hover:bg-slate-100/90 transition-colors group cursor-pointer"
                  >
                    <span className="text-[13px] font-bold text-slate-800 tracking-tight">Quality</span>
                    <div className="flex items-center gap-1.5 text-slate-600 font-semibold text-xs">
                      <span>{currentQualityLabel}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-colors" />
                    </div>
                  </button>

                  {/* Speed row */}
                  <button
                    type="button"
                    onClick={() => setSettingsView("speed")}
                    className="flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left font-bold text-slate-800 hover:bg-slate-100/90 transition-colors group cursor-pointer"
                  >
                    <span className="text-[13px] font-bold text-slate-800 tracking-tight">Speed</span>
                    <div className="flex items-center gap-1.5 text-slate-600 font-semibold text-xs">
                      <span>{currentSpeedLabel}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-colors" />
                    </div>
                  </button>
                </div>
              )}

              {settingsView === "quality" && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2 mb-1 px-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setSettingsView("main")}
                      className="flex items-center gap-1.5 text-slate-700 hover:text-slate-900 font-bold text-xs cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5 text-slate-500" />
                      <span>Quality</span>
                    </button>
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-0.5">
                    {VIDEO_QUALITY_OPTIONS.map((opt) => {
                      const isSelected = selectedQuality === opt.value;
                      return (
                        <button
                          type="button"
                          key={opt.value}
                          onClick={() => handleSelectQuality(opt.value)}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-emerald-50 text-emerald-800 font-bold"
                              : "text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isSelected ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <span className="w-3.5 shrink-0" />
                            )}
                            <span>{opt.label}</span>
                            {opt.badge && (
                              <span
                                className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                                  opt.badge === "4K"
                                    ? "bg-amber-100 text-amber-800 border border-amber-200/60"
                                    : opt.badge === "2K"
                                    ? "bg-sky-100 text-sky-800 border border-sky-200/60"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {opt.badge}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {settingsView === "speed" && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2 mb-1 px-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setSettingsView("main")}
                      className="flex items-center gap-1.5 text-slate-700 hover:text-slate-900 font-bold text-xs cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5 text-slate-500" />
                      <span>Speed</span>
                      <span className="sr-only">Vitesse</span>
                    </button>
                  </div>
                  <div
                    className="max-h-56 overflow-y-auto space-y-0.5"
                    aria-label="Vitesse de lecture"
                  >
                    {COURSE_VIDEO_PLAYBACK_RATES.map((rate) => {
                      const isSelected = playbackRate === rate;
                      return (
                        <button
                          type="button"
                          key={rate}
                          onClick={() => handleSelectSpeed(rate)}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-emerald-50 text-emerald-800 font-bold"
                              : "text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isSelected ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <span className="w-3.5 shrink-0" />
                            )}
                            <span>{rate === 1 ? "Normal" : `${rate}x`}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {isPipSupported && (
          <button
            type="button"
            onClick={togglePip}
            className={`shrink-0 cursor-pointer rounded-lg p-1.5 transition-colors hover:text-slate-300 focus:outline-none focus:ring-2 ${controlFocusClass}`}
            title={isPip ? "Quitter Incrustation (P)" : "Incrustation d'image (P)"}
            aria-label="Image dans l'image"
          >
            <PictureInPicture2 className={`w-4 h-4 ${isPip ? "text-emerald-400" : ""}`} />
          </button>
        )}

        <button
          type="button"
          onClick={toggleFullscreen}
          className={`shrink-0 cursor-pointer rounded-lg p-1.5 transition-colors hover:text-slate-300 focus:outline-none focus:ring-2 ${controlFocusClass}`}
          title="Plein écran"
        >
          <Maximize className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
