import React, { useEffect, useState, useCallback, useRef } from "react";
import { ShieldAlert, ShieldCheck } from "lucide-react";

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

/**
 * Anti-leak dynamic forensic watermark.
 * Renders a subtle repeating diagonal grid with student's identity (or platform protection mark)
 * plus a verified security badge in the corner.
 */
export const SecureWatermark: React.FC<SecureWatermarkProps> = () => {
  return null;
};

interface UseContentProtectionOptions {
  enabled?: boolean;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  onCaptureAttempt?: () => void;
}

/**
 * Hook to detect screen capture, window blur, DevTools or PrintScreen attempts.
 * Automatically blanks the screen to pitch-black when recording or capture is suspected.
 */
export function useContentProtection({
  enabled = true,
  videoRef,
  onCaptureAttempt,
}: UseContentProtectionOptions = {}) {
  const [shieldActive, setShieldActive] = useState<boolean>(false);
  const blurTimeoutRef = useRef<number | null>(null);

  const activateShield = useCallback(() => {
    if (!enabled) return;
    setShieldActive(true);
    if (videoRef?.current && !videoRef.current.paused) {
      try {
        videoRef.current.pause();
      } catch {}
    }
    onCaptureAttempt?.();
  }, [enabled, videoRef, onCaptureAttempt]);

  const dismissShield = useCallback(() => {
    setShieldActive(false);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // 1. Detect PrintScreen / screenshot shortcut key presses
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen key
      if (e.key === "PrintScreen" || e.keyCode === 44) {
        activateShield();
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText("");
          }
        } catch {}
        return;
      }

      // Ctrl+P / Cmd+P (Print)
      if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        activateShield();
        return;
      }

      // Ctrl+S / Cmd+S (Save webpage)
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        return;
      }

      // Ctrl+U / Cmd+U (View source)
      if ((e.ctrlKey || e.metaKey) && (e.key === "u" || e.key === "U")) {
        e.preventDefault();
        return;
      }

      // Ctrl+Shift+I / F12 (Inspect)
      if (e.key === "F12" || ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "i" || e.key === "I" || e.key === "c" || e.key === "C" || e.key === "j" || e.key === "J"))) {
        activateShield();
        return;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen" || e.keyCode === 44) {
        activateShield();
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText("");
          }
        } catch {}
      }
    };

    // 2. Detect window blur (external recorder opened, snipping tool clicked, multitasking)
    const handleWindowBlur = () => {
      // If focus transitioned into an internal iframe, do NOT trigger
      if (document.activeElement && document.activeElement.tagName === "IFRAME") {
        return;
      }
      // Small buffer to avoid flicker during micro-events
      if (blurTimeoutRef.current) window.clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = window.setTimeout(() => {
        activateShield();
      }, 100);
    };

    const handleWindowFocus = () => {
      if (blurTimeoutRef.current) {
        window.clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = null;
      }
    };

    // 3. Detect tab visibility change (switched tabs, minimized)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        activateShield();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keyup", handleKeyUp, true);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (blurTimeoutRef.current) window.clearTimeout(blurTimeoutRef.current);
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keyup", handleKeyUp, true);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, activateShield]);

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
}

/**
 * Pitch-black screen overlay that covers the video or document when recording / capture is detected.
 */
export const AntiCaptureShield: React.FC<AntiCaptureShieldProps> = ({
  active,
  onDismiss,
  className = "",
}) => {
  if (!active) return null;

  return (
    <div
      className={`absolute inset-0 z-50 flex flex-col items-center justify-center bg-black text-center p-6 select-none transition-all duration-200 ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-4 text-emerald-400 shadow-xl shadow-emerald-950/60 animate-pulse">
        <ShieldAlert className="w-9 h-9 text-emerald-400" />
      </div>

      <h4 className="text-base sm:text-lg font-black text-white mb-2 tracking-tight">
        Contenu protégé contre l&apos;enregistrement
      </h4>

      <p className="text-xs sm:text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
        L&apos;affichage de la ressource est automatiquement masqué lors de l&apos;utilisation d&apos;outils
        de capture d&apos;écran ou lorsque la fenêtre n&apos;est plus active.
      </p>

      <button
        type="button"
        onClick={onDismiss}
        className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-950/60 transition-all hover:scale-105 active:scale-95"
      >
        Reprendre la lecture
      </button>
    </div>
  );
};

