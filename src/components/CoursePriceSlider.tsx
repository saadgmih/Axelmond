import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { formatMad } from "../utils/morocco-locale";

const MIN_PRICE = 0;
const MAX_PRICE = 499;
const STEP = 0.5;

function clampPrice(value: number) {
  const stepped = Math.round(value / STEP) * STEP;
  return Math.min(MAX_PRICE, Math.max(MIN_PRICE, Number(stepped.toFixed(2))));
}

/** Normalized slider position 0 → 1, aligned to thumb travel axis */
export function getCoursePriceSliderPct(value: number, min: number = MIN_PRICE, max: number = MAX_PRICE) {
  const clamped = clampPrice(value);
  if (max <= min) return 0;
  return (clamped - min) / (max - min);
}

export function getCoursePriceSliderPercentage(value: number) {
  return getCoursePriceSliderPct(value) * 100;
}

interface CoursePriceSliderProps {
  courseId: number;
  price: number;
  courseTitle: string;
  onCommit: (id: number, newPrice: number) => void | Promise<void>;
  onDraftChange?: (price: number) => void;
}

export default function CoursePriceSlider({
  courseId,
  price,
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

  const sliderPct = getCoursePriceSliderPct(draft);

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
        <span className="font-mono font-bold text-white">{formatMad(draft)}</span>
      </div>

      <div
        className={`course-price-slider-root${isDragging ? " is-dragging" : ""}`}
        style={{ "--slider-pct": sliderPct } as CSSProperties}
      >
        <div className="course-price-slider-track" aria-hidden="true">
          <div className="course-price-slider-active" />
        </div>
        <div className="course-price-slider-thumb" aria-hidden="true" />
        <input
          type="range"
          min={MIN_PRICE}
          max={MAX_PRICE}
          step={STEP}
          value={draft}
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
          aria-valuemin={MIN_PRICE}
          aria-valuemax={MAX_PRICE}
          aria-valuenow={draft}
        />
      </div>
    </div>
  );
}

export { clampPrice as clampCoursePrice };
