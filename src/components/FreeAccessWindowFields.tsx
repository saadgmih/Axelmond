import { Calendar, CalendarClock, Clock } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import {
  compareDatetimeLocalValues,
  defaultFreeAccessEndFromStart,
  formatDateDisplayValue,
  formatDatetimeLocalValue,
  formatTimeDisplayValue,
  mergeDateIntoDatetimeLocal,
  mergeDisplayDateAndTime,
  mergeTimeIntoDatetimeLocal,
  parseDateDisplayInput,
  parseDatetimeDisplayInput,
  parseTimeDisplayInput,
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
  idPrefix: string;
  label: string;
  value: string;
  minValue?: string;
  labelClassName: string;
  inputClassName: string;
  onChange: (value: string) => void;
};

const pickerBtnClass =
  "inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border border-slate-600 bg-slate-800 text-emerald-300 transition-colors hover:border-emerald-400 hover:bg-slate-700 hover:text-emerald-200";

function FreeAccessDatetimeField({
  idPrefix,
  label,
  value,
  minValue,
  labelClassName,
  inputClassName,
  onChange,
}: DatetimeFieldProps) {
  const dateInputId = `${idPrefix}-date`;
  const timeInputId = `${idPrefix}-time`;
  const datePickerId = useId();
  const timePickerId = useId();
  const datePickerRef = useRef<HTMLInputElement>(null);
  const timePickerRef = useRef<HTMLInputElement>(null);

  const canonical = parseDatetimeDisplayInput(value) ?? formatDatetimeLocalValue(null);
  const [dateDraft, setDateDraft] = useState(() => formatDateDisplayValue(canonical));
  const [timeDraft, setTimeDraft] = useState(() => formatTimeDisplayValue(canonical));
  const [dateFocused, setDateFocused] = useState(false);
  const [timeFocused, setTimeFocused] = useState(false);

  useEffect(() => {
    const next = parseDatetimeDisplayInput(value) ?? formatDatetimeLocalValue(null);
    if (!dateFocused) setDateDraft(formatDateDisplayValue(next));
    if (!timeFocused) setTimeDraft(formatTimeDisplayValue(next));
  }, [value, dateFocused, timeFocused]);

  const applyCanonical = (next: string) => {
    const parsed = parseDatetimeDisplayInput(next);
    if (!parsed) return;
    onChange(parsed);
    setDateDraft(formatDateDisplayValue(parsed));
    setTimeDraft(formatTimeDisplayValue(parsed));
  };

  const syncFromDrafts = (nextDate: string, nextTime: string) => {
    const merged = mergeDisplayDateAndTime(nextDate, nextTime, value);
    if (merged) applyCanonical(merged);
  };

  const commitDateDraft = () => {
    const parsedDate = parseDateDisplayInput(dateDraft);
    if (parsedDate) {
      applyCanonical(mergeDateIntoDatetimeLocal(canonical, parsedDate));
      return;
    }
    if (!dateDraft.trim()) {
      setDateDraft(formatDateDisplayValue(canonical));
      return;
    }
    setDateDraft(formatDateDisplayValue(canonical));
  };

  const commitTimeDraft = () => {
    const parsedTime = parseTimeDisplayInput(timeDraft);
    if (parsedTime) {
      applyCanonical(mergeTimeIntoDatetimeLocal(canonical, parsedTime));
      return;
    }
    if (!timeDraft.trim()) {
      setTimeDraft(formatTimeDisplayValue(canonical));
      return;
    }
    setTimeDraft(formatTimeDisplayValue(canonical));
  };

  const datePickerValue = parseDateDisplayInput(dateDraft) ?? canonical.split("T")[0] ?? "";
  const timePickerValue = parseTimeDisplayInput(timeDraft) ?? canonical.split("T")[1] ?? "00:00";
  const minDateValue = minValue ? (parseDatetimeDisplayInput(minValue) ?? minValue).split("T")[0] : undefined;

  return (
    <div className="block min-w-0 space-y-2">
      <span className={`${labelClassName} block whitespace-nowrap`}>{label}</span>
      <div className="flex min-w-0 flex-wrap items-stretch gap-2">
        <input
          id={dateInputId}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          placeholder="09/07/2026"
          title="Date : JJ/MM/AAAA"
          value={dateDraft}
          onFocus={() => setDateFocused(true)}
          onChange={(e) => {
            const nextDate = e.target.value;
            setDateDraft(nextDate);
            if (parseDateDisplayInput(nextDate)) syncFromDrafts(nextDate, timeDraft);
          }}
          onBlur={() => {
            setDateFocused(false);
            commitDateDraft();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            }
          }}
          className={`${inputClassName} min-w-[8.5rem] flex-1 font-mono text-sm`}
        />

        <input
          id={timeInputId}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          placeholder="14:30"
          title="Heure : HH:mm"
          value={timeDraft}
          onFocus={() => setTimeFocused(true)}
          onChange={(e) => {
            const nextTime = e.target.value;
            setTimeDraft(nextTime);
            if (parseTimeDisplayInput(nextTime)) syncFromDrafts(dateDraft, nextTime);
          }}
          onBlur={() => {
            setTimeFocused(false);
            commitTimeDraft();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            }
          }}
          className={`${inputClassName} w-[5.5rem] shrink-0 font-mono text-sm`}
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
          aria-label="Choisir la date"
          onClick={() => datePickerRef.current?.showPicker?.() ?? datePickerRef.current?.click()}
          className={pickerBtnClass}
        >
          <Calendar className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Choisir l'heure"
          aria-label="Choisir l'heure"
          onClick={() => timePickerRef.current?.showPicker?.() ?? timePickerRef.current?.click()}
          className={pickerBtnClass}
        >
          <Clock className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function FreeAccessWindowFields({
  startsAt,
  endsAt,
  onStartsAtChange,
  onEndsAtChange,
  inputClassName,
  labelClassName = "text-xs font-bold uppercase tracking-wide text-emerald-200",
}: FreeAccessWindowFieldsProps) {
  return (
    <div className="space-y-3 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-4">
      <div className="flex items-start gap-2">
        <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
        <p className="text-xs font-medium leading-relaxed text-slate-200">
          Saisissez la <span className="font-semibold text-white">date</span> (
          <span className="font-mono text-emerald-300">09/07/2026</span>) et l&apos;
          <span className="font-semibold text-white">heure</span> (
          <span className="font-mono text-emerald-300">14:30</span>) au clavier, ou utilisez les boutons calendrier /
          horloge — tout se synchronise automatiquement.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FreeAccessDatetimeField
          idPrefix="free-access-starts-at"
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
          idPrefix="free-access-ends-at"
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
