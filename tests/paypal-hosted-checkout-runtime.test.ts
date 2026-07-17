import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildPayPalHostedCheckoutUrl,
  clearPayPalReturnQuery,
  readPendingPayPalCheckout,
  storePendingPayPalCheckout,
} from "../src/utils/paypal-hosted-checkout";

describe("PayPal hosted card checkout", () => {
  const storage = new Map<string, string>();
  const replaceState = vi.fn();

  beforeEach(() => {
    storage.clear();
    replaceState.mockClear();
    vi.stubGlobal("window", {
      location: { href: "https://axelmond.com/?payment=success&token=ORDER-123&PayerID=USER-1#checkout" },
      history: { replaceState },
      sessionStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
      },
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("stores a short-lived order and builds the correct PayPal URL", () => {
    storePendingPayPalCheckout({ orderId: "ORDER-123", courseId: 42, amountMad: 248, createdAt: 1_000 });

    expect(readPendingPayPalCheckout(2_000)).toEqual({
      orderId: "ORDER-123",
      courseId: 42,
      amountMad: 248,
      createdAt: 1_000,
    });
    expect(buildPayPalHostedCheckoutUrl("ORDER-123", "live")).toBe(
      "https://www.paypal.com/checkoutnow?token=ORDER-123",
    );
    expect(buildPayPalHostedCheckoutUrl("ORDER-123", "sandbox")).toBe(
      "https://www.sandbox.paypal.com/checkoutnow?token=ORDER-123",
    );
  });

  it("discards stale state and removes PayPal return parameters", () => {
    storePendingPayPalCheckout({ orderId: "ORDER-123", courseId: 42, amountMad: 248, createdAt: 1_000 });

    expect(readPendingPayPalCheckout(3 * 60 * 60 * 1_000)).toBeNull();
    clearPayPalReturnQuery();
    expect(replaceState).toHaveBeenCalledWith(null, "", "/#checkout");
  });
});
