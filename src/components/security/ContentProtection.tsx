import React, { useEffect, useState, useCallback, useRef } from "react";
import { ShieldAlert } from "lucide-react";

/**
 * Global Audio Lockdown State
 * When true, strict prototype descriptors and hardware guards forbid ANY script,
 * console command, extension, or audio context from enabling or unmuting sound.
 */
let isAudioLockdownActive = false;

export function setGlobalAudioLockdown(active: boolean) {
  isAudioLockdownActive = active;
  if (active && typeof document !== "undefined") {
    try {
      document.querySelectorAll("video, audio").forEach((el) => {
        const m = el as HTMLMediaElement;
        m.muted = true;
        m.volume = 0;
        try {
          m.pause();
        } catch {}
      });
    } catch {}
  }
}

/**
 * Synchronous Instant Hardware Blanking CSS Injection
 * Injected once at document load so that toggling 'pa-shield-active' on html/body
 * blanks all video frames, canvases, PDFs, images and displays the black shield in 0 ms (bypassing React re-render lag).
 */
if (typeof document !== "undefined") {
  const styleId = "pa-instant-shield-styles";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      html.pa-shield-active video,
      body.pa-shield-active video,
      html.pa-shield-active canvas,
      body.pa-shield-active canvas,
      html.pa-shield-active iframe,
      body.pa-shield-active iframe,
      html.pa-shield-active .react-pdf__Page,
      body.pa-shield-active .react-pdf__Page,
      html.pa-shield-active .react-pdf__Document,
      body.pa-shield-active .react-pdf__Document,
      html.pa-shield-active [data-page-number],
      body.pa-shield-active [data-page-number],
      html.pa-shield-active .textLayer,
      body.pa-shield-active .textLayer,
      html.pa-shield-active .annotationLayer,
      body.pa-shield-active .annotationLayer,
      html.pa-shield-active .unioffice-reading-stage,
      body.pa-shield-active .unioffice-reading-stage,
      html.pa-shield-active .unioffice-content-area,
      body.pa-shield-active .unioffice-content-area,
      html.pa-shield-active .unioffice-page-card,
      body.pa-shield-active .unioffice-page-card,
      html.pa-shield-active img,
      body.pa-shield-active img {
        visibility: hidden !important;
        opacity: 0 !important;
        filter: brightness(0) contrast(0) !important;
        background: #000000 !important;
        color: transparent !important;
        transition: none !important;
      }
      html.pa-shield-active .pa-anti-capture-shield,
      body.pa-shield-active .pa-anti-capture-shield {
        display: flex !important;
        opacity: 1 !important;
        visibility: visible !important;
        z-index: 50 !important;
        background-color: #000000 !important;
        transition: none !important;
      }
      @media print {
        html, body, #root, * {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          background: #000000 !important;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

/**
 * Airtight Prototype Lockdown:
 * Hijacks HTMLMediaElement.prototype.muted & volume so that when lockdown is active,
 * setting muted=false or volume>0 is STRICTLY REJECTED and forced to muted=true, volume=0.
 * Configurable=false ensures no third-party script or extension can delete or overwrite our locks.
 */
if (typeof window !== "undefined") {
  try {
    if (typeof HTMLMediaElement !== "undefined") {
      const proto = HTMLMediaElement.prototype as any;
      const origMutedDesc = Object.getOwnPropertyDescriptor(proto, "muted");
      const origVolumeDesc = Object.getOwnPropertyDescriptor(proto, "volume");

      if (origMutedDesc && origVolumeDesc) {
        Object.defineProperty(proto, "muted", {
          get() {
            if (isAudioLockdownActive) return true;
            return origMutedDesc.get ? origMutedDesc.get.call(this) : true;
          },
          set(val: boolean) {
            if (isAudioLockdownActive) {
              // FORBIDDEN: Strictly reject any script trying to unmute!
              origMutedDesc.set?.call(this, true);
              return;
            }
            origMutedDesc.set?.call(this, val);
          },
          configurable: false,
          enumerable: true,
        });

        Object.defineProperty(proto, "volume", {
          get() {
            if (isAudioLockdownActive) return 0;
            return origVolumeDesc.get ? origVolumeDesc.get.call(this) : 0;
          },
          set(val: number) {
            if (isAudioLockdownActive) {
              // FORBIDDEN: Strictly reject any script trying to set audible volume!
              origVolumeDesc.set?.call(this, 0);
              return;
            }
            origVolumeDesc.set?.call(this, val);
          },
          configurable: false,
          enumerable: true,
        });
      }

      // Neutralize captureStream & mozCaptureStream (strip all audio tracks and trigger lockdown)
      if (proto.captureStream && !proto._pa_anti_rec) {
        const origCapture = proto.captureStream;
        proto.captureStream = function (...args: any[]) {
          setGlobalAudioLockdown(true);
          triggerSynchronousBlanking();
          try {
            window.dispatchEvent(new CustomEvent("pa-capture-detected", { detail: { type: "captureStream" } }));
          } catch {}
          const stream: MediaStream = origCapture.apply(this, args);
          try {
            stream.getAudioTracks().forEach((track) => {
              track.enabled = false;
              track.stop();
              stream.removeTrack(track);
            });
          } catch {}
          return stream;
        };
        proto._pa_anti_rec = true;
      }
      if (proto.mozCaptureStream && !proto._pa_moz_anti_rec) {
        const origMoz = proto.mozCaptureStream;
        proto.mozCaptureStream = function (...args: any[]) {
          setGlobalAudioLockdown(true);
          triggerSynchronousBlanking();
          try {
            window.dispatchEvent(new CustomEvent("pa-capture-detected", { detail: { type: "mozCaptureStream" } }));
          } catch {}
          const stream: MediaStream = origMoz.apply(this, args);
          try {
            stream.getAudioTracks().forEach((track) => {
              track.enabled = false;
              track.stop();
              stream.removeTrack(track);
            });
          } catch {}
          return stream;
        };
        proto._pa_moz_anti_rec = true;
      }
    }

    // Intercept navigator.mediaDevices.getDisplayMedia (Screen recording / screen sharing tools)
    if (navigator?.mediaDevices?.getDisplayMedia && !(navigator.mediaDevices as any)._pa_display_anti_rec) {
      const origGetDisplayMedia = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getDisplayMedia = async function (constraints?: DisplayMediaStreamOptions) {
        setGlobalAudioLockdown(true);
        triggerSynchronousBlanking();
        try {
          window.dispatchEvent(new CustomEvent("pa-capture-detected", { detail: { type: "getDisplayMedia" } }));
        } catch {}

        const safeConstraints: DisplayMediaStreamOptions = {
          ...constraints,
          audio: false,
        };
        const stream = await origGetDisplayMedia(safeConstraints);
        try {
          stream.getAudioTracks().forEach((track) => {
            track.enabled = false;
            track.stop();
            stream.removeTrack(track);
          });
        } catch {}
        return stream;
      };
      (navigator.mediaDevices as any)._pa_display_anti_rec = true;
    }

    // Intercept window.MediaRecorder
    if (window.MediaRecorder && !(window.MediaRecorder as any)._pa_recorder_anti_rec) {
      const OrigMediaRecorder = window.MediaRecorder;
      const PatchedRecorder = function (stream: MediaStream, options?: MediaRecorderOptions) {
        setGlobalAudioLockdown(true);
        triggerSynchronousBlanking();
        try {
          window.dispatchEvent(new CustomEvent("pa-capture-detected", { detail: { type: "MediaRecorder" } }));
        } catch {}

        try {
          stream.getAudioTracks().forEach((track) => {
            track.enabled = false;
            track.stop();
            stream.removeTrack(track);
          });
        } catch {}
        return new OrigMediaRecorder(stream, options);
      };
      PatchedRecorder.prototype = OrigMediaRecorder.prototype;
      PatchedRecorder.isTypeSupported = OrigMediaRecorder.isTypeSupported.bind(OrigMediaRecorder);
      (PatchedRecorder as any)._pa_recorder_anti_rec = true;
      (window as any).MediaRecorder = PatchedRecorder;
    }

    // Canvas Protection: Prevent scripts from scraping PDF pages or Images via canvas dump
    if (typeof HTMLCanvasElement !== "undefined" && !(HTMLCanvasElement.prototype as any)._pa_canvas_guarded) {
      const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
      const origToBlob = HTMLCanvasElement.prototype.toBlob;

      HTMLCanvasElement.prototype.toDataURL = function (...args: any[]) {
        if (isAudioLockdownActive || (typeof document !== "undefined" && document.documentElement.classList.contains("pa-shield-active"))) {
          // Return 1x1 black pixel data URI
          return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
        }
        return origToDataURL.apply(this, args);
      };

      HTMLCanvasElement.prototype.toBlob = function (callback: BlobCallback, type?: string, quality?: any) {
        if (isAudioLockdownActive || (typeof document !== "undefined" && document.documentElement.classList.contains("pa-shield-active"))) {
          const emptyBlob = new Blob([], { type: type || "image/png" });
          callback(emptyBlob);
          return;
        }
        return origToBlob.call(this, callback, type, quality);
      };

      (HTMLCanvasElement.prototype as any)._pa_canvas_guarded = true;
    }

    // Intercept Web Audio API (AudioContext.resume) to forbid unauthorized background synthesis
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass && !(AudioContextClass.prototype as any)._pa_audio_ctx_patched) {
      const origResume = AudioContextClass.prototype.resume;
      if (origResume) {
        AudioContextClass.prototype.resume = function (...args: any[]) {
          if (isAudioLockdownActive) {
            return Promise.reject(new DOMException("Audio playback locked by security policy", "NotAllowedError"));
          }
          return origResume.apply(this, args);
        };
      }
      (AudioContextClass.prototype as any)._pa_audio_ctx_patched = true;
    }

    // Intercept Web Speech API (SpeechRecognition / webkitSpeechRecognition) to neutralize in-browser AI voice agents
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      try {
        delete (window as any).SpeechRecognition;
        delete (window as any).webkitSpeechRecognition;
        (window as any).SpeechRecognition = undefined;
        (window as any).webkitSpeechRecognition = undefined;
      } catch {}
    }
  } catch {
    // Graceful fallback
  }
}

