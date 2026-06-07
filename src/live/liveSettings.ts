import { Room, VideoPresets } from "livekit-client";

export type LiveVideoQuality = "auto" | "1080p" | "720p" | "480p" | "360p";
export type LiveLayoutMode = "teacher-only" | "tile" | "active-speaker";
export type LiveSubtitleLanguage = "fr" | "ar" | "en";

export interface LiveSettings {
  videoQuality: LiveVideoQuality;
  layoutMode: LiveLayoutMode;
  focusMode: boolean;
  subtitleLanguage: LiveSubtitleLanguage;
}

export const LIVE_SETTINGS_STORAGE_KEY = "axelmond-live-settings";

export const DEFAULT_LIVE_SETTINGS: LiveSettings = {
  videoQuality: "auto",
  layoutMode: "tile",
  focusMode: false,
  subtitleLanguage: "fr",
};

export const LIVE_VIDEO_QUALITY_OPTIONS: Array<{ value: LiveVideoQuality; label: string }> = [
  { value: "auto", label: "Auto" },
  { value: "1080p", label: "1080p" },
  { value: "720p", label: "720p" },
  { value: "480p", label: "480p" },
  { value: "360p", label: "360p" },
];

export const LIVE_LAYOUT_OPTIONS: Array<{ value: LiveLayoutMode; label: string; description: string }> = [
  { value: "teacher-only", label: "Enseignant uniquement", description: "Focus sur le professeur ou l'intervenant principal" },
  { value: "tile", label: "Vue mosaïque", description: "Grille responsive pour plusieurs participants" },
  { value: "active-speaker", label: "Intervenant actif", description: "Met en avant la personne qui parle" },
];

export const LIVE_SUBTITLE_OPTIONS: Array<{ value: LiveSubtitleLanguage; label: string }> = [
  { value: "fr", label: "Français" },
  { value: "ar", label: "Arabe" },
  { value: "en", label: "Anglais" },
];

const QUALITY_RESOLUTION: Partial<Record<LiveVideoQuality, { width: number; height: number }>> = {
  "1080p": VideoPresets.h1080.resolution,
  "720p": VideoPresets.h720.resolution,
  "480p": { width: 854, height: 480 },
  "360p": VideoPresets.h360.resolution,
};

export function readStoredLiveSettings(): LiveSettings {
  if (typeof window === "undefined") return DEFAULT_LIVE_SETTINGS;
  try {
    const raw = localStorage.getItem(LIVE_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_LIVE_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<LiveSettings>;
    return {
      videoQuality: LIVE_VIDEO_QUALITY_OPTIONS.some((option) => option.value === parsed.videoQuality)
        ? parsed.videoQuality as LiveVideoQuality
        : DEFAULT_LIVE_SETTINGS.videoQuality,
      layoutMode: LIVE_LAYOUT_OPTIONS.some((option) => option.value === parsed.layoutMode)
        ? parsed.layoutMode as LiveLayoutMode
        : DEFAULT_LIVE_SETTINGS.layoutMode,
      focusMode: Boolean(parsed.focusMode),
      subtitleLanguage: LIVE_SUBTITLE_OPTIONS.some((option) => option.value === parsed.subtitleLanguage)
        ? parsed.subtitleLanguage as LiveSubtitleLanguage
        : DEFAULT_LIVE_SETTINGS.subtitleLanguage,
    };
  } catch {
    return DEFAULT_LIVE_SETTINGS;
  }
}

export function persistLiveSettings(settings: LiveSettings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LIVE_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

export async function applyLiveVideoQuality(
  room: Room | null,
  quality: LiveVideoQuality,
  cameraEnabled: boolean,
) {
  if (!room || !cameraEnabled) return;

  if (quality === "auto") {
    await room.localParticipant.setCameraEnabled(true);
    return;
  }

  const resolution = QUALITY_RESOLUTION[quality];
  if (!resolution) return;
  await room.localParticipant.setCameraEnabled(true, { resolution });
}

export function isTeacherLikeRole(role?: string) {
  return role === "PROFESSOR" || role === "RESEARCHER" || role === "ADMIN";
}
