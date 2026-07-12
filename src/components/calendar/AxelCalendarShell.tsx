import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Grid3X3, LayoutGrid, Plus, Square } from "lucide-react";
import {
  CALENDAR_VIEW_LABELS,
  MONTH_LABELS_SHORT,
  WEEKDAY_HEADERS,
  addDays,
  buildMonthGrid,
  dateToScheduleDayOfWeek,
  formatDateKey,
  formatFrenchDate,
  formatWeekRange,
  isSameDay,
  startOfWeekMonday,
  type CalendarViewMode,
} from "./calendar-utils";

export interface CalendarSessionMarker {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  dayOfWeek: number;
  occursOnDate?: string;
  moduleName?: string;
  sessionTypeLabel?: string;
}

interface AxelCalendarShellProps {
  sessions: CalendarSessionMarker[];
  accent?: "indigo" | "pink";
  matchBy?: "weekday" | "date" | "auto";
  labels?: {
    emptyDay?: string;
    emptyWeekDay?: string;
    add?: string;
    addSession?: string;
    addObjective?: string;
  };
  onAddSession?: () => void;
  onAddObjective?: () => void;
  onCreateSessionForDay?: (date: Date, dayOfWeek: number) => void;
  onCreateObjectiveForDay?: (date: Date, dayOfWeek: number) => void;
  onDayAction?: (date: Date, dayOfWeek: number) => void;
  onSessionClick?: (sessionId: string) => void;
}

const viewIcons: Record<CalendarViewMode, typeof Grid3X3> = {
  year: LayoutGrid,
  month: Square,
  week: CalendarDays,
  day: CalendarDays,
};

const addActionButtonClass =
  "inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-950/30 transition-all hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98]";

const viewSwitcherActive =
  "border-emerald-300/45 bg-gradient-to-b from-emerald-500/24 via-teal-600/14 to-[#031512]/70 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_10px_24px_rgba(5,194,165,0.22)]";