export interface WatermarkUserInfo {
  fullName?: string | null;
  email?: string | null;
  id?: string | null;
}

interface SecureWatermarkProps {
  user?: WatermarkUserInfo | null;
  customLabel?: string;
  className?: string;
}

export const SecureWatermark: React.FC<SecureWatermarkProps> = () => {
  return null;
};

interface UseContentProtectionOptions {
  enabled?: boolean;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  onCaptureAttempt?: () => void;
  blockKeyboardWhilePlaying?: boolean;
}

/**
 * Known Device Brand and Platform Intelligence
 * Identifies Apple (iPhone/iPad/Mac), Samsung (Galaxy phone/tab), Xiaomi/Redmi,
 * Infinix/Tecno, HP, MSI, and generic PC platforms to activate targeted capture protections.
 */
export function getClientDeviceProfile() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      brand: "desktop_pc",
      isApple: false,
      isSamsung: false,
      isXiaomiRedmi: false,
      isInfinix: false,
      isHpOrMsi: false,
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      hasTouch: false,
    };
  }

  const ua = (navigator.userAgent || "").toLowerCase();
  const platform = (navigator.platform || "").toLowerCase();
  const vendor = (navigator.vendor || "").toLowerCase();
  const maxTouchPoints = navigator.maxTouchPoints || 0;

  const isApple = /iphone|ipad|ipod|macintosh|mac os x/.test(ua) || /apple/.test(vendor) || (platform === "macintel" && maxTouchPoints > 1);
  const isSamsung = /samsung|sm-[a-z0-9]+|sec-[a-z0-9]+/i.test(ua);
  const isXiaomiRedmi = /xiaomi|redmi|poco|miui|hyperos/i.test(ua);
  const isInfinix = /infinix|tecno|transsion|xos|hios/i.test(ua);
  const isHpOrMsi = /hp|hewlett-packard|msi|micro-star/i.test(ua);
  const isWindows = /windows|win32|win64/.test(ua) || /win/.test(platform);

  const isTablet = /ipad|tablet|(android(?!.*mobile))/.test(ua) || (platform === "macintel" && maxTouchPoints > 1);
  const isMobile = (/mobile|iphone|ipod|android/.test(ua) && !isTablet) || (maxTouchPoints > 0 && window.innerWidth <= 768);
  const isDesktop = !isMobile && !isTablet;

  return {
    isApple,
    isSamsung,
    isXiaomiRedmi,
    isInfinix,
    isHpOrMsi,
    isWindows,
    isMobile,
    isTablet,
    isDesktop,
    hasTouch: maxTouchPoints > 0,
  };
}

