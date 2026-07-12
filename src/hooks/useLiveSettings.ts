import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_LIVE_SETTINGS,
  persistLiveSettings,
  readStoredLiveSettings,
  type LiveLayoutMode,
  type LiveSettings,
  type LiveSubtitleLanguage,
  type LiveVideoQuality,
} from "../live/liveSettings";

export function useLiveSettings() {
  const [settings, setSettings] = useState<LiveSettings>(() => readStoredLiveSettings());

  useEffect(() => {
    persistLiveSettings(settings);
  }, [settings]);

  const patchSettings = useCallback((patch: Partial<LiveSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  }, []);

  const setVideoQuality = useCallback(
    (videoQuality: LiveVideoQuality) => {
      patchSettings({ videoQuality });
    },
    [patchSettings],
  );

  const setLayoutMode = useCallback(
    (layoutMode: LiveLayoutMode) => {
      patchSettings({ layoutMode });
    },
    [patchSettings],
  );

  const setSubtitleLanguage = useCallback(
    (subtitleLanguage: LiveSubtitleLanguage) => {
      patchSettings({ subtitleLanguage });
    },
    [patchSettings],
  );

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_LIVE_SETTINGS);
  }, []);

  return {
    settings,
    patchSettings,
    setVideoQuality,
    setLayoutMode,
    setSubtitleLanguage,
    resetSettings,
  };
}
