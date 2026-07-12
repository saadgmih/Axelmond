import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import {
  COURSE_PRICE_STEP,
  FREE_COURSE_PRICE,
  MAX_COURSE_PRICE,
  MIN_PAID_COURSE_PRICE,
  clampPaidCoursePrice,
  coerceCoursePrice,
  isFreeCoursePrice,
  formatFreeAccessDurationLabel,
  normalizeCoursePrice,
} from "../utils/course-pricing";
import { formatMad } from "../utils/morocco-locale";

function clampPrice(value: unknown) {
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
  freeAccessStartsAt?: string | null;
  freeAccessEndsAt?: string | null;
  freeAccessDurationDays?: number | null;
  courseTitle: string;
  onCommit: (id: number, newPrice: number) => void | Promise<void>;
  onDraftChange?: (price: number) => void;
  priceError?: string | null;
  isSaving?: boolean;
}

export default function CoursePriceSlider({
  courseId,
  price,
  freeAccessStartsAt,
  freeAccessEndsAt,
  freeAccessDurationDays,
  courseTitle,
  onCommit,
  onDraftChange,
  priceError,
  isSaving = false,
}: CoursePriceSliderProps) {
  const normalizedPrice = clampPrice(price);
  const [draft, setDraft] = useState(() => normalizedPrice);
  const [priceMode, setPriceMode] = useState<"free" | "paid">(() =>
    isFreeCoursePrice(normalizedPrice) ? "free" : "paid",
  );
  const [isDragging, setIsDragging] = useState(false);
  const draggingRef = useRef(false);
  const draftRef = useRef(draft);
  const skipBlurCommitRef = useRef(false);
  const lastPaidPriceRef = useRef(
    isFreeCoursePrice(normalizedPrice)
      ? MIN_PAID_COURSE_PRICE
      : clampPaidCoursePrice(normalizedPrice),
  );
  const onDraftChangeRef = useRef(onDraftChange);
  const onCommitRef = useRef(onCommit);
  draftRef.current = draft;
  onDraftChangeRef.current = onDraftChange;
  onCommitRef.current = onCommit;

  const rememberPaidPrice = useCallback((value: unknown) => {
    if (!isFreeCoursePrice(value)) {
      lastPaidPriceRef.current = clampPaidCoursePrice(coerceCoursePrice(value));
    }
  }, []);

  const isFree = priceMode === "free";
  const paidSliderValue = clampPaidCoursePrice(
    isFreeCoursePrice(draft) ? lastPaidPriceRef.current : coerceCoursePrice(draft),
  );
  const sliderPct = getCoursePriceSliderPct(paidSliderValue);

  const persistPrice = useCallback(
    (nextPrice: number) => {
      void Promise.resolve(onCommitRef.current(courseId, nextPrice)).catch(() => undefined);
    },
    [courseId],
  );

  useEffect(() => {
    if (draggingRef.current) return;
    const next = clampPrice(price);
    setDraft(next);
    setPriceMode(isFreeCoursePrice(next) ? "free" : "paid");
    rememberPaidPrice(next);
    onDraftChangeRef.current?.(next);
  }, [price, rememberPaidPrice]);

  const commitDraft = useCallback(() => {
    const next = clampPrice(draftRef.current);
    if (isFreeCoursePrice(next)) return;
    setPriceMode("paid");
    rememberPaidPrice(next);
    setDraft(next);
    draftRef.current = next;
    onDraftChangeRef.current?.(next);
    persistPrice(next);
  }, [persistPrice, rememberPaidPrice]);

  const updateDraft = useCallback(
    (value: number) => {
      const next = clampPaidCoursePrice(value);
      setPriceMode("paid");
      rememberPaidPrice(next);
      setDraft(next);
      draftRef.current = next;
      onDraftChangeRef.current?.(next);
    },
    [rememberPaidPrice],
  );

  const commitPriceMode = useCallback(
    (mode: "free" | "paid") => {
      if (mode === "free") {
        if (!isFreeCoursePrice(draftRef.current)) {
          rememberPaidPrice(draftRef.current);
        }
        draggingRef.current = false;
        setIsDragging(false);
        setPriceMode("free");
        setDraft(FREE_COURSE_PRICE);
        draftRef.current = FREE_COURSE_PRICE;
        onDraftChangeRef.current?.(FREE_COURSE_PRICE);
        persistPrice(FREE_COURSE_PRICE);
        return;
      }

      const restored = lastPaidPriceRef.current;
      draggingRef.current = false;
      setIsDragging(false);
      setPriceMode("paid");
      setDraft(restored);
      draftRef.current = restored;
      rememberPaidPrice(restored);
      onDraftChangeRef.current?.(restored);
      persistPrice(restored);
    },
    [persistPrice, rememberPaidPrice],
  );

  const preventBlurBeforeClick = useCallback(() => {
    skipBlurCommitRef.current = true;
    window.setTimeout(() => {
      skipBlurCommitRef.current = false;
    }, 0);
  }, []);

  const finishDragging = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setIsDragging(false);
    commitDraft();
  }, [commitDraft]);

  useEffect(() => {
    window.addEventListener("pointerup", finishDragging);
    window.addEventListener("pointercancel", finishDragging);
    return () => {
      window.removeEventListener("pointerup", finishDragging);
      window.removeEventListener("pointercancel", finishDragging);
    };
  }, [finishDragging]);

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
        <span>Frais d&apos;inscription</span>
        <span className="font-mono font-bold text-white">
          {isFree
            ? formatFreeAccessDurationLabel(freeAccessDurationDays, freeAccessStartsAt, freeAccessEndsAt)
            : formatMad(paidSliderValue)}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onMouseDown={preventBlurBeforeClick}
          onClick={() => {
            if (isFree) return;
            commitPriceMode("free");
          }}
          disabled={isSaving}
          className={`rounded-xl border px-3 py-2 text-xs font-black transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
            isFree
              ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-100"
              : "border-white/10 bg-slate-900/60 text-slate-400 hover:border-white/20 hover:text-white"
          }`}
        >
          Gratuit
        </button>
        <button
          type="button"
          onMouseDown={preventBlurBeforeClick}
          onClick={() => {
            if (!isFree) return;
            commitPriceMode("paid");
          }}
          disabled={isSaving}
          className={`rounded-xl border px-3 py-2 text-xs font-black transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
            !isFree
              ? "border-teal-400/50 bg-teal-500/15 text-teal-100"
              : "border-white/10 bg-slate-900/60 text-slate-400 hover:border-white/20 hover:text-white"
          }`}
        >
          Payant
        </button>
      </div>

      {!isFree && (
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
            min={MIN_PAID_COURSE_PRICE}
            max={MAX_COURSE_PRICE}
            step={COURSE_PRICE_STEP}
            value={paidSliderValue}
            disabled={isSaving}
            onPointerDown={() => {
              draggingRef.current = true;
              setIsDragging(true);
            }}
            onPointerUp={finishDragging}
            onChange={(e) => {
              updateDraft(parseFloat(e.target.value));
            }}
            onKeyUp={(e) => {
              if (e.key === "Enter") {
                finishDragging();
              }
            }}
            onBlur={() => {
              if (skipBlurCommitRef.current || draggingRef.current) return;
              commitDraft();
            }}
            className="course-price-slider-input"
            aria-label={`Tarif du module ${courseTitle}`}
            aria-valuemin={MIN_PAID_COURSE_PRICE}
            aria-valuemax={MAX_COURSE_PRICE}
            aria-valuenow={paidSliderValue}
          />
        </div>
      )}
      {!isFree && (
        <p className="text-[10px] font-semibold leading-relaxed text-slate-500">
          Relâchez le curseur pour enregistrer. Minimum {formatMad(MIN_PAID_COURSE_PRICE)}.
        </p>
      )}
      {isSaving && (
        <p className="text-[10px] font-semibold leading-relaxed text-teal-300">Enregistrement en cours…</p>
      )}
      {priceError && (
        <p role="alert" className="text-[10px] font-semibold leading-relaxed text-red-300">
          {priceError}
        </p>
      )}
    </div>
  );
}

export { clampPrice as clampCoursePrice };