/**
 * Checks whether an internal application modal, drawer, or dialog is currently open.
 * When open, user interactions (typing, clicking, pressing Esc, focus changes) are legitimate
 * in-app actions and MUST NEVER trigger false positive anti-capture shields.
 */
export function isInternalModalOpen(): boolean {
  if (typeof document === "undefined") return false;
  return Boolean(
    document.querySelector('[role="dialog"]') ||
    document.querySelector('[aria-modal="true"]') ||
    document.querySelector('[data-internal-modal="true"]') ||
    document.querySelector('.user-profile-modal') ||
    document.querySelector('.module-plan-drawer') ||
    document.body.classList.contains("modal-open")
  );
}

/**
 * Synchronous Zero-Latency Blanking Helper:
 * Immediately toggles CSS classes on documentElement/body, blanks all video tags,
 * canvases (PDF), iframes, images, and displays all shield overlays synchronously in 0ms
 * BEFORE the operating system, device recorder, or capture tool can take the screenshot!
 */
function triggerSynchronousBlanking() {
  if (typeof document === "undefined") return;
  try {
    document.documentElement.classList.add("pa-shield-active");
    document.body.classList.add("pa-shield-active");

    // Instantly blank all videos
    document.querySelectorAll("video").forEach((v) => {
      const htmlV = v as HTMLVideoElement;
      htmlV.style.setProperty("visibility", "hidden", "important");
      htmlV.style.setProperty("opacity", "0", "important");
      htmlV.style.setProperty("filter", "brightness(0)", "important");
      htmlV.muted = true;
      htmlV.volume = 0;
      try {
        htmlV.pause();
      } catch {}
    });

    // Instantly blank all canvases (PDF rendering surface)
    document.querySelectorAll("canvas").forEach((c) => {
      const htmlC = c as HTMLCanvasElement;
      htmlC.style.setProperty("visibility", "hidden", "important");
      htmlC.style.setProperty("opacity", "0", "important");
      htmlC.style.setProperty("filter", "brightness(0)", "important");
      htmlC.style.setProperty("background", "#000000", "important");
    });

    // Instantly blank all PDF pages, text layers, and images
    document.querySelectorAll(
      ".react-pdf__Page, .react-pdf__Document, [data-page-number], .textLayer, .annotationLayer, .unioffice-reading-stage, .unioffice-content-area, .unioffice-page-card, iframe, img"
    ).forEach((el) => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.setProperty("visibility", "hidden", "important");
      htmlEl.style.setProperty("opacity", "0", "important");
      htmlEl.style.setProperty("filter", "brightness(0)", "important");
    });

    // Instantly display all shield overlays inside player containers
    document.querySelectorAll(".pa-anti-capture-shield").forEach((el) => {
      const s = el as HTMLElement;
      s.style.setProperty("display", "flex", "important");
      s.style.setProperty("opacity", "1", "important");
      s.style.setProperty("visibility", "visible", "important");
      s.style.setProperty("z-index", "50", "important");
      s.style.setProperty("background-color", "#000000", "important");
    });

    // Force synchronous layout & compositor reflow immediately in 0ms
    void document.documentElement.offsetHeight;
  } catch {}
}

