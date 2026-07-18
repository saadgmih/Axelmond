import { randomBytes } from "node:crypto";

export const PROMO_CODE_MAX_LENGTH = 32;
export const PROMO_CODE_MIN_LENGTH = 4;
export const PROMO_TIME_ZONE = "Africa/Casablanca";
export const PROMO_CURRENCY = "MAD";
export const PROMO_CODE_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

export type PromoDiscountKind = "PERCENTAGE" | "FIXED";
export type PromoAdministrativeState =
  | "DRAFT"
  | "SCHEDULED"
  | "ACTIVE"
  | "PAUSED"
  | "EXPIRED"
  | "DISABLED"
  | "ARCHIVED";

export type CalendarDuration = {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

export type PromoMoneyQuote = {
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  currency: string;
};

export function normalizePromoCodeInput(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

export function assertValidPromoCodeFormat(value: unknown): string {
  const code = normalizePromoCodeInput(value);
  if (code.length < PROMO_CODE_MIN_LENGTH || code.length > PROMO_CODE_MAX_LENGTH || !PROMO_CODE_PATTERN.test(code)) {
    throw new Error("PROMO_CODE_FORMAT_INVALID");
  }
  return code;
}

export function generateSecurePromoCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  const part = (offset: number) =>
    Array.from(bytes.subarray(offset, offset + 4), (byte) => alphabet[byte % alphabet.length]).join("");
  return `PA-${part(0)}-${part(4)}`;
}

export function generatePromoPublicId(): string {
  return `PROMO-${randomBytes(9).toString("base64url").toUpperCase()}`;
}

export function generatePromoUsageReference(): string {
  return `PR-${randomBytes(9).toString("base64url").toUpperCase()}`;
}

export function toMoneyCents(value: number | string): number {
  const normalized = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(normalized)) throw new Error("PROMO_AMOUNT_INVALID");
  return Math.round(normalized * 100);
}

export function fromMoneyCents(value: number): number {
  return value / 100;
}

export function calculatePromoDiscount(input: {
  originalAmount: number;
  discountType: PromoDiscountKind;
  discountValue: number;
  maximumDiscountAmount?: number | null;
  currency?: string;
}): PromoMoneyQuote {
  const originalCents = Math.max(0, toMoneyCents(input.originalAmount));
  const discountValueCents = toMoneyCents(input.discountValue);
  if (discountValueCents <= 0) throw new Error("PROMO_DISCOUNT_INVALID");
  if (input.discountType === "PERCENTAGE" && input.discountValue > 100) {
    throw new Error("PROMO_PERCENTAGE_TOO_HIGH");
  }

  let discountCents =
    input.discountType === "PERCENTAGE" ? Math.round((originalCents * input.discountValue) / 100) : discountValueCents;
  if (input.discountType === "PERCENTAGE" && input.maximumDiscountAmount != null) {
    discountCents = Math.min(discountCents, Math.max(0, toMoneyCents(input.maximumDiscountAmount)));
  }
  discountCents = Math.min(originalCents, Math.max(0, discountCents));
  return {
    originalAmount: fromMoneyCents(originalCents),
    discountAmount: fromMoneyCents(discountCents),
    finalAmount: fromMoneyCents(originalCents - discountCents),
    currency: input.currency || PROMO_CURRENCY,
  };
}

function daysInUtcMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

export function normalizeCalendarDuration(input: Partial<CalendarDuration>): CalendarDuration {
  const read = (value: unknown) => {
    const number = Number(value ?? 0);
    if (!Number.isInteger(number) || number < 0 || number > 10000) throw new Error("PROMO_DURATION_INVALID");
    return number;
  };
  const duration = {
    years: read(input.years),
    months: read(input.months),
    days: read(input.days),
    hours: read(input.hours),
    minutes: read(input.minutes),
    seconds: read(input.seconds),
  };
  if (Object.values(duration).every((value) => value === 0)) throw new Error("PROMO_DURATION_EMPTY");
  return duration;
}

/** Calendar-aware UTC addition: years/months are never approximated as a number of days. */
export function addCalendarDurationUtc(startsAt: Date, rawDuration: Partial<CalendarDuration>): Date {
  if (!Number.isFinite(startsAt.getTime())) throw new Error("PROMO_START_DATE_INVALID");
  const duration = normalizeCalendarDuration(rawDuration);
  const result = new Date(startsAt.getTime());
  const originalDay = result.getUTCDate();
  const totalMonth = result.getUTCMonth() + duration.months;
  const targetYear = result.getUTCFullYear() + duration.years + Math.floor(totalMonth / 12);
  const targetMonth = ((totalMonth % 12) + 12) % 12;
  result.setUTCDate(1);
  result.setUTCFullYear(targetYear);
  result.setUTCMonth(targetMonth);
  result.setUTCDate(Math.min(originalDay, daysInUtcMonth(targetYear, targetMonth)));
  result.setUTCDate(result.getUTCDate() + duration.days);
  result.setUTCHours(result.getUTCHours() + duration.hours);
  result.setUTCMinutes(result.getUTCMinutes() + duration.minutes);
  result.setUTCSeconds(result.getUTCSeconds() + duration.seconds);
  return result;
}

function zonedDateParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month) - 1,
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

function zonedWallTimeToInstant(parts: ReturnType<typeof zonedDateParts>, timeZone: string) {
  const targetWall = Date.UTC(parts.year, parts.month, parts.day, parts.hour, parts.minute, parts.second);
  let guess = targetWall;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const observed = zonedDateParts(new Date(guess), timeZone);
    const observedWall = Date.UTC(
      observed.year,
      observed.month,
      observed.day,
      observed.hour,
      observed.minute,
      observed.second,
    );
    const delta = targetWall - observedWall;
    if (delta === 0) break;
    guess += delta;
  }
  return new Date(guess);
}

/** Parses a browser datetime-local value as a wall-clock time in the centre time zone. */
export function parseDateTimeInTimeZone(value: string, timeZone = PROMO_TIME_ZONE): Date {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) throw new Error("PROMO_LOCAL_DATE_INVALID");
  const parts = {
    year: Number(match[1]),
    month: Number(match[2]) - 1,
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: Number(match[6] || 0),
  };
  const instant = zonedWallTimeToInstant(parts, timeZone);
  const observed = zonedDateParts(instant, timeZone);
  if (Object.keys(parts).some((key) => parts[key as keyof typeof parts] !== observed[key as keyof typeof observed])) {
    throw new Error("PROMO_LOCAL_DATE_INVALID");
  }
  return instant;
}

/** Adds a calendar duration while preserving local wall-clock semantics in the configured centre time zone. */
export function addCalendarDurationInTimeZone(
  startsAt: Date,
  rawDuration: Partial<CalendarDuration>,
  timeZone = PROMO_TIME_ZONE,
): Date {
  if (!Number.isFinite(startsAt.getTime())) throw new Error("PROMO_START_DATE_INVALID");
  const duration = normalizeCalendarDuration(rawDuration);
  const local = zonedDateParts(startsAt, timeZone);
  const totalMonth = local.month + duration.months;
  const targetYear = local.year + duration.years + Math.floor(totalMonth / 12);
  const targetMonth = ((totalMonth % 12) + 12) % 12;
  const surrogate = new Date(
    Date.UTC(
      targetYear,
      targetMonth,
      Math.min(local.day, daysInUtcMonth(targetYear, targetMonth)),
      local.hour,
      local.minute,
      local.second,
    ),
  );
  surrogate.setUTCDate(surrogate.getUTCDate() + duration.days);
  surrogate.setUTCHours(surrogate.getUTCHours() + duration.hours);
  surrogate.setUTCMinutes(surrogate.getUTCMinutes() + duration.minutes);
  surrogate.setUTCSeconds(surrogate.getUTCSeconds() + duration.seconds);
  return zonedWallTimeToInstant(
    {
      year: surrogate.getUTCFullYear(),
      month: surrogate.getUTCMonth(),
      day: surrogate.getUTCDate(),
      hour: surrogate.getUTCHours(),
      minute: surrogate.getUTCMinutes(),
      second: surrogate.getUTCSeconds(),
    },
    timeZone,
  );
}

export function resolvePromoEffectiveStatus(input: {
  administrativeStatus: PromoAdministrativeState;
  startsAt: Date;
  endsAt: Date;
  maxTotalUses?: number | null;
  totalConfirmedUses?: number;
  totalReservedUses?: number;
  now?: Date;
}): PromoAdministrativeState {
  const now = input.now || new Date();
  if (["DRAFT", "PAUSED", "EXPIRED", "DISABLED", "ARCHIVED"].includes(input.administrativeStatus)) {
    return input.administrativeStatus;
  }
  if (now < input.startsAt) return "SCHEDULED";
  if (now >= input.endsAt) return "EXPIRED";
  if (
    input.maxTotalUses != null &&
    (input.totalConfirmedUses || 0) + (input.totalReservedUses || 0) >= input.maxTotalUses
  ) {
    return "EXPIRED";
  }
  return "ACTIVE";
}

export function formatPromoDate(date: Date, locale = "fr-MA", timeZone = PROMO_TIME_ZONE): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone,
  }).format(date);
}

export function formatRemainingDuration(endsAt: Date, now = new Date()): string {
  let remainingSeconds = Math.max(0, Math.floor((endsAt.getTime() - now.getTime()) / 1000));
  if (remainingSeconds === 0) return "Expiré";
  const days = Math.floor(remainingSeconds / 86400);
  remainingSeconds %= 86400;
  const hours = Math.floor(remainingSeconds / 3600);
  remainingSeconds %= 3600;
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days} jour${days > 1 ? "s" : ""}`);
  if (hours) parts.push(`${hours} heure${hours > 1 ? "s" : ""}`);
  if (minutes) parts.push(`${minutes} minute${minutes > 1 ? "s" : ""}`);
  if (!days && !hours && seconds) parts.push(`${seconds} seconde${seconds > 1 ? "s" : ""}`);
  return parts.slice(0, 3).join(", ");
}
