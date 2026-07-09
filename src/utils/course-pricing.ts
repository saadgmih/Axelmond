import { COURSE_ENROLLMENT_ACCESS_DAYS } from "../enrollment-access";
import { formatFreeAccessWindowLabel, resolveCourseFreeAccessWindow } from "../course-free-access-window";

export const FREE_COURSE_PRICE = 0;
export const MIN_PAID_COURSE_PRICE = 10;
export const MAX_COURSE_PRICE = 499;
export const COURSE_PRICE_STEP = 1;
export const FREE_ACCESS_UNLIMITED_VALUE = "";
export const FREE_ACCESS_DURATION_OPTIONS = [7, 14, 30, 60, 90] as const;

export function isFreeCoursePrice(value: number): boolean {
  return !Number.isFinite(value) || value <= FREE_COURSE_PRICE;
}

export function clampPaidCoursePrice(value: number): number {
  const safeValue = Number.isFinite(value) ? value : MIN_PAID_COURSE_PRICE;
  const stepped = Math.round(safeValue / COURSE_PRICE_STEP) * COURSE_PRICE_STEP;
  return Math.min(MAX_COURSE_PRICE, Math.max(MIN_PAID_COURSE_PRICE, Number(stepped.toFixed(2))));
}

export function normalizeCoursePrice(value: number): number {
  if (isFreeCoursePrice(value)) return FREE_COURSE_PRICE;
  return clampPaidCoursePrice(value);
}

export function normalizeCoursePriceForSave(isFree: boolean, value: number): number {
  if (isFree) return FREE_COURSE_PRICE;
  return clampPaidCoursePrice(value);
}

export function isValidCoursePrice(value: number): boolean {
  if (!Number.isFinite(value)) return false;
  return value === FREE_COURSE_PRICE || value >= MIN_PAID_COURSE_PRICE;
}

export function normalizeFreeAccessDurationDays(value: string | number | null | undefined): number | null {
  if (value == null || value === FREE_ACCESS_UNLIMITED_VALUE) return null;

  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return null;

  const days = Math.trunc(parsed);
  return days > 0 ? days : null;
}

export function freeAccessDurationInputValue(value: number | null | undefined): string {
  return value && value > 0 ? String(Math.trunc(value)) : FREE_ACCESS_UNLIMITED_VALUE;
}

export function formatDateInputValue(value: Date | string | null | undefined, fallback = new Date()): string {
  const date = value ? new Date(value) : fallback;
  if (Number.isNaN(date.getTime())) return fallback.toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

export function getEffectiveFreeAccessDurationDays(value: number | null | undefined): number {
  return normalizeFreeAccessDurationDays(value) ?? COURSE_ENROLLMENT_ACCESS_DAYS;
}

export function getFreeAccessWindowEndDate(
  startsAt: Date | string | null | undefined,
  durationDays: number | null | undefined,
  explicitEndsAt?: Date | string | null,
): Date | null {
  if (explicitEndsAt) {
    const endDate = new Date(explicitEndsAt);
    if (!Number.isNaN(endDate.getTime())) return endDate;
  }
  if (!startsAt) return null;
  const startDate = new Date(startsAt);
  if (Number.isNaN(startDate.getTime())) return null;
  return new Date(startDate.getTime() + getEffectiveFreeAccessDurationDays(durationDays) * 24 * 60 * 60 * 1000);
}

export function formatFreeAccessDurationLabel(
  value: number | null | undefined,
  startsAt?: Date | string | null,
  endsAt?: Date | string | null,
): string {
  if (startsAt && endsAt) {
    return formatFreeAccessWindowLabel(startsAt, endsAt);
  }

  const window = resolveCourseFreeAccessWindow({
    price: 0,
    freeAccessStartsAt: startsAt,
    freeAccessEndsAt: endsAt,
    freeAccessDurationDays: value,
  });
  if (window) {
    return formatFreeAccessWindowLabel(window.startsAt, window.endsAt);
  }

  const days = normalizeFreeAccessDurationDays(value) ?? COURSE_ENROLLMENT_ACCESS_DAYS;
  return `Gratuit ${days} jour${days > 1 ? "s" : ""}`;
}
