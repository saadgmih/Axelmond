import { Calendar, CalendarClock, Clock } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import {
  compareDatetimeLocalValues,
  defaultFreeAccessEndFromStart,
  formatDatetimeDisplayValue,
  formatDatetimeLocalValue,
  mergeDateIntoDatetimeLocal,
  mergeTimeIntoDatetimeLocal,
  parseDatetimeDisplayInput,
} from "../utils/free-access-datetime";

type FreeAccessWindowFieldsProps = {
  startsAt: string;
  endsAt: string;
  onStartsAtChange: (value: string) => void;
  onEndsAtChange: (value: string) => void;
  inputClassName: string;
  labelClassName?: string;
};

type DatetimeFieldProps = {
  id: string;
  label: string;
  value: string;
  minValue?: string;
  labelClassName: string;
  inputClassName: string;
  onChange: (value: string) => void;
};

function FreeAccessDatetimeField({
  id,
  label,
  value,
  minValue,
  labelClassName,
  inputClassName,
  onChange,
}: DatetimeFieldProps) {
  const datePickerId = useId();
  const timePickerId = useId();
  const datePickerRef = useRef<HTMLInputElement>(null);
  const timePickerRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(() => formatDatetimeDisplayValue(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setDraft(formatDatetimeDisplayValue(value));
    }
  }, [value, focused]);

  const commitDraft = () => {
    const parsed = parseDatetimeDisplayInput(draft);
    if (parsed) {
      onChange(parsed);
      setDraft(formatDatetimeDisplayValue(parsed));
      return;
    }
    if (!draft.trim()) {
      onChange("");
      return;
    }
    setDraft(formatDatetimeDisplayValue(value));
  };

  const canonical = parseDatetimeDisplayInput(value) ?? formatDatetimeLocalValue(null);
  const datePickerValue = canonical.split("T")[0] || "";
  const timePickerValue = canonical.split("T")[1] || "00:00";
  const minDateValue = minValue ? (parseDatetimeDisplayInput(minValue) ?? minValue).split("T")[0] : undefined;

  const applyCanonical = (next: string) => {
    const parsed = parseDatetimeDisplayInput(next);
    if (!parsed) return;
    onChange(parsed);
    setDraft(formatDatetimeDisplayValue(parsed));
  };

  return (
    <label htmlFor={id} className="block min-w-0 space-y-1.5">
      <span className={`${labelClassName} block whitespace-nowrap`}>{label}</span>
      <div className="relative flex min-w-0 items-stretch gap-2">
        <input
          id={id}
          type="text"
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          placeholder="09/07/2026 14:30"
          title="Saisie libre : JJ/MM/AAAA HH:mm"
          value={draft}
          onFocus={() => setFocused(true)}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            setFocused(false);
            commitDraft();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            }
          }}
          className={`${inputClassName} min-w-0 flex-1 font-mono text-sm text-slate-700`}
        />

        <input
          id={datePickerId}
          ref={datePickerRef}
          type="date"
          tabIndex={-1}
          aria-hidden="true"
          value={datePickerValue}
          min={minDateValue}
          onChange={(e) => {
            if (!e.target.value) return;
            applyCanonical(mergeDateIntoDatetimeLocal(canonical, e.target.value));
          }}
          className="pointer-events-none absolute h-0 w-0 opacity-0"
        />
        <input
          id={timePickerId}
          ref={timePickerRef}
          type="time"
          step={60}
          tabIndex={-1}
          aria-hidden="true"
          value={timePickerValue}
          onChange={(e) => {
            if (!e.target.value) return;
            applyCanonical(mergeTimeIntoDatetimeLocal(canonical, e.target.value));
          }}
          className="pointer-events-none absolute h-0 w-0 opacity-0"
        />

        <button
          type="button"
          title="Choisir la date"
          onClick={() => datePickerRef.current?.showPicker?.() ?? datePickerRef.current?.click()}
          className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 text-slate-600 hover:border-emerald-300 hover:text-emerald-700"
        >
          <Calendar className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Choisir l'heure"
          onClick={() => timePickerRef.current?.showPicker?.() ?? timePickerRef.current?.click()}
          className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 text-slate-600 hover:border-emerald-300 hover:text-emerald-700"
        >
          <Clock className="h-4 w-4" />
        </button>
      </div>
    </label>
  );
}

export default function FreeAccessWindowFields({
  startsAt,
  endsAt,
  onStartsAtChange,
  onEndsAtChange,
  inputClassName,
  labelClassName = "text-[10px] font-bold uppercase tracking-wide text-slate-600",
}: FreeAccessWindowFieldsProps) {
  return (
    <div className="space-y-3 rounded-xl border border-emerald-100/80 bg-emerald-50/40 p-4">
      <div className="flex items-start gap-2">
        <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        <p className="text-[10px] font-semibold leading-relaxed text-slate-600">
          Saisissez librement la date et l&apos;heure au clavier (ex. <span className="font-mono">09/07/2026 14:30</span>
          ), ou utilisez les boutons calendrier / horloge.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FreeAccessDatetimeField
          id="free-access-starts-at"
          label="Début de gratuité"
          value={startsAt}
          labelClassName={labelClassName}
          inputClassName={inputClassName}
          onChange={(nextStart) => {
            onStartsAtChange(nextStart);
            if (!endsAt || compareDatetimeLocalValues(endsAt, nextStart) <= 0) {
              onEndsAtChange(defaultFreeAccessEndFromStart(nextStart));
            }
          }}
        />

        <FreeAccessDatetimeField
          id="free-access-ends-at"
          label="Fin de gratuité"
          value={endsAt}
          minValue={startsAt}
          labelClassName={labelClassName}
          inputClassName={inputClassName}
          onChange={onEndsAtChange}
        />
      </div>
    </div>
  );
}
