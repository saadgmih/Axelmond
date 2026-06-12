export type CalendarViewMode = "year" | "month" | "week" | "day";

export const CALENDAR_VIEW_LABELS: Record<CalendarViewMode, string> = {
  year: "Année",
  month: "Mois",
  week: "Semaine",
  day: "Jour",
};

export const MONTH_LABELS_SHORT = [
  "Janv.",
  "Févr.",
  "Mars",
  "Avr.",
  "Mai",
  "Juin",
  "Juil.",
  "Août",
  "Sept.",
  "Oct.",
  "Nov.",
  "Déc.",
] as const;

export const WEEKDAY_HEADERS = ["L", "M", "M", "J", "V", "S", "D"] as const;

/** Axelmond schedule: 0 = Lundi … 6 = Dimanche */
export function dateToScheduleDayOfWeek(date: Date): number {
  const jsDay = date.getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
  );
}

export function startOfWeekMonday(date: Date): Date {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const scheduleDay = dateToScheduleDayOfWeek(copy);
  copy.setDate(copy.getDate() - scheduleDay);
  return copy;
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  copy.setDate(copy.getDate() + days);
  return copy;
}

export interface CalendarDayCell {
  date: Date;
  inCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  scheduleDayOfWeek: number;
}

export function buildMonthGrid(year: number, monthIndex: number, today = new Date()): CalendarDayCell[] {
  const firstOfMonth = new Date(year, monthIndex, 1);
  const gridStart = startOfWeekMonday(firstOfMonth);
  const cells: CalendarDayCell[] = [];

  for (let i = 0; i < 42; i += 1) {
    const date = addDays(gridStart, i);
    const scheduleDayOfWeek = dateToScheduleDayOfWeek(date);
    cells.push({
      date,
      inCurrentMonth: date.getMonth() === monthIndex,
      isToday: isSameDay(date, today),
      isWeekend: scheduleDayOfWeek >= 5,
      scheduleDayOfWeek,
    });
  }

  return cells;
}

export function formatFrenchDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatWeekRange(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6);
  const startLabel = weekStart.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  const endLabel = weekEnd.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  return `${startLabel} – ${endLabel}`;
}
