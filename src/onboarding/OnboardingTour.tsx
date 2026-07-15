import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, Check, Sparkles, X } from "lucide-react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from "react";
import type { OnboardingPlacement, OnboardingStep } from "./onboarding-config";

interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}

interface OnboardingTourProps {
  step: OnboardingStep;
  stepIndex: number;
  stepCount: number;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  onQuit: () => void;
}

const VIEWPORT_MARGIN = 16;
const TARGET_PADDING = 7;
const TOOLTIP_GAP = 18;

function findVisibleTarget(selectors: string[]): HTMLElement | null {
  for (const selector of selectors) {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
    const visible = elements.find((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
    });
    if (visible) return visible;
  }
  return null;
}

function toHighlightRect(element: HTMLElement): HighlightRect {
  const rect = element.getBoundingClientRect();
  const left = Math.max(4, rect.left - TARGET_PADDING);
  const top = Math.max(4, rect.top - TARGET_PADDING);
  const right = Math.min(window.innerWidth - 4, rect.right + TARGET_PADDING);
  const bottom = Math.min(window.innerHeight - 4, rect.bottom + TARGET_PADDING);
  return { top, left, right, bottom, width: right - left, height: bottom - top };
}

function sameHighlightRect(current: HighlightRect | null, next: HighlightRect | null) {
  if (!current || !next) return current === next;
  return (
    Math.abs(current.top - next.top) < 0.5 &&
    Math.abs(current.left - next.left) < 0.5 &&
    Math.abs(current.width - next.width) < 0.5 &&
    Math.abs(current.height - next.height) < 0.5
  );
}

