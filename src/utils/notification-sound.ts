// Web Audio API notification sound generator (no external audio files required)

const STORAGE_KEY = "perfacademy_sound_enabled";

let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioContext || sharedAudioContext.state === "closed") {
    try {
      sharedAudioContext = new AudioCtx();
    } catch {
      return null;
    }
  }
  if (sharedAudioContext.state === "suspended") {
    sharedAudioContext.resume().catch(() => undefined);
  }
  return sharedAudioContext;
}

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined" || !window.localStorage) return true;
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    return val === null ? true : val === "true";
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? "true" : "false");
  } catch {
    // Ignore storage quota/security errors
  }
}

/**
 * Plays a soft, harmonic notification chime using the browser's Web Audio API.
 * Types:
 * - "message": pleasant ascending double chime (587Hz -> 880Hz)
 * - "alert": warning chime
 * - "success": joyful three-note chime
 */
export function playNotificationSound(kind: "message" | "alert" | "success" = "message"): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);

    if (kind === "message") {
      // First soft chime note
      const osc1 = ctx.createOscillator();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.connect(gainNode);

      // Second higher chime note
      const osc2 = ctx.createOscillator();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(880.0, now + 0.1); // A5
      osc2.connect(gainNode);

      gainNode.gain.setValueAtTime(0.001, now);
      gainNode.gain.exponentialRampToValueAtTime(0.12, now + 0.04);
      gainNode.gain.exponentialRampToValueAtTime(0.04, now + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.15, now + 0.14);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

      osc1.start(now);
      osc1.stop(now + 0.12);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.45);
    } else if (kind === "alert") {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(392, now + 0.12);
      osc.connect(gainNode);

      gainNode.gain.setValueAtTime(0.001, now);
      gainNode.gain.exponentialRampToValueAtTime(0.1, now + 0.03);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      osc.start(now);
      osc.stop(now + 0.35);
    } else {
      // Success chord
      const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        osc.connect(gainNode);
        osc.start(now + idx * 0.06);
        osc.stop(now + 0.4);
      });
      gainNode.gain.setValueAtTime(0.001, now);
      gainNode.gain.exponentialRampToValueAtTime(0.12, now + 0.15);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    }
  } catch (err) {
    // Graceful fallback for strict autoplay policies
    console.debug("[Audio] Unable to play notification tone:", err);
  }
}
