import { CalendarClock } from "lucide-react";
import { compareDatetimeLocalValues, defaultFreeAccessEndFromStart } from "../utils/free-access-datetime";

type FreeAccessWindowFieldsProps = {
  startsAt: string;
  endsAt: string;
  onStartsAtChange: (value: string) => void;
  onEndsAtChange: (value: string) => void;
  inputClassName: string;
  labelClassName?: string;
};

export default function FreeAccessWindowFields({
  startsAt,
  endsAt,
  onStartsAtChange,
  onEndsAtChange,
  inputClassName,
  labelClassName = "text-[10px] font-bold uppercase tracking-wide text-slate-500",
}: FreeAccessWindowFieldsProps) {
  return (
    <div className="space-y-3 rounded-xl border border-emerald-100/80 bg-emerald-50/40 p-4">
      <div className="flex items-start gap-2">
        <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        <p className="text-[10px] font-semibold leading-relaxed text-slate-600">
          Période fixe au calendrier : choisissez la date via le calendrier, l&apos;heure via l&apos;horloge, ou
          saisissez directement (jour, mois, année, heure, minute).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block min-w-0 space-y-1.5">
          <span className={`${labelClassName} block whitespace-nowrap`}>Début de gratuité</span>
          <input
            type="datetime-local"
            step={60}
            value={startsAt}
            onChange={(e) => {
              const nextStart = e.target.value;
              onStartsAtChange(nextStart);
              if (!endsAt || compareDatetimeLocalValues(endsAt, nextStart) <= 0) {
                onEndsAtChange(defaultFreeAccessEndFromStart(nextStart));
              }
            }}
            className={`${inputClassName} min-w-0 w-full text-slate-700`}
          />
        </label>

        <label className="block min-w-0 space-y-1.5">
          <span className={`${labelClassName} block whitespace-nowrap`}>Fin de gratuité</span>
          <input
            type="datetime-local"
            step={60}
            min={startsAt || undefined}
            value={endsAt}
            onChange={(e) => onEndsAtChange(e.target.value)}
            className={`${inputClassName} min-w-0 w-full text-slate-700`}
          />
        </label>
      </div>
    </div>
  );
}
