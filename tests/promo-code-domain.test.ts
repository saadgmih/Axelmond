import { describe, expect, it } from "vitest";
import {
  addCalendarDurationInTimeZone,
  addCalendarDurationUtc,
  assertValidPromoCodeFormat,
  calculatePromoDiscount,
  formatRemainingDuration,
  generateSecurePromoCode,
  normalizeCalendarDuration,
  normalizePromoCodeInput,
  parseDateTimeInTimeZone,
  PROMO_TIME_ZONE,
  resolvePromoEffectiveStatus,
} from "../src/promo-code-domain";

describe("promo code domain", () => {
  it("normalizes manual codes consistently", () => {
    expect(normalizePromoCodeInput("  saad-2026 ")).toBe("SAAD-2026");
  });

  it.each(["RENTREE2026", "BIENVENUE20", "SAAD-2026", "MODULE50"])("accepts valid code %s", (code) => {
    expect(assertValidPromoCodeFormat(code)).toBe(code);
  });

  it.each(["A", "A B", "-PROMO", "PROMO-", "PROMO_20", "ÉTÉ2026"])("rejects invalid code %s", (code) => {
    expect(() => assertValidPromoCodeFormat(code)).toThrow("PROMO_CODE_FORMAT_INVALID");
  });

  it("generates non-sequential codes with the documented shape", () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateSecurePromoCode()));
    expect(codes.size).toBe(50);
    expect([...codes].every((code) => /^PA-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/.test(code))).toBe(true);
  });

  it("calculates a percentage in integer cents", () => {
    expect(calculatePromoDiscount({ originalAmount: 400, discountType: "PERCENTAGE", discountValue: 20 })).toEqual({
      originalAmount: 400,
      discountAmount: 80,
      finalAmount: 320,
      currency: "MAD",
    });
  });

  it("rounds fractional percentages to the nearest cent", () => {
    expect(
      calculatePromoDiscount({ originalAmount: 333.33, discountType: "PERCENTAGE", discountValue: 12.5 }),
    ).toMatchObject({ discountAmount: 41.67, finalAmount: 291.66 });
  });

  it("caps percentage discounts", () => {
    expect(
      calculatePromoDiscount({
        originalAmount: 1000,
        discountType: "PERCENTAGE",
        discountValue: 50,
        maximumDiscountAmount: 200,
      }),
    ).toMatchObject({ discountAmount: 200, finalAmount: 800 });
  });

  it("calculates a fixed discount", () => {
    expect(calculatePromoDiscount({ originalAmount: 350, discountType: "FIXED", discountValue: 100 })).toMatchObject({
      discountAmount: 100,
      finalAmount: 250,
    });
  });

  it("never produces a negative final price", () => {
    expect(calculatePromoDiscount({ originalAmount: 50, discountType: "FIXED", discountValue: 100 })).toMatchObject({
      discountAmount: 50,
      finalAmount: 0,
    });
  });

  it("supports a 100 percent free activation", () => {
    expect(
      calculatePromoDiscount({ originalAmount: 198, discountType: "PERCENTAGE", discountValue: 100 }).finalAmount,
    ).toBe(0);
  });

  it("rejects percentages greater than 100", () => {
    expect(() =>
      calculatePromoDiscount({ originalAmount: 10, discountType: "PERCENTAGE", discountValue: 100.01 }),
    ).toThrow("PROMO_PERCENTAGE_TOO_HIGH");
  });

  it.each([0, -1, Number.NaN])("rejects invalid discount %s", (discountValue) => {
    expect(() => calculatePromoDiscount({ originalAmount: 10, discountType: "FIXED", discountValue })).toThrow();
  });

  it("validates a composed duration", () => {
    expect(normalizeCalendarDuration({ years: 1, months: 2, days: 10, hours: 4, minutes: 30, seconds: 15 })).toEqual({
      years: 1,
      months: 2,
      days: 10,
      hours: 4,
      minutes: 30,
      seconds: 15,
    });
  });

  it("rejects an empty relative duration", () => {
    expect(() => normalizeCalendarDuration({})).toThrow("PROMO_DURATION_EMPTY");
  });

  it("adds a calendar month without assuming 30 days", () => {
    expect(addCalendarDurationUtc(new Date("2026-01-31T08:00:00Z"), { months: 1 }).toISOString()).toBe(
      "2026-02-28T08:00:00.000Z",
    );
  });

  it("adds one calendar year across a leap day", () => {
    expect(addCalendarDurationUtc(new Date("2024-02-29T08:00:00Z"), { years: 1 }).toISOString()).toBe(
      "2025-02-28T08:00:00.000Z",
    );
  });

  it("adds years, months, days, hours, minutes and seconds", () => {
    expect(
      addCalendarDurationUtc(new Date("2026-01-10T08:00:00Z"), {
        years: 1,
        months: 2,
        days: 3,
        hours: 4,
        minutes: 5,
        seconds: 6,
      }).toISOString(),
    ).toBe("2027-03-13T12:05:06.000Z");
  });

  it("preserves Casablanca wall-clock time across calendar addition", () => {
    const start = new Date("2026-03-20T10:15:00Z");
    const end = addCalendarDurationInTimeZone(start, { months: 2 }, PROMO_TIME_ZONE);
    const hour = new Intl.DateTimeFormat("en", { timeZone: PROMO_TIME_ZONE, hour: "2-digit", hourCycle: "h23" }).format(
      end,
    );
    const startHour = new Intl.DateTimeFormat("en", {
      timeZone: PROMO_TIME_ZONE,
      hour: "2-digit",
      hourCycle: "h23",
    }).format(start);
    expect(hour).toBe(startHour);
  });

  it("parses datetime-local values in Africa/Casablanca independently from the browser zone", () => {
    expect(parseDateTimeInTimeZone("2026-07-20T10:15:30").toISOString()).toBe("2026-07-20T09:15:30.000Z");
  });

  it("reports draft regardless of dates", () => {
    expect(
      resolvePromoEffectiveStatus({
        administrativeStatus: "DRAFT",
        startsAt: new Date("2026-01-01Z"),
        endsAt: new Date("2027-01-01Z"),
        now: new Date("2026-07-18Z"),
      }),
    ).toBe("DRAFT");
  });

  it("reports a programmed activation before its start", () => {
    expect(
      resolvePromoEffectiveStatus({
        administrativeStatus: "ACTIVE",
        startsAt: new Date("2026-07-19Z"),
        endsAt: new Date("2026-07-20Z"),
        now: new Date("2026-07-18Z"),
      }),
    ).toBe("SCHEDULED");
  });

  it("reports active at the exact start second", () => {
    expect(
      resolvePromoEffectiveStatus({
        administrativeStatus: "SCHEDULED",
        startsAt: new Date("2026-07-18T08:00:00Z"),
        endsAt: new Date("2026-07-18T08:00:01Z"),
        now: new Date("2026-07-18T08:00:00Z"),
      }),
    ).toBe("ACTIVE");
  });

  it("expires at the exact end second", () => {
    expect(
      resolvePromoEffectiveStatus({
        administrativeStatus: "ACTIVE",
        startsAt: new Date("2026-07-18T07:00:00Z"),
        endsAt: new Date("2026-07-18T08:00:00Z"),
        now: new Date("2026-07-18T08:00:00Z"),
      }),
    ).toBe("EXPIRED");
  });

  it.each(["PAUSED", "DISABLED", "ARCHIVED"] as const)("honors administrative state %s", (administrativeStatus) => {
    expect(
      resolvePromoEffectiveStatus({
        administrativeStatus,
        startsAt: new Date("2026-01-01Z"),
        endsAt: new Date("2027-01-01Z"),
        now: new Date("2026-07-18Z"),
      }),
    ).toBe(administrativeStatus);
  });

  it("becomes unavailable when all uses are reserved or confirmed", () => {
    expect(
      resolvePromoEffectiveStatus({
        administrativeStatus: "ACTIVE",
        startsAt: new Date("2026-01-01Z"),
        endsAt: new Date("2027-01-01Z"),
        maxTotalUses: 5,
        totalConfirmedUses: 3,
        totalReservedUses: 2,
        now: new Date("2026-07-18Z"),
      }),
    ).toBe("EXPIRED");
  });

  it("formats a readable remaining duration", () => {
    expect(formatRemainingDuration(new Date("2026-07-20T04:30:00Z"), new Date("2026-07-18T01:00:00Z"))).toBe(
      "2 jours, 3 heures, 30 minutes",
    );
  });
});
