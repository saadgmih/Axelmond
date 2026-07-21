import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, CircleHelp, Contrast, Eye, Minimize2, Settings2, X } from "lucide-react";
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
          className="fixed w-[min(18rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl shadow-black/40"
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
                  ? "border-teal-400/50 bg-teal-950/30 text-teal-200"
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

            {onRestartTutorial && (
              <button
                type="button"
                data-onboarding="help-menu"
                onClick={() => {
                  setOpen(false);
                  onRestartTutorial();
                }}
                className="kbd-nav-focus flex w-full items-center gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-3 text-left text-xs font-semibold text-emerald-100 transition-colors hover:border-emerald-400/50 hover:bg-emerald-500/20"
                aria-label="Aide - Relancer le tutoriel interactif"
              >
                <CircleHelp className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
                <span>
                  Aide
                  <span className="mt-0.5 block text-[10px] font-medium text-slate-400">
                    Relancer le tutoriel et revoir le parcours guidé de votre espace.
                  </span>
                </span>
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
                className={`kbd-nav-focus flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left text-xs font-semibold transition-colors ${
                  activeView === "notifications"
                    ? "border-teal-400/50 bg-teal-950/30 text-teal-200"
                    : "border-slate-700 bg-slate-950/60 text-slate-200 hover:border-slate-600"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Bell className="h-4 w-4 shrink-0 text-teal-400" aria-hidden="true" />
                  <div>
                    <span>Notifications</span>
                    <span className="mt-0.5 block text-[10px] font-medium text-slate-400">
                      Consulter vos notifications et alertes académiques.
                    </span>
                  </div>
                </div>
                {notificationUnreadCount > 0 && (
                  <span className="ml-2 flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-teal-500 px-1 text-[10px] font-black leading-none text-white shadow-lg shadow-teal-900/40">
                    {notificationUnreadCount > 99 ? "99+" : notificationUnreadCount}
                  </span>
                )}
              </button>
            )}

            <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2.5 text-[10px] leading-relaxed text-slate-400">
              <Eye className="mb-1 inline h-3.5 w-3.5 text-teal-400" aria-hidden="true" /> Tab / Shift+Tab pour
              naviguer. Esc ferme les fenêtres. La recherche vocale est disponible dans le catalogue.
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  const triggerButton = (
    <button
      ref={triggerRef}
      type="button"
      onClick={() => setOpen((value) => !value)}
      className={
        labeled
          ? "topbar-console-action kbd-nav-focus touch-target"
          : "kbd-nav-focus touch-target flex h-10 min-w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-900/70 text-slate-300 transition-colors hover:border-teal-500/40 hover:bg-teal-950/40 hover:text-teal-300"
      }
      aria-label="Options d'accessibilité"
      aria-expanded={open}
      aria-controls="accessibility-controls-panel"
    >
      <Settings2 className={labeled ? "topbar-console-action-icon" : "h-4 w-4"} aria-hidden="true" />
      {labeled && <span className="topbar-console-action-label">Paramètres</span>}
    </button>
  );

  return (
    <>
      {triggerButton}
      {panel}
    </>
  );
}
