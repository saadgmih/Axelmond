import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { formatMad } from "../utils/morocco-locale";

const MIN_PRICE = 0;
const MAX_PRICE = 499;
const STEP = 0.5;

function clampPrice(value: number) {
  const stepped = Math.round(value / STEP) * STEP;
  return Math.min(MAX_PRICE, Math.max(MIN_PRICE, Number(stepped.toFixed(2))));
}

function sliderProgress(price: number) {
  return `${(clampPrice(price) / MAX_PRICE) * 100}%`;
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
  const draggingRef = useRef(false);
  const draftRef = useRef(draft);
  const onDraftChangeRef = useRef(onDraftChange);
  draftRef.current = draft;
  onDraftChangeRef.current = onDraftChange;

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
      <input
        type="range"
        min={MIN_PRICE}
        max={MAX_PRICE}
        step={STEP}
        value={draft}
        onPointerDown={() => {
          draggingRef.current = true;
        }}
        onChange={(e) => {
          updateDraft(parseFloat(e.target.value));
        }}
        onKeyUp={(e) => {
          if (e.key === "Enter") {
            draggingRef.current = false;
            commitDraft();
          }
        }}
        onBlur={() => {
          if (!draggingRef.current) {
            commitDraft();
          }
        }}
        className="course-price-slider w-full cursor-pointer"
        style={{ "--slider-progress": sliderProgress(draft) } as CSSProperties}
        aria-label={`Tarif du module ${courseTitle}`}
        aria-valuemin={MIN_PRICE}
        aria-valuemax={MAX_PRICE}
        aria-valuenow={draft}
      />
    </div>
  );
}

export { clampPrice as clampCoursePrice, sliderProgress as coursePriceSliderProgress };
