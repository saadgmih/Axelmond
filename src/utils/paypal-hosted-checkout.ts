export const PENDING_PAYPAL_CHECKOUT_KEY = "axelmond_pending_paypal_checkout";

const PENDING_PAYPAL_CHECKOUT_MAX_AGE_MS = 2 * 60 * 60 * 1000;

export type PendingPayPalCheckout = {
  orderId: string;
  courseId: number;
  amountMad: number;
  createdAt: number;
};

function getSessionStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function storePendingPayPalCheckout(checkout: PendingPayPalCheckout) {
  try {
    getSessionStorage()?.setItem(PENDING_PAYPAL_CHECKOUT_KEY, JSON.stringify(checkout));
  } catch {
    // Checkout can still continue when browser storage is unavailable.
  }
}

export function readPendingPayPalCheckout(now = Date.now()): PendingPayPalCheckout | null {
  const storage = getSessionStorage();
  let raw: string | null = null;
  try {
    raw = storage?.getItem(PENDING_PAYPAL_CHECKOUT_KEY) ?? null;
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<PendingPayPalCheckout>;
    const pending = {
      orderId: String(parsed.orderId || "").trim(),
      courseId: Number(parsed.courseId),
      amountMad: Number(parsed.amountMad),
      createdAt: Number(parsed.createdAt),
    };
    const isValid =
      /^[A-Z0-9-]+$/i.test(pending.orderId) &&
      Number.isInteger(pending.courseId) &&
      pending.courseId > 0 &&
      Number.isFinite(pending.amountMad) &&
      pending.amountMad > 0 &&
      Number.isFinite(pending.createdAt) &&
      now - pending.createdAt >= 0 &&
      now - pending.createdAt <= PENDING_PAYPAL_CHECKOUT_MAX_AGE_MS;

    if (isValid) return pending;
  } catch {
    // Invalid or stale browser state is discarded below.
  }

  try {
    storage?.removeItem(PENDING_PAYPAL_CHECKOUT_KEY);
  } catch {
    // Nothing else to clean when browser storage is unavailable.
  }
  return null;
}

export function clearPendingPayPalCheckout() {
  try {
    getSessionStorage()?.removeItem(PENDING_PAYPAL_CHECKOUT_KEY);
  } catch {
    // Nothing else to clean when browser storage is unavailable.
  }
}

export function buildPayPalHostedCheckoutUrl(orderId: string, env: "sandbox" | "live") {
  const host = env === "sandbox" ? "www.sandbox.paypal.com" : "www.paypal.com";
  return `https://${host}/checkoutnow?token=${encodeURIComponent(orderId)}`;
}

export function clearPayPalReturnQuery() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete("payment");
  url.searchParams.delete("token");
  url.searchParams.delete("PayerID");
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}