function tooltipStyle(
  target: HighlightRect | null,
  placement: OnboardingPlacement,
  size: { width: number; height: number },
): CSSProperties {
  if (window.innerWidth < 640) {
    return { left: 12, right: 12, bottom: 12, width: "auto" };
  }
  if (!target) {
    return { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
  }

  const width = Math.min(size.width || 390, window.innerWidth - VIEWPORT_MARGIN * 2);
  const height = Math.min(size.height || 330, window.innerHeight - VIEWPORT_MARGIN * 2);
  const centeredLeft = target.left + target.width / 2 - width / 2;
  const centeredTop = target.top + target.height / 2 - height / 2;
  let left = centeredLeft;
  let top = target.bottom + TOOLTIP_GAP;

  if (placement === "top") top = target.top - height - TOOLTIP_GAP;
  if (placement === "right") {
    left = target.right + TOOLTIP_GAP;
    top = centeredTop;
  }
  if (placement === "left") {
    left = target.left - width - TOOLTIP_GAP;
    top = centeredTop;
  }

  if (left + width > window.innerWidth - VIEWPORT_MARGIN) left = target.left - width - TOOLTIP_GAP;
  if (left < VIEWPORT_MARGIN) left = Math.min(window.innerWidth - width - VIEWPORT_MARGIN, target.right + TOOLTIP_GAP);
  if (top + height > window.innerHeight - VIEWPORT_MARGIN) top = target.top - height - TOOLTIP_GAP;
  if (top < VIEWPORT_MARGIN) top = Math.min(window.innerHeight - height - VIEWPORT_MARGIN, target.bottom + TOOLTIP_GAP);

  return {
    left: Math.max(VIEWPORT_MARGIN, Math.min(left, window.innerWidth - width - VIEWPORT_MARGIN)),
    top: Math.max(VIEWPORT_MARGIN, Math.min(top, window.innerHeight - height - VIEWPORT_MARGIN)),
  };
}

export function OnboardingTour({
  step,
  stepIndex,
  stepCount,
  onNext,
  onPrevious,
  onSkip,
  onQuit,
}: OnboardingTourProps) {
  const [targetRect, setTargetRect] = useState<HighlightRect | null>(null);
  const [tooltipSize, setTooltipSize] = useState({ width: 390, height: 330 });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const maskId = `onboarding-mask-${useId().replace(/:/g, "")}`;
  const isLast = stepIndex === stepCount - 1;

  const measureTarget = useCallback(() => {
    const target = findVisibleTarget(step.targetSelectors);
    const nextRect = target ? toHighlightRect(target) : null;
    setTargetRect((current) => (sameHighlightRect(current, nextRect) ? current : nextRect));
  }, [step.targetSelectors]);

  useLayoutEffect(() => {
    const target = findVisibleTarget(step.targetSelectors);
    if (target) {
      const rect = target.getBoundingClientRect();
      if (rect.top < 8 || rect.bottom > window.innerHeight - 8) {
        target.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }

    let frame = 0;
    const scheduleMeasure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measureTarget);
    };
    scheduleMeasure();
    const settleTimer = window.setTimeout(scheduleMeasure, 340);
    const observer = new MutationObserver(scheduleMeasure);
    observer.observe(document.body, { attributes: true, childList: true, subtree: true });
    window.addEventListener("resize", scheduleMeasure);
    document.addEventListener("scroll", scheduleMeasure, true);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(settleTimer);
      observer.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
      document.removeEventListener("scroll", scheduleMeasure, true);
    };
  }, [measureTarget, step.targetSelectors]);

  useLayoutEffect(() => {
    const tooltip = tooltipRef.current;
    if (!tooltip) return;
    const update = () => {
      const nextSize = { width: tooltip.offsetWidth, height: tooltip.offsetHeight };
      setTooltipSize((current) =>
        current.width === nextSize.width && current.height === nextSize.height ? current : nextSize,
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(tooltip);
    return () => observer.disconnect();
  }, [step.id]);

  useEffect(() => {
    previouslyFocused.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    tooltipRef.current?.focus({ preventScroll: true });
    return () => previouslyFocused.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    tooltipRef.current?.focus({ preventScroll: true });
  }, [step.id]);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onQuit();
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      onNext();
      return;
    }
    if (event.key === "ArrowLeft" && stepIndex > 0) {
      event.preventDefault();
      onPrevious();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = Array.from(
      tooltipRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      ) || [],
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === tooltipRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const position = useMemo(
    () => tooltipStyle(targetRect, step.placement || "bottom", tooltipSize),
    [step.placement, targetRect, tooltipSize],
  );

  return createPortal(
    <div className="fixed inset-0 z-[200]" data-testid="onboarding-tour">
      {targetRect ? (
        <>
          <svg
            className="absolute inset-0 h-full w-full"
            aria-hidden="true"
            onClick={(event) => event.preventDefault()}
          >
            <defs>
              <mask id={maskId}>
                <rect width="100%" height="100%" fill="white" />
                <rect
                  x={targetRect.left}
                  y={targetRect.top}
                  width={targetRect.width}
                  height={targetRect.height}
                  rx="15"
                  fill="black"
                />
              </mask>
            </defs>
            <rect width="100%" height="100%" fill="rgba(0, 12, 10, 0.76)" mask={`url(#${maskId})`} />
          </svg>
          <div
            className="pointer-events-none absolute rounded-2xl border-2 border-emerald-300 shadow-[0_0_0_4px_rgba(52,211,153,0.18),0_0_30px_rgba(16,185,129,0.35)] motion-safe:animate-pulse"
            style={targetRect}
            aria-hidden="true"
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-[#000d0b]/80 backdrop-blur-[2px]" aria-hidden="true" />
      )}

      <div
        ref={tooltipRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        aria-describedby="onboarding-description"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="onboarding-card fixed z-[202] w-[min(390px,calc(100vw-24px))] overflow-hidden rounded-[1.6rem] border shadow-[0_24px_80px_rgba(0,0,0,0.42)] outline-none motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95"
        style={position}
      >
        <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400" />
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="onboarding-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl">
                <Sparkles className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="onboarding-eyebrow truncate text-[10px] font-black uppercase tracking-[0.18em]">
                  {step.eyebrow}
                </p>
                <p className="onboarding-counter mt-0.5 text-xs font-semibold">
                  Étape {stepIndex + 1} sur {stepCount}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onQuit}
              className="onboarding-icon-button kbd-nav-focus flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              aria-label="Quitter le tutoriel"
              title="Quitter le tutoriel"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-5" aria-live="polite">
            <h2 id="onboarding-title" className="onboarding-title text-xl font-black tracking-tight sm:text-2xl">
              {step.title}
            </h2>
            <p id="onboarding-description" className="onboarding-description mt-2 text-sm leading-6">
              {step.description}
            </p>
          </div>

          <div className="mt-5 flex gap-1.5" aria-hidden="true">
            {Array.from({ length: stepCount }, (_, index) => (
              <span
                key={index}
                className={`h-1.5 rounded-full transition-[width,background-color] ${
                  index === stepIndex
                    ? "w-7 bg-emerald-500"
                    : index < stepIndex
                      ? "w-3 bg-emerald-300"
                      : "w-3 bg-slate-300/50"
                }`}
              />
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onPrevious}
              disabled={stepIndex === 0}
              className="onboarding-secondary-button kbd-nav-focus inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-3.5 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Précédent
            </button>
            {!isLast && (
              <button
                type="button"
                onClick={onSkip}
                className="onboarding-skip-button kbd-nav-focus min-h-11 rounded-xl px-3 text-xs font-bold"
              >
                Passer
              </button>
            )}
            <button
              type="button"
              onClick={onNext}
              className="kbd-nav-focus ml-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-black text-white shadow-lg shadow-emerald-900/25 transition-colors hover:bg-emerald-500"
            >
              {isLast ? (
                <>
                  Terminer <Check className="h-4 w-4" aria-hidden="true" />
                </>
              ) : (
                <>
                  Suivant <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </>
              )}
            </button>
          </div>
          <p className="onboarding-keyboard-hint mt-4 text-center text-[10px] font-medium">
            Utilisez ← → pour naviguer et Échap pour quitter.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
