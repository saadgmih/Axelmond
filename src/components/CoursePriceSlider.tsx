import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import {
  COURSE_PRICE_STEP,
  FREE_COURSE_PRICE,
  MAX_COURSE_PRICE,
  MIN_PAID_COURSE_PRICE,
  clampPaidCoursePrice,
  isFreeCoursePrice,
  formatFreeAccessDurationLabel,
  normalizeCoursePrice,
} from "../utils/course-pricing";
import { formatMad } from "../utils/morocco-locale";

function clampPrice(value: number) {
  return normalizeCoursePrice(value);
}

/** Normalized slider position 0 → 1, aligned to thumb travel axis */
export function getCoursePriceSliderPct(
  value: number,
  min: number = MIN_PAID_COURSE_PRICE,
  max: number = MAX_COURSE_PRICE,
) {
  const clamped = clampPaidCoursePrice(isFreeCoursePrice(value) ? MIN_PAID_COURSE_PRICE : value);
  if (max <= min) return 0;
  return (clamped - min) / (max - min);
}

export function getCoursePriceSliderPercentage(value: number) {
  return getCoursePriceSliderPct(value) * 100;
}

interface CoursePriceSliderProps {
  courseId: number;
  price: number;
  freeAccessDurationDays?: number | null;
  courseTitle: string;
  onCommit: (id: number, newPrice: number) => void | Promise<void>;
  onDraftChange?: (price: number) => void;
}

export default function CoursePriceSlider({
  courseId,
  price,
  freeAccessDurationDays,
  courseTitle,
  onCommit,
  onDraftChange,
}: CoursePriceSliderProps) {
  const [draft, setDraft] = useState(() => clampPrice(price));
  const [isDragging, setIsDragging] = useState(false);
  const draggingRef = useRef(false);
  const draftRef = useRef(draft);
  const onDraftChangeRef = useRef(onDraftChange);
  draftRef.current = draft;
  onDraftChangeRef.current = onDraftChange;

  const isFree = isFreeCoursePrice(draft);
  const sliderValue = isFree ? MIN_PAID_COURSE_PRICE : draft;
  const sliderPct = getCoursePriceSliderPct(sliderValue);

  useEffect(() => {
    if (!draggingRef.current) {
      const next = clampPrice(price);
      setDraft(next);
      onDraftChangeRef.current?.(next);
    }
  }, [price]);

  const commitDraft = useCallback(() => {
    const next = clampPrice(draftRef.current);
    setDraft(next);
    onDraftChangeRef.current?.(next);
    void onCommit(courseId, next);
  }, [courseId, onCommit]);

  const updateDraft = useCallback((value: number) => {
    const next = clampPrice(value);
    setDraft(next);
    onDraftChangeRef.current?.(next);
  }, []);

  const commitPriceMode = useCallback(
    (value: number) => {
      const next = clampPrice(value);
      draggingRef.current = false;
      setIsDragging(false);
      setDraft(next);
      draftRef.current = next;
      onDraftChangeRef.current?.(next);
      void onCommit(courseId, next);
    },
    [courseId, onCommit],
  );

  useEffect(() => {
    const stopDragging = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      setIsDragging(false);
      commitDraft();
    };

    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);
    return () => {
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
    };
  }, [commitDraft]);

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
        <span>Frais d&apos;inscription</span>
        <span className="font-mono font-bold text-white">
          {isFree ? formatFreeAccessDurationLabel(freeAccessDurationDays) : formatMad(draft)}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => commitPriceMode(FREE_COURSE_PRICE)}
          className={`rounded-xl border px-3 py-2 text-xs font-black transition-colors ${
            isFree
              ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-100"
              : "border-white/10 bg-slate-900/60 text-slate-400 hover:border-white/20 hover:text-white"
          }`}
        >
          Gratuit
        </button>
        <button
          type="button"
          onClick={() => commitPriceMode(isFree ? MIN_PAID_COURSE_PRICE : draft)}
          className={`rounded-xl border px-3 py-2 text-xs font-black transition-colors ${
            !isFree
              ? "border-violet-400/50 bg-violet-500/15 text-violet-100"
              : "border-white/10 bg-slate-900/60 text-slate-400 hover:border-white/20 hover:text-white"
          }`}
        >
          Payant
        </button>
      </div>

      <div
        className={`course-price-slider-root${isDragging ? " is-dragging" : ""}${isFree ? " is-free" : ""}`}
        style={{ "--slider-pct": sliderPct } as CSSProperties}
      >
        <div className="course-price-slider-track" aria-hidden="true">
          <div className="course-price-slider-active" />
        </div>
        <div className="course-price-slider-thumb" aria-hidden="true" />
        <input
          type="range"
          min={MIN_PAID_COURSE_PRICE}
          max={MAX_COURSE_PRICE}
          step={COURSE_PRICE_STEP}
          value={sliderValue}
          disabled={isFree}
          onPointerDown={() => {
            draggingRef.current = true;
            setIsDragging(true);
          }}
          onChange={(e) => {
            updateDraft(parseFloat(e.target.value));
          }}
          onKeyUp={(e) => {
            if (e.key === "Enter") {
              draggingRef.current = false;
              setIsDragging(false);
              commitDraft();
            }
          }}
          onBlur={() => {
            if (!draggingRef.current) {
              commitDraft();
            }
          }}
          className="course-price-slider-input"
          aria-label={`Tarif du module ${courseTitle}`}
          aria-valuemin={MIN_PAID_COURSE_PRICE}
          aria-valuemax={MAX_COURSE_PRICE}
          aria-valuenow={isFree ? FREE_COURSE_PRICE : draft}
        />
      </div>
      <p className="text-[10px] font-semibold leading-relaxed text-slate-500">
        Payant : minimum {formatMad(MIN_PAID_COURSE_PRICE)}. Gratuit : accès immédiat sans paiement.
      </p>
    </div>
  );
}

export { clampPrice as clampCoursePrice };
