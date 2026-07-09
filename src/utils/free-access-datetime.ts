const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_LOCAL_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const DISPLAY_PATTERN = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/;
const DISPLAY_PATTERN_SECONDS = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/;
const ISO_SPACE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})$/;
const FRENCH_DATE_PATTERN = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
const TIME_PATTERN = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function toDatetimeLocalString(year: number, month: number, day: number, hours: number, minutes: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  const probe = new Date(year, month - 1, day, hours, minutes, 0, 0);
  if (
    probe.getFullYear() !== year ||
    probe.getMonth() !== month - 1 ||
    probe.getDate() !== day ||
    probe.getHours() !== hours ||
    probe.getMinutes() !== minutes
  ) {
    return null;
  }
  return `${year}-${pad2(month)}-${pad2(day)}T${pad2(hours)}:${pad2(minutes)}`;
}

/** Canonical value for API conversion (`YYYY-MM-DDTHH:mm`). */
export function formatDatetimeLocalValue(value: Date | string | null | undefined, fallback = new Date()): string {
  const date = value ? new Date(value) : fallback;
  if (Number.isNaN(date.getTime())) return formatDatetimeLocalValue(null, fallback);

  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/** Human-friendly value for free typing (`JJ/MM/AAAA HH:mm`). */
export function formatDatetimeDisplayValue(value: Date | string | null | undefined, fallback = new Date()): string {
  const local = formatDatetimeLocalValue(value, fallback);
  const [datePart, timePart] = local.split("T");
  const [year, month, day] = datePart.split("-");
  return `${day}/${month}/${year} ${timePart}`;
}

/** Date part for free typing (`JJ/MM/AAAA`). */
export function formatDateDisplayValue(value: Date | string | null | undefined, fallback = new Date()): string {
  const local = formatDatetimeLocalValue(value, fallback);
  const [datePart] = local.split("T");
  const [year, month, day] = datePart.split("-");
  return `${day}/${month}/${year}`;
}

/** Time part for free typing (`HH:mm`). */
export function formatTimeDisplayValue(value: Date | string | null | undefined, fallback = new Date()): string {
  const local = formatDatetimeLocalValue(value, fallback);
  return local.split("T")[1] || "00:00";
}

export function parseDateDisplayInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (DATE_ONLY_PATTERN.test(trimmed)) return trimmed;

  const french = trimmed.match(FRENCH_DATE_PATTERN);
  if (french) {
    const canonical = toDatetimeLocalString(Number(french[3]), Number(french[2]), Number(french[1]), 0, 0);
    return canonical ? canonical.split("T")[0] : null;
  }

  return null;
}

export function parseTimeDisplayInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const match = trimmed.match(TIME_PATTERN);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return `${pad2(hours)}:${pad2(minutes)}`;
}

export function mergeDisplayDateAndTime(
  datePart: string,
  timePart: string,
  fallback: Date | string | null | undefined = null,
): string | null {
  const base = parseDatetimeDisplayInput(typeof fallback === "string" ? fallback : "") ?? formatDatetimeLocalValue(fallback);
  const [baseDate, baseTime] = base.split("T");
  const date = parseDateDisplayInput(datePart) ?? baseDate;
  const time = parseTimeDisplayInput(timePart) ?? baseTime ?? "00:00";
  const canonical = `${date}T${time}`;
  return parseDatetimeDisplayInput(canonical) ? canonical : null;
}

export function parseDatetimeDisplayInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (DATETIME_LOCAL_PATTERN.test(trimmed)) {
    return trimmed.slice(0, 16);
  }

  if (DATE_ONLY_PATTERN.test(trimmed)) {
    return `${trimmed}T00:00`;
  }

  const frenchDateOnly = trimmed.match(FRENCH_DATE_PATTERN);
  if (frenchDateOnly) {
    return toDatetimeLocalString(
      Number(frenchDateOnly[3]),
      Number(frenchDateOnly[2]),
      Number(frenchDateOnly[1]),
      0,
      0,
    );
  }

  const isoSpace = trimmed.match(ISO_SPACE_PATTERN);
  if (isoSpace) {
    return toDatetimeLocalString(
      Number(isoSpace[1]),
      Number(isoSpace[2]),
      Number(isoSpace[3]),
      Number(isoSpace[4]),
      Number(isoSpace[5]),
    );
  }

  const withSeconds = trimmed.match(DISPLAY_PATTERN_SECONDS);
  if (withSeconds) {
    return toDatetimeLocalString(
      Number(withSeconds[3]),
      Number(withSeconds[2]),
      Number(withSeconds[1]),
      Number(withSeconds[4]),
      Number(withSeconds[5]),
    );
  }

  const display = trimmed.match(DISPLAY_PATTERN);
  if (display) {
    return toDatetimeLocalString(
      Number(display[3]),
      Number(display[2]),
      Number(display[1]),
      Number(display[4]),
      Number(display[5]),
    );
  }

  const fallback = new Date(trimmed);
  if (!Number.isNaN(fallback.getTime())) {
    return formatDatetimeLocalValue(fallback);
  }

  return null;
}

/** Convert a canonical datetime string to ISO UTC for the API. */
export function datetimeLocalToIso(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;

  const canonical = parseDatetimeDisplayInput(value) ?? (DATETIME_LOCAL_PATTERN.test(value) ? value.slice(0, 16) : null);
  if (!canonical) return null;

  const parsed = new Date(canonical);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export function isDatetimeLocalValue(value: string | null | undefined): boolean {
  return Boolean(value && parseDatetimeDisplayInput(value));
}

export function compareDatetimeLocalValues(left: string, right: string): number {
  const leftCanonical = parseDatetimeDisplayInput(left) ?? left;
  const rightCanonical = parseDatetimeDisplayInput(right) ?? right;
  const leftMs = new Date(leftCanonical).getTime();
  const rightMs = new Date(rightCanonical).getTime();
  if (Number.isNaN(leftMs) || Number.isNaN(rightMs)) return 0;
  return leftMs - rightMs;
}

export function defaultFreeAccessEndFromStart(startsAt: string): string {
  const canonical = parseDatetimeDisplayInput(startsAt) ?? startsAt;
  const start = new Date(canonical);
  if (Number.isNaN(start.getTime())) return formatDatetimeLocalValue(new Date());
  const end = new Date(start);
  end.setDate(end.getDate() + 30);
  return formatDatetimeLocalValue(end);
}

export function mergeDateIntoDatetimeLocal(current: string, datePart: string): string {
  const time = (parseDatetimeDisplayInput(current) ?? formatDatetimeLocalValue(null)).split("T")[1] || "00:00";
  return `${datePart}T${time}`;
}

export function mergeTimeIntoDatetimeLocal(current: string, timePart: string): string {
  const date = (parseDatetimeDisplayInput(current) ?? formatDatetimeLocalValue(null)).split("T")[0];
  return `${date}T${timePart.slice(0, 5)}`;
}
