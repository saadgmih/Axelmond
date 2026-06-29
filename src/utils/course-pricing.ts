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

export function formatFreeAccessDurationLabel(value: number | null | undefined): string {
  const days = normalizeFreeAccessDurationDays(value);
  if (!days) return "Gratuit illimité";
  return `Gratuit ${days} jour${days > 1 ? "s" : ""}`;
}
