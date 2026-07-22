import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Bell, CircleHelp, Contrast, Eye, Minimize2, Settings2, X } from "lucide-react";
import { useAccessibilityPreferences } from "../hooks/useAccessibilityPreferences";
import { getFocusableElements, useFocusTrap } from "../hooks/useFocusTrap";
import { computeFloatingPanelPosition, type FloatingPanelPosition } from "../utils/floating-panel-position";

const PANEL_Z_INDEX = 140;

interface AccessibilityControlsProps {
  labeled?: boolean;
  onRestartTutorial?: () => void;
  onOpenNotifications?: () => void;
  notificationUnreadCount?: number;
  activeView?: string;
}

export default function AccessibilityControls({
  labeled = false,
  onRestartTutorial,
  onOpenNotifications,
  notificationUnreadCount = 0,
  activeView,
}: AccessibilityControlsProps) {
  const { preferences, toggleHighContrast, toggleReduceMotion } = useAccessibilityPreferences();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<FloatingPanelPosition | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useFocusTrap(panelRef, open);

  const updatePosition = () => {
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger || !panel) return;

    const triggerRect = trigger.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    setPosition(
      computeFloatingPanelPosition({
        triggerRect,
        panelWidth: panelRect.width,
        panelHeight: panelRect.height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      }),
    );
  };

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }

    updatePosition();

    const onViewportChange = () => updatePosition();
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);

    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => updatePosition()) : null;
    if (observer && panelRef.current) {
      observer.observe(panelRef.current);
    }

    return () => {
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
      observer?.disconnect();
    };
  }, [open, preferences.highContrast, preferences.reduceMotion]);

  useEffect(() => {
    if (!open || !panelRef.current) return;
    const focusable = getFocusableElements(panelRef.current);
    focusable[0]?.focus();
  }, [open, position]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown, true);
    };
  }, [open]);

  const panel = open
    ? createPortal(
        <div
          ref={panelRef}
          id="accessibility-controls-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="accessibility-controls-title"
          style={{
            top: position?.top ?? -9999,
            left: position?.left ?? -9999,
            maxHeight: position?.maxHeight,
            zIndex: PANEL_Z_INDEX,
            visibility: position ? "visible" : "hidden",
          }}
          className="fixed w-[min(22rem,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl shadow-black/40"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-teal-500/25 bg-teal-500/10 text-teal-300">
                <Eye className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <h2 id="accessibility-controls-title" className="text-sm font-black text-white">
                  Accessibilité
                </h2>
                <p className="mt-1 text-[11px] leading-snug text-slate-400">
                  Adaptez l’affichage et la navigation à vos besoins.
                </p>
              </div>
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

          <div className="space-y-4">
            <section aria-labelledby="accessibility-display-title">
              <h3
                id="accessibility-display-title"
                className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500"
              >
                Préférences visuelles
              </h3>
              <div className="divide-y divide-slate-800 overflow-hidden rounded-xl border border-slate-700 bg-slate-950/55">
                <button
                  type="button"
                  role="switch"
                  onClick={toggleHighContrast}
                  aria-checked={preferences.highContrast}
                  className="kbd-nav-focus group flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-slate-800/60"
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                      preferences.highContrast
                        ? "border-yellow-400/40 bg-yellow-400/10 text-yellow-300"
                        : "border-slate-700 bg-slate-900 text-slate-400 group-hover:text-slate-200"
                    }`}
                  >
                    <Contrast className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-bold text-slate-100">Contraste élevé</span>
                    <span className="mt-0.5 block text-[10px] font-medium leading-snug text-slate-400">
                      Renforce la lisibilité des textes et des focus.
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1" aria-hidden="true">
                    <span
                      className={`relative h-5 w-9 rounded-full border transition-colors ${
                        preferences.highContrast
                          ? "border-yellow-300/60 bg-yellow-400/30"
                          : "border-slate-600 bg-slate-800"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-3.5 w-3.5 rounded-full transition-transform ${
                          preferences.highContrast ? "translate-x-[17px] bg-yellow-200" : "translate-x-0.5 bg-slate-400"
                        }`}
                      />
                    </span>
                    <span className="text-[9px] font-bold text-slate-500">
                      {preferences.highContrast ? "Activé" : "Désactivé"}
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  role="switch"
                  onClick={toggleReduceMotion}
                  aria-checked={preferences.reduceMotion}
                  className="kbd-nav-focus group flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-slate-800/60"
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                      preferences.reduceMotion
                        ? "border-teal-400/40 bg-teal-400/10 text-teal-300"
                        : "border-slate-700 bg-slate-900 text-slate-400 group-hover:text-slate-200"
                    }`}
                  >
                    <Minimize2 className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-bold text-slate-100">Réduire les animations</span>
                    <span className="mt-0.5 block text-[10px] font-medium leading-snug text-slate-400">
                      Limite les mouvements et transitions non essentiels.
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1" aria-hidden="true">
                    <span
                      className={`relative h-5 w-9 rounded-full border transition-colors ${
                        preferences.reduceMotion ? "border-teal-300/60 bg-teal-400/30" : "border-slate-600 bg-slate-800"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-3.5 w-3.5 rounded-full transition-transform ${
                          preferences.reduceMotion ? "translate-x-[17px] bg-teal-200" : "translate-x-0.5 bg-slate-400"
                        }`}
                      />
                    </span>
                    <span className="text-[9px] font-bold text-slate-500">
                      {preferences.reduceMotion ? "Activé" : "Désactivé"}
                    </span>
                  </span>
                </button>
              </div>
            </section>

            {(onRestartTutorial || onOpenNotifications) && (
              <section aria-labelledby="accessibility-shortcuts-title">
                <h3
                  id="accessibility-shortcuts-title"
                  className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500"
                >
                  Accès rapides
                </h3>
                <div className="divide-y divide-slate-800 overflow-hidden rounded-xl border border-slate-700 bg-slate-950/55">
                  {onRestartTutorial && (
                    <button
                      type="button"
                      data-onboarding="help-menu"
                      onClick={() => {
                        setOpen(false);
                        onRestartTutorial();
                      }}
                      className="kbd-nav-focus group flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-emerald-500/10"
                      aria-label="Aide - Relancer le tutoriel interactif"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-emerald-300">
                        <CircleHelp className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-bold text-slate-100">Parcours guidé</span>
                        <span className="mt-0.5 block text-[10px] font-medium leading-snug text-slate-400">
                          Relancer le tutoriel de votre espace.
                        </span>
                      </span>
                      <ArrowRight
                        className="h-4 w-4 shrink-0 text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-300"
                        aria-hidden="true"
                      />
                    </button>
                  )}

                  {onOpenNotifications && (
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        onOpenNotifications();
                      }}
                      aria-label="Notifications"
                      aria-current={activeView === "notifications" ? "page" : undefined}
                      className={`kbd-nav-focus group flex w-full items-center gap-3 px-3 py-3 text-left transition-colors ${
                        activeView === "notifications" ? "bg-teal-500/10" : "hover:bg-teal-500/10"
                      }`}
                    >
                      <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-teal-500/25 bg-teal-500/10 text-teal-300">
                        <Bell className="h-4 w-4" aria-hidden="true" />
                        {notificationUnreadCount > 0 && (
                          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-teal-400 px-1 text-[8px] font-black leading-none text-slate-950">
                            {notificationUnreadCount > 99 ? "99+" : notificationUnreadCount}
                          </span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-bold text-slate-100">Notifications</span>
                        <span className="mt-0.5 block text-[10px] font-medium leading-snug text-slate-400">
                          Consulter vos alertes académiques.
                        </span>
                      </span>
                      <ArrowRight
                        className="h-4 w-4 shrink-0 text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-teal-300"
                        aria-hidden="true"
                      />
                    </button>
                  )}
                </div>
              </section>
            )}

            <aside
              aria-label="Aide à la navigation clavier"
              className="rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-3"
            >
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-300">
                <Eye className="h-3.5 w-3.5 text-teal-400" aria-hidden="true" />
                Navigation clavier
              </div>
              <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] leading-relaxed text-slate-400">
                <kbd className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 font-bold text-slate-300">
                  Tab
                </kbd>
                <span>ou</span>
                <kbd className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 font-bold text-slate-300">
                  Maj + Tab
                </kbd>
                <span>pour naviguer</span>
                <span aria-hidden="true">·</span>
                <kbd className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 font-bold text-slate-300">
                  Échap
                </kbd>
                <span>pour fermer</span>
              </p>
            </aside>
          </div>
        </div>,
        document.body,
      )
    : null;

  const triggerButton = (
    <button
      ref={triggerRef}
      type="button"
      data-tv-focusable={labeled ? true : undefined}
      onClick={() => setOpen((value) => !value)}
      className={
        labeled
          ? "kbd-nav-focus touch-target flex min-h-[44px] w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-400 transition-all hover:bg-white/5 hover:text-white"
          : "kbd-nav-focus touch-target flex h-10 min-w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-900/70 text-slate-300 transition-colors hover:border-teal-500/40 hover:bg-teal-950/40 hover:text-teal-300"
      }
      aria-label="Options d'accessibilité"
      aria-expanded={open}
      aria-controls="accessibility-controls-panel"
    >
      <Settings2 className={labeled ? "h-5 w-5 shrink-0 text-teal-300" : "h-4 w-4"} aria-hidden="true" />
      {labeled && <span className="truncate text-left">Paramètres</span>}
    </button>
  );

  return (
    <>
      {triggerButton}
      {panel}
    </>
  );
}