function restoreSynchronousBlanking() {
  if (typeof document === "undefined") return;
  try {
    document.documentElement.classList.remove("pa-shield-active");
    document.body.classList.remove("pa-shield-active");

    document.querySelectorAll(".pa-anti-capture-shield").forEach((el) => {
      const s = el as HTMLElement;
      s.style.removeProperty("display");
      s.style.removeProperty("opacity");
      s.style.removeProperty("visibility");
      s.style.removeProperty("z-index");
      s.style.removeProperty("background-color");
      s.style.display = "none";
    });

    document.querySelectorAll("video").forEach((v) => {
      const htmlV = v as HTMLVideoElement;
      htmlV.style.removeProperty("visibility");
      htmlV.style.removeProperty("opacity");
      htmlV.style.removeProperty("filter");
    });

    document.querySelectorAll("canvas").forEach((c) => {
      const htmlC = c as HTMLCanvasElement;
      htmlC.style.removeProperty("visibility");
      htmlC.style.removeProperty("opacity");
      htmlC.style.removeProperty("filter");
      htmlC.style.removeProperty("background");
    });

    document.querySelectorAll(
      ".react-pdf__Page, .react-pdf__Document, [data-page-number], .textLayer, .annotationLayer, .unioffice-reading-stage, .unioffice-content-area, .unioffice-page-card, iframe, img"
    ).forEach((el) => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.removeProperty("visibility");
      htmlEl.style.removeProperty("opacity");
      htmlEl.style.removeProperty("filter");
    });

    void document.documentElement.offsetHeight;
  } catch {}
}

/**
 * Hook to detect screen capture, window blur, DevTools, PrintScreen attempts,
 * and keyboard interactions while video playback is in progress.
 * Blanks the screen SYNCHRONOUSLY at 0ms latency to beat OS screenshot tools,
 * while maintaining an airtight prototype lockdown against audio leaks.
 */
