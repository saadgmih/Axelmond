const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_LOCAL_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** Value for `<input type="datetime-local" />` in the user's local timezone. */
export function formatDatetimeLocalValue(value: Date | string | null | undefined, fallback = new Date()): string {
  const date = value ? new Date(value) : fallback;
  if (Number.isNaN(date.getTime())) return formatDatetimeLocalValue(null, fallback);

  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/** Convert a datetime-local string to ISO UTC for the API. */
export function datetimeLocalToIso(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  if (DATE_ONLY_PATTERN.test(value)) {
    return new Date(`${value}T00:00:00`).toISOString();
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export function isDatetimeLocalValue(value: string | null | undefined): boolean {
  return Boolean(value && (DATE_ONLY_PATTERN.test(value) || DATETIME_LOCAL_PATTERN.test(value)));
}

export function compareDatetimeLocalValues(left: string, right: string): number {
  const leftMs = new Date(left).getTime();
  const rightMs = new Date(right).getTime();
  if (Number.isNaN(leftMs) || Number.isNaN(rightMs)) return 0;
  return leftMs - rightMs;
}

export function defaultFreeAccessEndFromStart(startsAt: string): string {
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) return formatDatetimeLocalValue(new Date());
  const end = new Date(start);
  end.setDate(end.getDate() + 30);
  return formatDatetimeLocalValue(end);
}
