import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface AccessibilityPreferences {
  highContrast: boolean;
  reduceMotion: boolean;
}

const STORAGE_KEY = "axelmond-a11y-preferences";

const DEFAULT_PREFERENCES: AccessibilityPreferences = {
  highContrast: false,
  reduceMotion: false,
};

function readStoredPreferences(): AccessibilityPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
      return { ...DEFAULT_PREFERENCES, reduceMotion: prefersReduced };
    }
    const parsed = JSON.parse(raw) as Partial<AccessibilityPreferences>;
    return {
      highContrast: Boolean(parsed.highContrast),
      reduceMotion: Boolean(parsed.reduceMotion),
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function applyAccessibilityPreferences(prefs: AccessibilityPreferences) {
  const root = document.documentElement;
  root.classList.toggle("a11y-high-contrast", prefs.highContrast);
  root.classList.toggle("a11y-reduce-motion", prefs.reduceMotion);
  root.dataset.highContrast = prefs.highContrast ? "true" : "false";
  root.dataset.reduceMotion = prefs.reduceMotion ? "true" : "false";
}

interface AccessibilityPreferencesContextValue {
  preferences: AccessibilityPreferences;
  setHighContrast: (value: boolean) => void;
  setReduceMotion: (value: boolean) => void;
  toggleHighContrast: () => void;
  toggleReduceMotion: () => void;
}

const AccessibilityPreferencesContext = createContext<AccessibilityPreferencesContextValue | null>(null);

export function AccessibilityPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(() => readStoredPreferences());

  useEffect(() => {
    applyAccessibilityPreferences(preferences);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }, [preferences]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncSystemPreference = () => {
      if (localStorage.getItem(STORAGE_KEY)) return;
      setPreferences((prev) => ({ ...prev, reduceMotion: media.matches }));
    };
    syncSystemPreference();
    media.addEventListener("change", syncSystemPreference);
    return () => media.removeEventListener("change", syncSystemPreference);
  }, []);

  const setHighContrast = useCallback((value: boolean) => {
    setPreferences((prev) => ({ ...prev, highContrast: value }));
  }, []);

  const setReduceMotion = useCallback((value: boolean) => {
    setPreferences((prev) => ({ ...prev, reduceMotion: value }));
  }, []);

  const toggleHighContrast = useCallback(() => {
    setPreferences((prev) => ({ ...prev, highContrast: !prev.highContrast }));
  }, []);

  const toggleReduceMotion = useCallback(() => {
    setPreferences((prev) => ({ ...prev, reduceMotion: !prev.reduceMotion }));
  }, []);

  const value = useMemo(
    () => ({
      preferences,
      setHighContrast,
      setReduceMotion,
      toggleHighContrast,
      toggleReduceMotion,
    }),
    [preferences, setHighContrast, setReduceMotion, toggleHighContrast, toggleReduceMotion],
  );

  return <AccessibilityPreferencesContext.Provider value={value}>{children}</AccessibilityPreferencesContext.Provider>;
}

export function useAccessibilityPreferences() {
  const context = useContext(AccessibilityPreferencesContext);
  if (!context) {
    throw new Error("useAccessibilityPreferences must be used within AccessibilityPreferencesProvider");
  }
  return context;
}