export function useContentProtection({
  enabled = true,
  videoRef,
  onCaptureAttempt,
  blockKeyboardWhilePlaying = true,
}: UseContentProtectionOptions = {}) {
  const [shieldActive, setShieldActive] = useState<boolean>(false);
  const shieldActiveRef = useRef<boolean>(false);
  const wasPlayingRef = useRef<boolean>(false);
  const wasMutedBeforeShieldRef = useRef<boolean>(false);
  const savedVolumeBeforeShieldRef = useRef<number>(1);

  const silenceAudioCompletely = useCallback(() => {
    setGlobalAudioLockdown(true);
    const activeVideo = videoRef?.current || (typeof document !== "undefined" ? document.querySelector("video") : null);
    if (activeVideo) {
      if (!shieldActiveRef.current) {
        wasMutedBeforeShieldRef.current = activeVideo.muted;
        savedVolumeBeforeShieldRef.current = activeVideo.volume > 0 ? activeVideo.volume : 0.8;
      }
      activeVideo.muted = true;
      activeVideo.volume = 0;
      try {
        activeVideo.pause();
      } catch {}
    }
    if (typeof document !== "undefined") {
      document.querySelectorAll("video, audio").forEach((el) => {
        try {
          const media = el as HTMLMediaElement;
          media.muted = true;
          media.volume = 0;
          media.pause();
        } catch {}
      });
    }
  }, [videoRef]);

  const activateShield = useCallback(() => {
    if (!enabled) return;

    // 1. Synchronous Instant 0ms Blanking: beats OS capture tools before React re-render
    triggerSynchronousBlanking();

    shieldActiveRef.current = true;
    setShieldActive(true);

    const activeVideo = videoRef?.current || (typeof document !== "undefined" ? document.querySelector("video") : null);
    if (activeVideo && !activeVideo.paused && !activeVideo.ended) {
      wasPlayingRef.current = true;
    }
    silenceAudioCompletely();
    onCaptureAttempt?.();
  }, [enabled, videoRef, onCaptureAttempt, silenceAudioCompletely]);

  const dismissShield = useCallback(() => {
    shieldActiveRef.current = false;
    setShieldActive(false);
    setGlobalAudioLockdown(false);

    // Restore DOM elements synchronously
    restoreSynchronousBlanking();

    const activeVideo = videoRef?.current || (typeof document !== "undefined" ? document.querySelector("video") : null);

    if (activeVideo && !wasMutedBeforeShieldRef.current) {
      activeVideo.muted = false;
      activeVideo.volume = savedVolumeBeforeShieldRef.current || 0.8;
    }

    if (wasPlayingRef.current) {
      wasPlayingRef.current = false;
      if (activeVideo && activeVideo.paused) {
        try {
          const playPromise = activeVideo.play();
          if (playPromise !== undefined) {
            playPromise.catch(() => {});
          }
        } catch {}
      }
    }
  }, [videoRef]);

  useEffect(() => {
    // Reset shield state on mount so fresh views are never blocked
    shieldActiveRef.current = false;
    setShieldActive(false);
    restoreSynchronousBlanking();
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const activeVideo = videoRef?.current || (typeof document !== "undefined" ? document.querySelector("video") : null);

    // Continuous audio and visibility guard (runs every 100ms):
    // Monitors tab visibility and blocks script audio tampering without false positive on initial load
    const sentinelInterval = window.setInterval(() => {
      if (shieldActiveRef.current || isAudioLockdownActive) {
        silenceAudioCompletely();
      }

      if (typeof document !== "undefined") {
        const isHidden = document.hidden || document.visibilityState === "hidden";
        const currentVideo = videoRef?.current || (typeof document !== "undefined" ? document.querySelector("video") : null);
        const isVideoPlaying = Boolean(currentVideo && !currentVideo.paused && !currentVideo.ended && currentVideo.currentTime > 0);

        // Only trigger during active playback; never block on initial load or while browsing
        if (isHidden && isVideoPlaying && !shieldActiveRef.current && !isInternalModalOpen()) {
          triggerSynchronousBlanking();
          activateShield();
          clearSystemClipboard();
        }
      }
    }, 100);

    const handleDisallowedAudio = () => {
      if (shieldActiveRef.current || isAudioLockdownActive) {
        silenceAudioCompletely();
        return;
      }
      if (isInternalModalOpen()) return;

      // If video was playing and its volume was unexpectedly muted or ducked by an external voice assistant (Bixby / Siri / Google Assistant)
      const currentVideo = videoRef?.current || (typeof document !== "undefined" ? document.querySelector("video") : null);
      if (currentVideo && !currentVideo.paused && !currentVideo.ended && currentVideo.currentTime > 0.5) {
        if (currentVideo.muted || currentVideo.volume === 0) {
          triggerSynchronousBlanking();
          activateShield();
          clearSystemClipboard();
        }
      }
    };

    if (activeVideo) {
      activeVideo.addEventListener("volumechange", handleDisallowedAudio);
      activeVideo.addEventListener("play", handleDisallowedAudio);
      activeVideo.addEventListener("playing", handleDisallowedAudio);
    }

    const clearSystemClipboard = () => {
      // Safely clear text selections without triggering intrusive browser clipboard permission prompts
      try {
        if (typeof window !== "undefined" && window.getSelection) {
          window.getSelection()?.removeAllRanges();
        }
      } catch {}
    };

    // 1. Detect cursor leaving the window entirely when video is playing
    const handleMouseLeave = (e: MouseEvent) => {
      if (isInternalModalOpen()) return;
      const currentVideo = videoRef?.current || (typeof document !== "undefined" ? document.querySelector("video") : null);
      const isVideoPlaying = Boolean(currentVideo && !currentVideo.paused && !currentVideo.ended && currentVideo.currentTime > 0);
      if (isVideoPlaying) {
        if (
          (e.clientY <= 0 || e.clientX <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) &&
          !e.relatedTarget
        ) {
          activateShield();
          clearSystemClipboard();
        }
      }
    };

    // 2. Mobile & Tablet Gesture Detection (Xiaomi / Redmi, Infinix / Tecno, Samsung, Apple iOS)
    // 3 or more touch points = screenshot gesture on Redmi, Xiaomi, Infinix, Oppo, Realme, iPad.
    // 2 fingers pinch-to-zoom is strictly preserved for smooth video & document zooming.
    const handleTouchStart = (e: TouchEvent) => {
      if (shieldActiveRef.current || isInternalModalOpen()) return;

      const currentVideo = videoRef?.current || (typeof document !== "undefined" ? document.querySelector("video") : null);
      const isVideoPlaying = Boolean(currentVideo && !currentVideo.paused && !currentVideo.ended && currentVideo.currentTime > 0);
      // Strictly disabled when video is not actively playing: prevents any false positive while browsing or clicking buttons
      if (!isVideoPlaying) return;

      // Don't intercept touches on interactive elements (buttons, inputs, links, dialogs, drawers)
      const target = e.target as HTMLElement | null;
      if (target && target.closest("button, a, input, select, textarea, [role='dialog'], [data-internal-modal='true']")) {
        return;
      }

      // Multi-finger screenshot gesture (Xiaomi 3-finger swipe down, Infinix 3-finger slide down, etc.)
      if (e.touches && e.touches.length >= 3) {
        try {
          e.preventDefault();
          e.stopPropagation();
        } catch {}
        activateShield();
        clearSystemClipboard();
        return;
      }

      // Samsung Palm Swipe screenshot detection:
      // A full palm edge has a massive surface area (rx > 35 || ry > 35) and total contact area > 4500px,
      // completely distinct from a standard thumb press.
      for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches[i];
        const rx = (t as any).radiusX || 0;
        const ry = (t as any).radiusY || 0;
        if ((rx > 35 || ry > 35) && (rx * ry > 4500)) {
          try {
            e.preventDefault();
            e.stopPropagation();
          } catch {}
          activateShield();
          clearSystemClipboard();
          return;
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (shieldActiveRef.current || isInternalModalOpen()) return;
      const currentVideo = videoRef?.current || (typeof document !== "undefined" ? document.querySelector("video") : null);
      const isVideoPlaying = Boolean(currentVideo && !currentVideo.paused && !currentVideo.ended && currentVideo.currentTime > 0);
      if (!isVideoPlaying) return;

      const target = e.target as HTMLElement | null;
      if (target && target.closest("button, a, input, select, textarea, [role='dialog'], [data-internal-modal='true']")) {
        return;
      }

      if (e.touches && e.touches.length >= 3) {
        try {
          e.preventDefault();
          e.stopPropagation();
        } catch {}
        activateShield();
        clearSystemClipboard();
      }
    };

    // 3. Detect keyboard actions & hardware capture hotkeys
    // Covers PC brands (HP, MSI, Dell, Lenovo, Asus, Apple Mac) and gaming overlays (NVIDIA Shadowplay, AMD Adrenalin, Xbox Game Bar)
    // Runs in CAPTURE phase (useCapture: true) to intercept downstroke before any other handler
    const handleKeyDown = (e: KeyboardEvent) => {
      if (shieldActiveRef.current) return;
      if (isInternalModalOpen()) return;

      const target = e.target as HTMLElement | null;
      const isElement = target && typeof (target as any).getAttribute === "function";
      const isInput =
        Boolean(
          isElement &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable ||
            target.getAttribute("contenteditable") === "true")
        );
      if (isInput) return;

      const currentVideo = videoRef?.current || (typeof document !== "undefined" ? document.querySelector("video") : null);
      const isVideoPlaying = Boolean(currentVideo && !currentVideo.paused && !currentVideo.ended && currentVideo.readyState > 1 && currentVideo.currentTime > 0);

      // Allow player shortcuts (Space, Arrow keys, etc.) without false positive
      const isPlayerShortcut =
        ["Space", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "KeyM", "KeyF", "Escape"].includes(e.code) ||
        [" ", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "m", "M", "f", "F", "p", "P", "Escape"].includes(e.key);

      if (blockKeyboardWhilePlaying && isVideoPlaying && !isPlayerShortcut) {
        e.preventDefault();
        e.stopPropagation();
        activateShield();
        clearSystemClipboard();
        return;
      }

      // Windows key (Meta) - Physical trigger on downstroke before Win+Shift+S, Win+G, Win+Alt+R can execute
      if (e.key === "Meta" || e.key === "OS" || e.key === "Windows" || e.keyCode === 91 || e.keyCode === 92) {
        activateShield();
        clearSystemClipboard();
        return;
      }

      // PrintScreen key (standard, HP, MSI, Dell, Lenovo keyboards)
      if (e.key === "PrintScreen" || e.key === "Snapshot" || e.keyCode === 44) {
        e.preventDefault();
        activateShield();
        clearSystemClipboard();
        return;
      }

      // Windows Snipping Tool (Win + Shift + S or Ctrl + Shift + S)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        activateShield();
        clearSystemClipboard();
        return;
      }

      // Windows Xbox Game Bar Recording (Win + Alt + R, Win + Alt + G, Win + Alt + PrtScn)
      if ((e.metaKey || e.ctrlKey) && e.altKey && (e.key === "r" || e.key === "R" || e.key === "g" || e.key === "G" || e.key === "PrintScreen" || e.keyCode === 44)) {
        e.preventDefault();
        activateShield();
        clearSystemClipboard();
        return;
      }

      // NVIDIA GeForce Experience / Shadowplay (Common on MSI, Asus, HP gaming PCs):
      // Alt + Z (Overlay), Alt + F9 (Record), Alt + F10 (Instant Replay), Alt + F1 (Screenshot)
      if (e.altKey && (e.key === "z" || e.key === "Z" || e.key === "F9" || e.key === "F10" || e.key === "F1" || e.keyCode === 120 || e.keyCode === 121 || e.keyCode === 112)) {
        e.preventDefault();
        activateShield();
        clearSystemClipboard();
        return;
      }

      // AMD Radeon Software / Adrenalin (HP, MSI, Dell AMD PCs):
      // Alt + R (Overlay), Ctrl + Shift + E (Record)
      if ((e.altKey && (e.key === "r" || e.key === "R")) || ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "e" || e.key === "E"))) {
        e.preventDefault();
        activateShield();
        clearSystemClipboard();
        return;
      }

      // Universal OBS & Streamlabs Recording shortcuts (F9, F10, Ctrl + Shift + R)
      if (e.key === "F9" || e.key === "F10" || ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "r" || e.key === "R"))) {
        e.preventDefault();
        activateShield();
        clearSystemClipboard();
        return;
      }

      // Apple Mac screenshot combos (Cmd + Shift + 3, Cmd + Shift + 4, Cmd + Shift + 5, Cmd + Shift + 6)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && ["3", "4", "5", "6"].includes(e.key)) {
        e.preventDefault();
        activateShield();
        clearSystemClipboard();
        return;
      }

      // Alt + PrintScreen
      if (e.altKey && (e.key === "PrintScreen" || e.key === "Snapshot" || e.keyCode === 44)) {
        e.preventDefault();
        activateShield();
        clearSystemClipboard();
        return;
      }

      // Ctrl + P / Cmd + P (Print / Save as PDF)
      if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        activateShield();
        return;
      }

      // Ctrl + S / Cmd + S (Save webpage)
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        return;
      }

      // Ctrl + U / Cmd + U (View source)
      if ((e.ctrlKey || e.metaKey) && (e.key === "u" || e.key === "U")) {
        e.preventDefault();
        return;
      }

      // Ctrl + Shift + I / F12 / DevTools
      if (
        e.key === "F12" ||
        ((e.ctrlKey || e.metaKey) &&
          e.shiftKey &&
          (e.key === "i" || e.key === "I" || e.key === "c" || e.key === "C" || e.key === "j" || e.key === "J"))
      ) {
        activateShield();
        clearSystemClipboard();
        return;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen" || e.key === "Snapshot" || e.keyCode === 44 || e.key === "Meta" || e.keyCode === 91 || e.keyCode === 92) {
        activateShield();
        clearSystemClipboard();
      }
    };

    // 4. Detect window blur & tab switch (switched tabs, multitasking, minimized)
    // Only active during active video playback to never disrupt normal course browsing
    const handleWindowBlur = (_e?: Event) => {
      if (isInternalModalOpen()) return;
      if (typeof document !== "undefined" && document.hasFocus && document.hasFocus()) return;

      const currentVideo = videoRef?.current || (typeof document !== "undefined" ? document.querySelector("video") : null);
      const isVideoPlaying = Boolean(currentVideo && !currentVideo.paused && !currentVideo.ended && currentVideo.currentTime > 0);
      if (!isVideoPlaying) return;

      if (document.hidden || document.visibilityState === "hidden") {
        triggerSynchronousBlanking();
        activateShield();
        clearSystemClipboard();
      }
    };

    // 5. Detect tab visibility change (switched tabs, minimized, notification drawer pulled down)
    const handleVisibilityChange = () => {
      if (isInternalModalOpen()) return;
      const currentVideo = videoRef?.current || (typeof document !== "undefined" ? document.querySelector("video") : null);
      const isVideoPlaying = Boolean(currentVideo && !currentVideo.paused && !currentVideo.ended && currentVideo.currentTime > 0);

      if (document.hidden || document.visibilityState === "hidden") {
        if (isVideoPlaying) {
          activateShield();
          clearSystemClipboard();
        }
      }
    };

    // 6. Mobile OS Lifecycle events (Apple iOS Safari hardware screenshot, Android system screenshot)
    const handlePageHide = () => {
      const currentVideo = videoRef?.current || (typeof document !== "undefined" ? document.querySelector("video") : null);
      const isVideoPlaying = Boolean(currentVideo && !currentVideo.paused && !currentVideo.ended && currentVideo.currentTime > 0);
      if (isVideoPlaying) {
        activateShield();
        clearSystemClipboard();
      }
    };

    const handleFreeze = () => {
      const currentVideo = videoRef?.current || (typeof document !== "undefined" ? document.querySelector("video") : null);
      const isVideoPlaying = Boolean(currentVideo && !currentVideo.paused && !currentVideo.ended && currentVideo.currentTime > 0);
      if (isVideoPlaying) {
        activateShield();
        clearSystemClipboard();
      }
    };

    // 7. Detect beforeprint (printing via any method)
    const handleBeforePrint = () => {
      activateShield();
    };

    // 8. Capture custom event triggered by getDisplayMedia, MediaRecorder, captureStream
    const handleCustomCapture = () => {
      activateShield();
      clearSystemClipboard();
    };

    // 9. Intercept clipboard copy when shield is active
    const handleCopy = (e: ClipboardEvent) => {
      if (shieldActiveRef.current) {
        e.preventDefault();
        try {
          e.clipboardData?.setData("text/plain", "");
        } catch {}
        clearSystemClipboard();
      }
    };

    document.addEventListener("mouseleave", handleMouseLeave, true);
    window.addEventListener("touchstart", handleTouchStart, { capture: true, passive: false });
    window.addEventListener("touchmove", handleTouchMove, { capture: true, passive: false });
    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keyup", handleKeyUp, true);
    window.addEventListener("blur", handleWindowBlur, false);
    document.addEventListener("visibilitychange", handleVisibilityChange, false);
    window.addEventListener("pagehide", handlePageHide, true);
    document.addEventListener("freeze", handleFreeze, true);
    window.addEventListener("beforeprint", handleBeforePrint, false);
    window.addEventListener("pa-capture-detected", handleCustomCapture);
    window.addEventListener("copy", handleCopy, true);

    return () => {
      window.clearInterval(sentinelInterval);
      if (activeVideo) {
        activeVideo.removeEventListener("volumechange", handleDisallowedAudio);
        activeVideo.removeEventListener("play", handleDisallowedAudio);
        activeVideo.removeEventListener("playing", handleDisallowedAudio);
      }
      document.removeEventListener("mouseleave", handleMouseLeave, true);
      window.removeEventListener("touchstart", handleTouchStart, true);
      window.removeEventListener("touchmove", handleTouchMove, true);
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keyup", handleKeyUp, true);
      window.removeEventListener("blur", handleWindowBlur, false);
      document.removeEventListener("visibilitychange", handleVisibilityChange, false);
      window.removeEventListener("pagehide", handlePageHide, true);
      document.removeEventListener("freeze", handleFreeze, true);
      window.removeEventListener("beforeprint", handleBeforePrint, false);
      window.removeEventListener("pa-capture-detected", handleCustomCapture);
      window.removeEventListener("copy", handleCopy, true);
    };
  }, [enabled, activateShield, silenceAudioCompletely, blockKeyboardWhilePlaying, videoRef]);

  return {
    shieldActive,
    activateShield,
    dismissShield,
  };
}

