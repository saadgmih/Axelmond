import { describe, expect, it } from "vitest";
import {
  buildCenterPaymentExpiry,
  canTransitionCenterPayment,
  centerPaymentAmountsMatch,
  CENTER_PAYMENT_METHODS,
  generateCenterPaymentReference,
  generateCenterReceiptNumber,
  isCenterPaymentReference,
  isValidCenterPaymentIdempotencyKey,
  normalizeCenterPaymentNote,
} from "../src/center-payment-domain";

describe("center payment domain", () => {
  it("1. generates a readable public request reference", () => {
    expect(generateCenterPaymentReference(new Date("2026-07-17T00:00:00Z"))).toMatch(/^PC-2026-\d{6}$/);
  });
  it("2. never exposes a database id in the public reference", () => {
    expect(isCenterPaymentReference("ckz_internal_database_id")).toBe(false);
  });
  it("3. generates a unique-format receipt number", () => {
    expect(generateCenterReceiptNumber(new Date("2026-07-17T00:00:00Z"))).toMatch(/^REC-2026-\d{6}$/);
  });
  it("4. computes the default five-day deadline precisely", () => {
    const now = new Date("2026-07-17T12:00:00Z");
    expect(buildCenterPaymentExpiry(now, 5).toISOString()).toBe("2026-07-22T12:00:00.000Z");
  });
  it("5. accepts an exact received amount", () => expect(centerPaymentAmountsMatch(350, 350)).toBe(true));
  it("6. rejects an underpayment", () => expect(centerPaymentAmountsMatch(350, 349.99)).toBe(false));
  it("7. rejects an unexplained overpayment", () => expect(centerPaymentAmountsMatch(350, 350.01)).toBe(false));
  it("8. compares monetary values at cent precision", () =>
    expect(centerPaymentAmountsMatch(19.8, 19.8001)).toBe(true));
  it("9. allows pending to review", () =>
    expect(canTransitionCenterPayment("PENDING_PAYMENT", "UNDER_REVIEW")).toBe(true));
  it("10. allows pending to paid", () => expect(canTransitionCenterPayment("PENDING_PAYMENT", "PAID")).toBe(true));
  it("11. allows pending to expired", () =>
    expect(canTransitionCenterPayment("PENDING_PAYMENT", "EXPIRED")).toBe(true));
  it("12. allows pending to cancelled", () =>
    expect(canTransitionCenterPayment("PENDING_PAYMENT", "CANCELLED")).toBe(true));
  it("13. allows review to paid", () => expect(canTransitionCenterPayment("UNDER_REVIEW", "PAID")).toBe(true));
  it("14. allows review to rejected", () => expect(canTransitionCenterPayment("UNDER_REVIEW", "REJECTED")).toBe(true));
  it("15. allows paid to refunded", () => expect(canTransitionCenterPayment("PAID", "REFUNDED")).toBe(true));
  it("16. rejects a refund before payment", () =>
    expect(canTransitionCenterPayment("PENDING_PAYMENT", "REFUNDED")).toBe(false));
  it("17. keeps rejected terminal", () => expect(canTransitionCenterPayment("REJECTED", "PAID")).toBe(false));
  it("18. keeps expired terminal", () => expect(canTransitionCenterPayment("EXPIRED", "PAID")).toBe(false));
  it("19. keeps cancelled terminal", () => expect(canTransitionCenterPayment("CANCELLED", "PAID")).toBe(false));
  it("20. keeps refunded terminal", () => expect(canTransitionCenterPayment("REFUNDED", "PAID")).toBe(false));
  it("21. exposes only the approved physical methods", () => {
    expect(CENTER_PAYMENT_METHODS).toEqual(["CASH", "CARD_AT_CENTER", "BANK_TRANSFER", "CHECK", "OTHER"]);
  });
  it("22. trims notes before storage", () => expect(normalizeCenterPaymentNote("  note  ")).toBe("note"));
  it("23. bounds notes to prevent oversized payloads", () =>
    expect(normalizeCenterPaymentNote("a".repeat(1200))?.length).toBe(1000));
  it("24. accepts retry-safe idempotency keys", () =>
    expect(isValidCenterPaymentIdempotencyKey("validation_123456")).toBe(true));
  it("25. rejects short or unsafe idempotency keys", () => {
    expect(isValidCenterPaymentIdempotencyKey("short")).toBe(false);
    expect(isValidCenterPaymentIdempotencyKey("unsafe key with spaces")).toBe(false);
  });
});
