import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Captions, Focus, Grid3X3, LayoutGrid, MonitorPlay, Sparkles, UserRound, Video, X } from "lucide-react";
import {
  LIVE_LAYOUT_OPTIONS,
  LIVE_SUBTITLE_OPTIONS,
  LIVE_VIDEO_QUALITY_OPTIONS,
  type LiveLayoutMode,
  type LiveSettings,
  type LiveSubtitleLanguage,
  type LiveVideoQuality,
} from "../../live/liveSettings";

interface LiveSettingsPanelProps {
  open: boolean;
  onClose: () => void;
  settings: LiveSettings;
  onVideoQualityChange: (quality: LiveVideoQuality) => void;
  onLayoutModeChange: (mode: LiveLayoutMode) => void;
  onFocusModeChange: (enabled: boolean) => void;
  onSubtitleLanguageChange: (language: LiveSubtitleLanguage) => void;
  pipSupported: boolean;
  isPiPActive: boolean;
  onTogglePiP: () => void;
}

function layoutIcon(mode: LiveLayoutMode) {
  if (mode === "teacher-only") return UserRound;
  if (mode === "active-speaker") return MonitorPlay;
  return LayoutGrid;
}

export default function LiveSettingsPanel({
  open,
  onClose,
  settings,
  onVideoQualityChange,
  onLayoutModeChange,
  onFocusModeChange,
  onSubtitleLanguageChange,
  pipSupported,
  isPiPActive,
  onTogglePiP,
}: LiveSettingsPanelProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        aria-label="Fermer les paramètres live"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="live-settings-title"
        className="relative w-full max-w-lg max-h-[min(92dvh,820px)] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-white/10 bg-zinc-950/95 shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-300 custom-scrollbar"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/10 bg-zinc-950/95 px-5 py-4 backdrop-blur-md">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-300">Live</p>
            <h2 id="live-settings-title" className="text-lg font-bold text-white">
              Paramètres Live
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="kbd-nav-focus touch-target rounded-xl border border-white/10 p-2 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-5">
          <section aria-labelledby="live-quality-heading">
            <div className="mb-3 flex items-center gap-2">
              <Video className="h-4 w-4 text-indigo-400" />
              <h3 id="live-quality-heading" className="text-sm font-bold text-white">
                Qualité vidéo
              </h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {LIVE_VIDEO_QUALITY_OPTIONS.map((option) => {
                const selected = settings.videoQuality === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onVideoQualityChange(option.value)}
                    aria-pressed={selected}
                    className={`rounded-xl border px-3 py-2.5 text-left transition-all ${
                      selected
                        ? "border-indigo-400 bg-indigo-500/15 text-white shadow-[0_0_0_1px_rgba(129,140,248,0.35)]"
                        : "border-white/10 bg-zinc-900/70 text-zinc-300 hover:border-white/20 hover:bg-zinc-800"
                    }`}
                  >
                    <span className="block text-sm font-bold">{option.label}</span>
                    {option.value === "auto" && (
                      <span className="mt-0.5 block text-[10px] text-zinc-400">Adaptatif réseau</span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="live-layout-heading">
            <div className="mb-3 flex items-center gap-2">
              <Grid3X3 className="h-4 w-4 text-indigo-400" />
              <h3 id="live-layout-heading" className="text-sm font-bold text-white">
                Vue mosaïque
              </h3>
            </div>
            <div className="space-y-2">
              {LIVE_LAYOUT_OPTIONS.map((option) => {
                const selected = settings.layoutMode === option.value;
                const Icon = layoutIcon(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onLayoutModeChange(option.value)}
                    aria-pressed={selected}
                    className={`flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition-all ${
                      selected
                        ? "border-indigo-400 bg-indigo-500/10 text-white"
                        : "border-white/10 bg-zinc-900/70 text-zinc-300 hover:border-white/20 hover:bg-zinc-800"
                    }`}
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-indigo-300" />
                    <span>
                      <span className="block text-sm font-bold">{option.label}</span>
                      <span className="mt-0.5 block text-[11px] text-zinc-400">{option.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="live-pip-heading">
            <div className="mb-3 flex items-center gap-2">
              <MonitorPlay className="h-4 w-4 text-indigo-400" />
              <h3 id="live-pip-heading" className="text-sm font-bold text-white">
                Picture-in-Picture
              </h3>
            </div>
            <button
              type="button"
              onClick={onTogglePiP}
              disabled={!pipSupported}
              className={`w-full rounded-xl border px-4 py-3 text-left transition-all ${
                pipSupported
                  ? "border-white/10 bg-zinc-900/70 text-zinc-200 hover:border-indigo-400/40 hover:bg-zinc-800"
                  : "border-white/5 bg-zinc-900/40 text-zinc-500 cursor-not-allowed"
              }`}
            >
              <span className="block text-sm font-bold">
                {isPiPActive ? "Quitter Picture-in-Picture" : "Activer Picture-in-Picture"}
              </span>
              <span className="mt-1 block text-[11px] text-zinc-400">
                {pipSupported
                  ? "Continuez à suivre le live pendant la navigation dans les cours."
                  : "Non pris en charge par ce navigateur."}
              </span>
            </button>
          </section>

          <section aria-labelledby="live-focus-heading">
            <div className="mb-3 flex items-center gap-2">
              <Focus className="h-4 w-4 text-indigo-400" />
              <h3 id="live-focus-heading" className="text-sm font-bold text-white">
                Mode concentration
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onFocusModeChange(!settings.focusMode)}
              aria-pressed={settings.focusMode}
              className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 transition-all ${
                settings.focusMode
                  ? "border-emerald-400/40 bg-emerald-500/10 text-white"
                  : "border-white/10 bg-zinc-900/70 text-zinc-200 hover:border-white/20 hover:bg-zinc-800"
              }`}
            >
              <span>
                <span className="block text-sm font-bold">Mode Concentration</span>
                <span className="mt-1 block text-[11px] text-zinc-400">
                  Ouvre le tableau blanc plein écran et simplifie la scène live.
                </span>
              </span>
              <span
                className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                  settings.focusMode ? "bg-emerald-500" : "bg-zinc-700"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-transform ${
                    settings.focusMode ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </span>
            </button>
          </section>

          <section aria-labelledby="live-subtitles-heading">
            <div className="mb-3 flex items-center gap-2">
              <Captions className="h-4 w-4 text-indigo-400" />
              <h3 id="live-subtitles-heading" className="text-sm font-bold text-white">
                Sous-titres
              </h3>
            </div>
            <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-amber-100">
              <div className="flex items-center gap-2 text-sm font-bold">
                <Sparkles className="h-4 w-4" />
                Bientôt disponible
              </div>
              <p className="mt-1 text-[11px] text-amber-100/80">
                Architecture préparée pour la transcription IA multilingue.
              </p>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 opacity-70">
              {LIVE_SUBTITLE_OPTIONS.map((option) => {
                const selected = settings.subtitleLanguage === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled
                    aria-pressed={selected}
                    onClick={() => onSubtitleLanguageChange(option.value)}
                    className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                      selected
                        ? "border-indigo-400/40 bg-indigo-500/10 text-white"
                        : "border-white/10 bg-zinc-900/50 text-zinc-400"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section
            aria-labelledby="live-shortcuts-heading"
            className="rounded-xl border border-white/10 bg-zinc-900/50 px-4 py-3"
          >
            <h3 id="live-shortcuts-heading" className="text-sm font-bold text-white">
              Raccourcis clavier
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-zinc-300">
              {[
                ["M", "Micro"],
                ["V", "Caméra"],
                ["H", "Main levée"],
                ["F", "Plein écran"],
                ["P", "Picture-in-Picture"],
                ["T", "Tableau blanc"],
                ["Esc", "Fermer"],
              ].map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <kbd className="rounded-md border border-white/10 bg-zinc-950 px-2 py-0.5 font-mono text-[10px] text-indigo-200">
                    {key}
                  </kbd>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>,
    document.body,
  );
}