interface AntiCaptureShieldProps {
  active: boolean;
  onDismiss: () => void;
  className?: string;
  contentType?: "video" | "pdf" | "image" | "document";
  description?: string;
  buttonText?: string;
}

/**
 * Pitch-black screen overlay that covers the video or document when recording / capture is detected.
 * Always kept in the DOM so that triggering it has ZERO latency (no mount delay, no transition lag).
 */
export const AntiCaptureShield: React.FC<AntiCaptureShieldProps> = ({
  active,
  onDismiss,
  className = "",
  contentType = "video",
  description: customDescription,
  buttonText: customButtonText,
}) => {
  const isDoc = contentType === "pdf" || contentType === "document";
  const isImage = contentType === "image";

  const resolvedDescription = customDescription || (
    isDoc
      ? "L'affichage du document est automatiquement masqué lors de l'utilisation d'outils de capture d'écran, de raccourcis clavier ou lorsque la fenêtre n'est plus active."
      : isImage
      ? "L'affichage de l'image est automatiquement masqué lors de l'utilisation d'outils de capture d'écran, de raccourcis clavier ou lorsque la fenêtre n'est plus active."
      : "L'affichage et le son de la ressource sont automatiquement masqués et coupés lors de l'utilisation du clavier pendant la lecture, d'outils de capture d'écran ou lorsque la fenêtre n'est plus active."
  );

  const resolvedButtonText = customButtonText || (
    isImage ? "Reprendre l'affichage" : "Reprendre la lecture"
  );

  return (
    <div
      className={`pa-anti-capture-shield absolute inset-0 z-50 flex flex-col items-center justify-center bg-black text-center p-3 sm:p-6 overflow-y-auto max-h-full select-none ${className}`}
      style={{
        display: active ? "flex" : "none",
        opacity: active ? 1 : 0,
        visibility: active ? "visible" : "hidden",
        transition: "none",
        backgroundColor: "#000000",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="w-9 h-9 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-1.5 sm:mb-4 text-emerald-400 shadow-xl shadow-emerald-950/60 animate-pulse shrink-0">
        <ShieldAlert className="w-5 h-5 sm:w-9 sm:h-9 text-emerald-400" />
      </div>

      <h4 className="text-xs sm:text-base md:text-lg font-black text-white mb-1 sm:mb-2 tracking-tight">
        Contenu protégé contre l&apos;enregistrement
      </h4>

      <p className="text-[11px] sm:text-xs md:text-sm text-slate-300 max-w-md mb-2.5 sm:mb-5 leading-snug sm:leading-relaxed px-2">
        {resolvedDescription}
      </p>

      <button
        type="button"
        onClick={onDismiss}
        className="px-4 py-1.5 sm:px-6 sm:py-3 rounded-lg sm:rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] sm:text-xs uppercase tracking-wider shadow-lg shadow-emerald-950/60 transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
      >
        {resolvedButtonText}
      </button>
    </div>
  );
};
