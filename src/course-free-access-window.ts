import { COURSE_ENROLLMENT_ACCESS_DAYS } from "./enrollment-access";

export type FreeAccessCourseLike = {
  price?: number | null;
  freeAccessStartsAt?: Date | string | null;
  freeAccessEndsAt?: Date | string | null;
  freeAccessDurationDays?: number | null;
  createdAt?: Date | string | null;
};

export type ResolvedFreeAccessWindow = {
  startsAt: Date;
  endsAt: Date;
};

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function normalizeDurationDays(value: number | null | undefined): number | null {
  if (value == null) return null;
  const days = Math.trunc(value);
  return days > 0 ? days : null;
}

function toDateOnlyString(value: Date | string): string {
  if (typeof value === "string" && DATE_ONLY_PATTERN.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

/** Inclusive calendar start (00:00:00.000 UTC). */
export function parseCalendarDateStart(value: Date | string): Date {
  return new Date(`${toDateOnlyString(value)}T00:00:00.000Z`);
}

/** Inclusive calendar end (23:59:59.999 UTC). */
export function parseCalendarDateEnd(value: Date | string): Date {
  return new Date(`${toDateOnlyString(value)}T23:59:59.999Z`);
}

export function deriveInclusiveFreeAccessDays(startsAt: Date, endsAt: Date): number {
  const startMs = parseCalendarDateStart(startsAt).getTime();
  const endMs = parseCalendarDateStart(endsAt).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) return 0;
  return Math.floor((endMs - startMs) / (24 * 60 * 60 * 1000)) + 1;
}

export function normalizeFreeAccessWindowInput(
  startsAt?: Date | string | null,
  endsAt?: Date | string | null,
): ResolvedFreeAccessWindow | null {
  if (!startsAt || !endsAt) return null;

  const normalizedStartsAt = parseCalendarDateStart(startsAt);
  const normalizedEndsAt = parseCalendarDateEnd(endsAt);
  if (Number.isNaN(normalizedStartsAt.getTime()) || Number.isNaN(normalizedEndsAt.getTime())) return null;
  if (normalizedEndsAt <= normalizedStartsAt) return null;

  return { startsAt: normalizedStartsAt, endsAt: normalizedEndsAt };
}

/**
 * Fixed free-access window for a course. Dates are calendar-based and never depend
 * on when a student enrolls.
 */
export function resolveCourseFreeAccessWindow(course: FreeAccessCourseLike): ResolvedFreeAccessWindow | null {
  if (typeof course.price === "number" && course.price > 0) return null;

  const explicitWindow = normalizeFreeAccessWindowInput(course.freeAccessStartsAt, course.freeAccessEndsAt);
  if (explicitWindow) return explicitWindow;

  const legacyStart = course.freeAccessStartsAt ?? course.createdAt;
  if (!legacyStart) return null;

  const startsAt = parseCalendarDateStart(legacyStart);
  const durationDays = normalizeDurationDays(course.freeAccessDurationDays) ?? COURSE_ENROLLMENT_ACCESS_DAYS;
  const endsAt = new Date(startsAt.getTime() + durationDays * 24 * 60 * 60 * 1000 - 1);

  return { startsAt, endsAt };
}

export function resolveFreeEnrollmentEndDate(course: FreeAccessCourseLike, now = new Date()): Date {
  const window = resolveCourseFreeAccessWindow(course);
  if (!window) return new Date(now.getTime() + COURSE_ENROLLMENT_ACCESS_DAYS * 24 * 60 * 60 * 1000);
  return window.endsAt;
}

export function isBeforeFreeAccessWindow(course: FreeAccessCourseLike, now = new Date()): boolean {
  const window = resolveCourseFreeAccessWindow(course);
  if (!window) return false;
  return now < window.startsAt;
}

export function isAfterFreeAccessWindow(course: FreeAccessCourseLike, now = new Date()): boolean {
  const window = resolveCourseFreeAccessWindow(course);
  if (!window) return false;
  return now > window.endsAt;
}

export function formatFreeAccessWindowLabel(startsAt: Date | string, endsAt: Date | string): string {
  const startLabel = parseCalendarDateStart(startsAt).toLocaleDateString("fr-FR");
  const endLabel = parseCalendarDateStart(endsAt).toLocaleDateString("fr-FR");
  return `Gratuit du ${startLabel} au ${endLabel}`;
}

export function resolveFreeAccessWindowForSave(
  startsAt?: Date | string | null,
  endsAt?: Date | string | null,
): { freeAccessStartsAt: Date; freeAccessEndsAt: Date; freeAccessDurationDays: number } | null {
  const window = normalizeFreeAccessWindowInput(startsAt, endsAt);
  if (!window) return null;

  return {
    freeAccessStartsAt: window.startsAt,
    freeAccessEndsAt: window.endsAt,
    freeAccessDurationDays: deriveInclusiveFreeAccessDays(window.startsAt, window.endsAt),
  };
}
