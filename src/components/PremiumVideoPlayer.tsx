import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  LoaderCircle,
  Maximize,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Volume2,
  VolumeX,
} from "lucide-react";
import { COURSE_VIDEO_PLAYBACK_RATES, useCourseVideoPlayer } from "../hooks/useCourseVideoPlayer";
import { api } from "../api";
import { sanitizeCourseAttachmentUrl } from "../external-url-security";

const OVERLAY_HIDE_DELAY_MS = 500;
const CONTROLS_HIDE_DELAY_MS = 1600;
const VOLUME_CONTROL_CLOSE_DELAY_MS = 250;
const VIDEO_MAX_AUTOMATIC_RETRIES = 2;
const VIDEO_RETRY_BASE_DELAY_MS = 500;
const MAX_BRANDED_INTRO_DURATION_SECONDS = 30;

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
}

export default function PremiumVideoPlayer({
  src,
  title,
  instructor,
  activeSector,
  showMetadata = true,
  contentId,
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
    progressPercent,
    togglePlay,
    handleSeek,
    toggleMute,
    handleVolumeChange,
    handlePlaybackRateChange,
    toggleFullscreen,
    formatTime,
  } = useCourseVideoPlayer(resolvedSrc, sourceVersion);

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
    if (contentId && activeSourceKindRef.current === "DIRECT" && proxySrc) {
      activeSourceKindRef.current = "PROXY";
      setVideoLoadState("LOADING");
      setResolvedSrc(proxySrc);
      setSourceVersion((current) => current + 1);
      return;
    }
    scheduleAutomaticRetry();
  }, [clearAutomaticRetryTimeout, contentId, proxySrc, scheduleAutomaticRetry]);

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

  const handleSurfaceClick = () => {
    revealControlsTemporarily();
    if (videoLoadState === "ERROR") {
      retryVideoManually();
      return;
    }
    if (videoLoadState === "LOADING" || videoLoadState === "BUFFERING") return;
    togglePlay();
  };

  const chromeVisible = !isPlaying || controlsVisible || volumeControlOpen || !showMetadata;
  const centerOverlayVisible =
    !isPlaying ||
    overlayVisible ||
    videoLoadState === "LOADING" ||
    videoLoadState === "BUFFERING" ||
    videoLoadState === "ERROR";
  const volumePercent = Math.round(volume * 100);
  const brandedIntroVisible =
    brandedIntroDuration > 0 && currentTime < brandedIntroDuration && videoLoadState !== "ERROR";
  const introFadeInProgress = Math.min(1, Math.max(0, currentTime / 0.75));
  const introFadeOutProgress = Math.min(1, Math.max(0, (brandedIntroDuration - currentTime) / 0.55));
  const brandSignatureOpacity = Math.min(introFadeInProgress, introFadeOutProgress);
  const brandSignatureScale = 0.96 + introFadeInProgress * 0.04;
  const overlayButtonClass = showMetadata ? "h-20 w-20" : "h-14 w-14";
  const overlayIconClass = showMetadata ? "h-10 w-10" : "h-7 w-7";

  return (
    <div
      ref={containerRef}
      onClick={handleSurfaceClick}
      onMouseEnter={() => revealControlsTemporarily()}
      onMouseMove={() => revealControlsTemporarily()}
      onTouchStart={() => revealControlsTemporarily()}
      className="course-video-player group relative flex aspect-video w-full cursor-pointer select-none flex-col items-center justify-center overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-md"
    >
      <video
        key={`${resolvedSrc}-${sourceVersion}`}
        ref={videoRef}
        src={resolvedSrc || undefined}
        preload="metadata"
        playsInline
        controlsList="nodownload"
        className={`h-full w-full object-contain transition-opacity duration-150 ${brandedIntroVisible ? "opacity-0" : "opacity-100"}`}
        onContextMenu={(e) => e.preventDefault()}
        onLoadStart={() => setVideoLoadState("LOADING")}
        onLoadedMetadata={() => {
          automaticRetryCountRef.current = 0;
          setVideoLoadState("READY");
        }}
        onCanPlay={() => setVideoLoadState(isPlaying ? "PLAYING" : "READY")}
        onWaiting={() => setVideoLoadState("BUFFERING")}
        onStalled={() => setVideoLoadState("BUFFERING")}
        onPlaying={() => {
          automaticRetryCountRef.current = 0;
          setVideoLoadState("PLAYING");
        }}
        onPause={() => setVideoLoadState("PAUSED")}
        onError={handleVideoError}
      />

      {brandedIntroVisible && (
        <div
          data-testid="branded-video-intro"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center bg-slate-950"
        >
          <div
            className="flex flex-col items-center gap-5 transition-[opacity,transform] duration-200 ease-out"
            style={{ opacity: brandSignatureOpacity, transform: `scale(${brandSignatureScale})` }}
          >
            <img
              src="/performance-logo-003a24a4-192.png"
              alt=""
              className="h-auto w-28 drop-shadow-[0_10px_24px_rgba(16,185,129,0.14)] sm:w-32 lg:w-36"
              draggable={false}
            />
            <p className="text-center text-sm font-black uppercase tracking-[0.035em] text-emerald-50 sm:text-base lg:text-lg">
              Performance Académique
            </p>
          </div>
        </div>
      )}

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
        ) : videoLoadState === "LOADING" || videoLoadState === "BUFFERING" ? (
          <div className="flex flex-col items-center gap-3" role="status">
            <LoaderCircle className="h-10 w-10 animate-spin text-emerald-300" />
            <p className="text-xs font-bold text-white">
              {videoLoadState === "BUFFERING" ? "Mise en mémoire tampon…" : "Chargement de la vidéo…"}
            </p>
          </div>
        ) : !isPlaying ? (
          <div className="flex flex-col items-center gap-3">
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

        <div className="course-video-progress flex min-w-0 flex-1 items-center">
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

        <label className="course-video-speed flex shrink-0 items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-300">
          <span className="course-video-speed-label">Vitesse</span>
          <select
            value={playbackRate}
            onChange={handlePlaybackRateChange}
            aria-label="Vitesse de lecture"
            className={`course-video-speed-select h-8 cursor-pointer rounded-lg border border-slate-700 bg-slate-900 px-2 font-mono text-[11px] text-white outline-none focus:ring-2 ${controlFocusClass}`}
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
          className={`shrink-0 cursor-pointer rounded-lg p-1.5 transition-colors hover:text-slate-300 focus:outline-none focus:ring-2 ${controlFocusClass}`}
          title="Plein écran"
        >
          <Maximize className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
