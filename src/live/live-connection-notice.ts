import type { LiveVideoQuality } from "./liveSettings";

export type LiveConnectionLevel = "excellent" | "good" | "poor" | "lost" | "unknown";

const AUTO_QUALITY_LADDER: LiveVideoQuality[] = ["1080p", "720p", "480p", "360p"];
const AUTO_DEFAULT_QUALITY: LiveVideoQuality = "720p";

export function normalizeConnectionQuality(value?: string | number | null): LiveConnectionLevel {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized.includes("excellent")) return "excellent";
  if (normalized.includes("good")) return "good";
  if (normalized.includes("poor")) return "poor";
  if (normalized.includes("lost")) return "lost";
  return "unknown";
}

export function liveVideoQualityLabel(quality: LiveVideoQuality): string {
  switch (quality) {
    case "auto":
      return "Automatique";
    case "1080p":
      return "1080p";
    case "720p":
      return "720p";
    case "480p":
      return "480p";
    case "360p":
      return "360p";
    default:
      return quality;
  }
}

export function connectionLevelRank(level: LiveConnectionLevel): number {
  switch (level) {
    case "excellent":
      return 4;
    case "good":
      return 3;
    case "poor":
      return 2;
    case "lost":
      return 1;
    default:
      return 0;
  }
}

export function buildConnectionChangeNotice(
  previous: LiveConnectionLevel,
  next: LiveConnectionLevel,
): { message: string; variant: "success" | "warning" | "info" } | null {
  if (previous === next) return null;

  if (next === "lost") {
    return {
      variant: "warning",
      message: "Connexion perdue. Nous tentons de stabiliser le flux vidéo.",
    };
  }

  if (next === "poor" && connectionLevelRank(previous) > connectionLevelRank(next)) {
    return {
      variant: "warning",
      message: "Connexion lente détectée. Nous réduisons la qualité vidéo pour garder le live fluide.",
    };
  }

  if (
    (next === "excellent" || next === "good") &&
    (previous === "poor" || previous === "lost" || previous === "unknown")
  ) {
    return {
      variant: "success",
      message:
        next === "excellent"
          ? "Connexion excellente. Nous avons augmenté la qualité vidéo."
          : "Connexion améliorée. Qualité vidéo optimisée.",
    };
  }

  return null;
}

export function buildManualQualityNotice(quality: LiveVideoQuality): { message: string; variant: "info" } {
  if (quality === "auto") {
    return {
      variant: "info",
      message: "Qualité vidéo automatique activée. Ajustement selon votre connexion.",
    };
  }
  return {
    variant: "info",
    message: `Qualité vidéo réglée sur ${liveVideoQualityLabel(quality)}.`,
  };
}

export function buildAdaptiveQualityNotice(
  previous: LiveVideoQuality,
  next: LiveVideoQuality,
): { message: string; variant: "success" | "warning" } | null {
  if (previous === next) return null;
  const prevIndex = AUTO_QUALITY_LADDER.indexOf(previous);
  const nextIndex = AUTO_QUALITY_LADDER.indexOf(next);
  if (prevIndex < 0 || nextIndex < 0) return null;

  if (nextIndex > prevIndex) {
    return {
      variant: "warning",
      message: `Qualité vidéo réduite à ${liveVideoQualityLabel(next)} pour stabiliser la connexion.`,
    };
  }

  return {
    variant: "success",
    message: `Qualité vidéo augmentée à ${liveVideoQualityLabel(next)}.`,
  };
}

export function getAutoDefaultQuality(): LiveVideoQuality {
  return AUTO_DEFAULT_QUALITY;
}

export function stepAdaptiveQuality(current: LiveVideoQuality, direction: "up" | "down" | "min"): LiveVideoQuality {
  const index = AUTO_QUALITY_LADDER.indexOf(current);
  const safeIndex = index >= 0 ? index : AUTO_QUALITY_LADDER.indexOf(AUTO_DEFAULT_QUALITY);

  if (direction === "min") {
    return "360p";
  }
  if (direction === "down") {
    return AUTO_QUALITY_LADDER[Math.min(AUTO_QUALITY_LADDER.length - 1, safeIndex + 1)] || "360p";
  }
  return AUTO_QUALITY_LADDER[Math.max(0, safeIndex - 1)] || AUTO_DEFAULT_QUALITY;
}

export function suggestAdaptiveQualityChange(
  connection: LiveConnectionLevel,
  current: LiveVideoQuality,
): LiveVideoQuality | null {
  if (connection === "lost") {
    return current === "360p" ? null : "360p";
  }
  if (connection === "poor") {
    const next = stepAdaptiveQuality(current, "down");
    return next === current ? null : next;
  }
  if (connection === "excellent") {
    const next = stepAdaptiveQuality(current, "up");
    const capped =
      AUTO_QUALITY_LADDER.indexOf(next) < AUTO_QUALITY_LADDER.indexOf(AUTO_DEFAULT_QUALITY)
        ? next
        : AUTO_DEFAULT_QUALITY;
    return capped === current ? null : capped;
  }
  if (connection === "good" && current !== AUTO_DEFAULT_QUALITY) {
    const next = stepAdaptiveQuality(current, "up");
    const capped =
      AUTO_QUALITY_LADDER.indexOf(next) <= AUTO_QUALITY_LADDER.indexOf(AUTO_DEFAULT_QUALITY)
        ? next
        : AUTO_DEFAULT_QUALITY;
    return capped === current ? null : capped;
  }
  return null;
}
