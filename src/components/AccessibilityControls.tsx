import { useEffect, useRef, useState } from "react";
import { Contrast, Eye, Minimize2, Settings2, X } from "lucide-react";
import { useAccessibilityPreferences } from "../hooks/useAccessibilityPreferences";

export default function AccessibilityControls() {
  const { preferences, toggleHighContrast, toggleReduceMotion } = useAccessibilityPreferences();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="kbd-nav-focus touch-target flex h-10 min-w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-900/70 text-slate-300 transition-colors hover:border-violet-500/40 hover:bg-violet-950/40 hover:text-violet-300"
        aria-label="Options d'accessibilité"
        aria-expanded={open}
        aria-controls="accessibility-controls-panel"
      >
        <Settings2 className="h-4 w-4" aria-hidden="true" />
      </button>

      {open && (
        <div
          ref={panelRef}
          id="accessibility-controls-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="accessibility-controls-title"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl shadow-black/40"
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 id="accessibility-controls-title" className="text-sm font-black text-white">
                Accessibilité
              </h2>
              <p className="mt-1 text-[11px] leading-snug text-slate-400">
                WCAG 2.2 AA — contraste, animations et navigation clavier.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="kbd-nav-focus rounded-lg border border-slate-700 p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              aria-label="Fermer les options d'accessibilité"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={toggleHighContrast}
              aria-pressed={preferences.highContrast}
              className={`kbd-nav-focus flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-xs font-semibold transition-colors ${
                preferences.highContrast
                  ? "border-yellow-400/50 bg-yellow-950/30 text-yellow-200"
                  : "border-slate-700 bg-slate-950/60 text-slate-200 hover:border-slate-600"
              }`}
            >
              <Contrast className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                Contraste élevé
                <span className="mt-0.5 block text-[10px] font-medium text-slate-400">
                  Renforce textes et focus en mode sombre.
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={toggleReduceMotion}
              aria-pressed={preferences.reduceMotion}
              className={`kbd-nav-focus flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-xs font-semibold transition-colors ${
                preferences.reduceMotion
                  ? "border-cyan-400/50 bg-cyan-950/30 text-cyan-200"
                  : "border-slate-700 bg-slate-950/60 text-slate-200 hover:border-slate-600"
              }`}
            >
              <Minimize2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                Réduire les animations
                <span className="mt-0.5 block text-[10px] font-medium text-slate-400">
                  Respecte aussi prefers-reduced-motion du système.
                </span>
              </span>
            </button>

            <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2.5 text-[10px] leading-relaxed text-slate-400">
              <Eye className="mb-1 inline h-3.5 w-3.5 text-violet-400" aria-hidden="true" />{" "}
              Tab / Shift+Tab pour naviguer. Esc ferme les fenêtres. La recherche vocale est
              disponible dans le catalogue.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