function sessionsForDay(
  sessions: CalendarSessionMarker[],
  date: Date,
  matchBy: "weekday" | "date" | "auto",
): CalendarSessionMarker[] {
  const dayOfWeek = dateToScheduleDayOfWeek(date);
  const dateKey = formatDateKey(date);
  return sessions
    .filter((session) => {
      if (matchBy === "date") return session.occursOnDate === dateKey;
      if (matchBy === "weekday") return session.dayOfWeek === dayOfWeek;
      if (session.occursOnDate) return session.occursOnDate === dateKey;
      return session.dayOfWeek === dayOfWeek;
    })
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export default function AxelCalendarShell({
  sessions,
  accent = "indigo",
  matchBy = "weekday",
  labels,
  onAddSession,
  onAddObjective,
  onCreateSessionForDay,
  onCreateObjectiveForDay,
  onDayAction,
  onSessionClick,
}: AxelCalendarShellProps) {
  const emptyDayLabel = labels?.emptyDay ?? "Aucune séance planifiée ce jour";
  const emptyWeekDayLabel = labels?.emptyWeekDay ?? "Aucune séance";
  const addLabel = labels?.add ?? "Ajouter";
  const addSessionLabel = labels?.addSession ?? "Séance";
  const addObjectiveLabel = labels?.addObjective ?? "Objectif";
  const today = useMemo(() => new Date(), []);
  const [viewMode, setViewMode] = useState<CalendarViewMode>("year");
  const [focusDate, setFocusDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), today.getDate()));

  const accentText = "text-emerald-300";
  const accentBg = "bg-emerald-500";
  const accentRing = "ring-emerald-400/40";
  const accentSoft = "text-emerald-200/90";
  const viewSwitcherIconActive = "text-emerald-200";

  const year = focusDate.getFullYear();
  const monthIndex = focusDate.getMonth();
  const weekStart = startOfWeekMonday(focusDate);

  const monthGrid = useMemo(() => buildMonthGrid(year, monthIndex, today), [year, monthIndex, today]);

  const shiftFocus = (delta: number, unit: "year" | "month" | "week" | "day") => {
    const next = new Date(focusDate);
    if (unit === "year") next.setFullYear(next.getFullYear() + delta);
    else if (unit === "month") next.setMonth(next.getMonth() + delta);
    else if (unit === "week") next.setDate(next.getDate() + delta * 7);
    else next.setDate(next.getDate() + delta);
    setFocusDate(next);
  };

  const selectDate = (date: Date) => {
    setFocusDate(new Date(date.getFullYear(), date.getMonth(), date.getDate()));
  };

  const renderMiniMonth = (month: number) => {
    const cells = buildMonthGrid(year, month, today);
    const isCurrentMonth = month === today.getMonth() && year === today.getFullYear();

    return (
      <button
        type="button"
        key={month}
        className={`rounded-2xl border border-white/[0.08] bg-[#0b241f]/80 p-2.5 text-left transition hover:border-white/15 hover:bg-[#0b241f] ${
          isCurrentMonth ? "ring-1 ring-emerald-500/30" : ""
        }`}
        onClick={() => {
          selectDate(new Date(year, month, 1));
          setViewMode("month");
        }}
      >
        <p className={`mb-1.5 text-[11px] font-black ${isCurrentMonth ? accentText : "text-slate-200"}`}>
          {MONTH_LABELS_SHORT[month]}
        </p>
        <div className="grid grid-cols-7 gap-0.5">
          {WEEKDAY_HEADERS.map((label, index) => (
            <span
              key={`${month}-head-${label}-${index}`}
              className={`text-center text-[8px] font-bold ${index >= 5 ? accentSoft : "text-slate-500"}`}
            >
              {label}
            </span>
          ))}
          {cells.map((cell) => {
            const daySessions = sessionsForDay(sessions, cell.date, matchBy);
            const visible = cell.inCurrentMonth;
            return (
              <span
                key={cell.date.toISOString()}
                className={`relative flex h-5 items-center justify-center rounded-full text-[9px] font-semibold ${
                  !visible
                    ? "text-transparent"
                    : cell.isToday
                      ? `${accentBg} text-white`
                      : cell.isWeekend
                        ? accentSoft
                        : "text-slate-300"
                }`}
              >
                {visible ? cell.date.getDate() : ""}
                {visible && daySessions.length > 0 && !cell.isToday && (
                  <span
                    className={`absolute bottom-0 h-1 w-1 rounded-full bg-emerald-400`}
                  />
                )}
              </span>
            );
          })}
        </div>
      </button>
    );
  };

  const renderMonthGrid = (cells = monthGrid, large = true) => (
    <div className={`grid grid-cols-7 ${large ? "gap-1.5 sm:gap-2" : "gap-0.5"}`}>
      {WEEKDAY_HEADERS.map((label, index) => (
        <div
          key={`header-${label}-${index}`}
          className={`py-1 text-center text-[10px] font-black uppercase tracking-wider sm:text-xs ${
            index >= 5 ? accentText : "text-slate-500"
          }`}
        >
          {label}
        </div>
      ))}
      {cells.map((cell) => {
        const daySessions = sessionsForDay(sessions, cell.date, matchBy);
        const selected = isSameDay(cell.date, focusDate);
        return (
          <button
            type="button"
            key={cell.date.toISOString()}
            onClick={() => {
              selectDate(cell.date);
              onDayAction?.(cell.date, cell.scheduleDayOfWeek);
              setViewMode("day");
            }}
            className={`min-h-[52px] rounded-xl border p-1.5 text-left transition sm:min-h-[64px] sm:p-2 ${
              !cell.inCurrentMonth
                ? "border-transparent bg-transparent opacity-35"
                : selected
                  ? `border-emerald-400/40 bg-emerald-500/10 ring-1 ${accentRing}`
                  : "border-white/[0.06] bg-[#031512]/50 hover:border-white/15 hover:bg-[#0b241f]"
            }`}
          >
            <span
              className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold sm:h-7 sm:w-7 ${
                cell.isToday ? `${accentBg} text-white` : cell.isWeekend ? accentSoft : "text-slate-200"
              }`}
            >
              {cell.date.getDate()}
            </span>
            {cell.inCurrentMonth && daySessions.length > 0 && (
              <div className="mt-1 space-y-0.5">
                {daySessions.slice(0, large ? 2 : 1).map((session) => (
                  <p key={session.id} className={`truncate text-[9px] font-semibold sm:text-[10px] ${accentText}`}>
                    {session.startTime} {session.title}
                  </p>
                ))}
                {daySessions.length > (large ? 2 : 1) && (
                  <p className="text-[9px] font-bold text-slate-500">+{daySessions.length - (large ? 2 : 1)}</p>
                )}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );

  const headerTitle =
    viewMode === "year"
      ? String(year)
      : viewMode === "month"
        ? `${MONTH_LABELS_SHORT[monthIndex]} ${year}`
        : viewMode === "week"
          ? formatWeekRange(weekStart)
          : formatFrenchDate(focusDate);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Période précédente"
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 hover:bg-white/10"
            onClick={() =>
              shiftFocus(
                -1,
                viewMode === "year" ? "year" : viewMode === "week" ? "week" : viewMode === "day" ? "day" : "month",
              )
            }
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="text-xl font-black text-white sm:text-2xl">{headerTitle}</h2>
          <button
            type="button"
            aria-label="Période suivante"
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 hover:bg-white/10"
            onClick={() =>
              shiftFocus(
                1,
                viewMode === "year" ? "year" : viewMode === "week" ? "week" : viewMode === "day" ? "day" : "month",
              )
            }
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        {(onAddSession || onAddObjective) && (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {onAddSession && (
              <button type="button" className={addActionButtonClass} onClick={onAddSession}>
                <Plus className="h-4 w-4" />
                {onAddObjective ? addSessionLabel : addLabel}
              </button>
            )}
            {onAddObjective && (
              <button type="button" className={addActionButtonClass} onClick={onAddObjective}>
                <Plus className="h-4 w-4" />
                {addObjectiveLabel}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-[#0b241f]/80 p-3 sm:p-4 md:p-5">
        {viewMode === "year" && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 sm:gap-3">
            {MONTH_LABELS_SHORT.map((_, index) => renderMiniMonth(index))}
          </div>
        )}

        {viewMode === "month" && renderMonthGrid()}

        {viewMode === "week" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
            {Array.from({ length: 7 }, (_, offset) => {
              const date = addDays(weekStart, offset);
              const daySessions = sessionsForDay(sessions, date, matchBy);
              const scheduleDay = dateToScheduleDayOfWeek(date);
              return (
                <button
                  type="button"
                  key={date.toISOString()}
                  onClick={() => {
                    selectDate(date);
                    setViewMode("day");
                  }}
                  className={`rounded-xl border p-3 text-left transition ${
                    isSameDay(date, focusDate)
                      ? "border-emerald-400/40 bg-emerald-500/10"
                      : "border-white/[0.08] bg-[#031512]/60 hover:border-white/15"
                  }`}
                >
                  <p className={`text-xs font-black ${scheduleDay >= 5 ? accentText : "text-white"}`}>
                    {WEEKDAY_HEADERS[scheduleDay]} {date.getDate()}
                  </p>
                  <div className="mt-2 space-y-2">
                    {daySessions.length === 0 ? (
                      <p className="text-[11px] text-slate-500">{emptyWeekDayLabel}</p>
                    ) : (
                      daySessions.map((session) => (
                        <div key={session.id} className="rounded-lg border border-white/[0.06] bg-black/20 px-2 py-1.5">
                          <p className="text-[11px] font-bold text-white">{session.title}</p>
                          <p className={`text-[10px] font-semibold ${accentText}`}>
                            {session.startTime} – {session.endTime}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {viewMode === "day" && (
          <div className="space-y-3">
            <p className="text-sm font-semibold capitalize text-slate-300">{formatFrenchDate(focusDate)}</p>
            {sessionsForDay(sessions, focusDate, matchBy).length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/[0.08] px-4 py-8 text-center text-sm text-slate-500">
                <p>{emptyDayLabel}</p>
                {(onCreateSessionForDay || onCreateObjectiveForDay) && (
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    {onCreateSessionForDay && (
                      <button
                        type="button"
                        className={addActionButtonClass}
                        onClick={() => onCreateSessionForDay(focusDate, dateToScheduleDayOfWeek(focusDate))}
                      >
                        <Plus className="h-4 w-4" />
                        {addSessionLabel}
                      </button>
                    )}
                    {onCreateObjectiveForDay && (
                      <button
                        type="button"
                        className={addActionButtonClass}
                        onClick={() => onCreateObjectiveForDay(focusDate, dateToScheduleDayOfWeek(focusDate))}
                      >
                        <Plus className="h-4 w-4" />
                        {addObjectiveLabel}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              sessionsForDay(sessions, focusDate, matchBy).map((session) => (
                <button
                  type="button"
                  key={session.id}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#031512]/70 p-4 text-left transition hover:border-emerald-400/30"
                  onClick={() => onSessionClick?.(session.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-black text-white">{session.title}</p>
                      {session.moduleName && <p className="text-xs text-slate-400">{session.moduleName}</p>}
                    </div>
                    {session.sessionTypeLabel && (
                      <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-emerald-200">
                        {session.sessionTypeLabel}
                      </span>
                    )}
                  </div>
                  <p className={`mt-2 text-xs font-bold ${accentText}`}>
                    {session.startTime} – {session.endTime}
                  </p>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <nav className="sticky bottom-0 z-20 rounded-3xl border border-white/[0.08] bg-[#031512]/92 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_36px_rgba(3,21,18,0.28)] backdrop-blur-xl sm:static sm:bg-[#031512]/88 sm:p-2">
        <div className="grid grid-cols-4 gap-1.5">
          {(Object.keys(CALENDAR_VIEW_LABELS) as CalendarViewMode[]).map((mode) => {
            const Icon = viewIcons[mode];
            const active = viewMode === mode;
            return (
              <button
                type="button"
                key={mode}
                aria-pressed={active}
                onClick={() => setViewMode(mode)}
                className={`group flex min-h-[58px] flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 py-2 text-[10px] font-black transition-all duration-200 sm:min-h-[64px] sm:text-xs ${
                  active
                    ? viewSwitcherActive
                    : "border-transparent text-slate-500 hover:border-white/[0.08] hover:bg-white/[0.04] hover:text-slate-200"
                }`}
              >
                <span
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-xl border transition-colors ${
                    active
                      ? `border-white/10 bg-white/10 ${viewSwitcherIconActive}`
                      : "border-transparent bg-transparent text-slate-500 group-hover:text-slate-300"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="leading-none">{CALENDAR_VIEW_LABELS[mode]}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </section>
  );
}
