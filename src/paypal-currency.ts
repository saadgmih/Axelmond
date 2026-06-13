import { PLATFORM_CURRENCY_CODE } from "./utils/morocco-locale";

/** PayPal checkout currency (live accounts in Morocco typically require USD, not MAD). */
export function getPayPalCheckoutCurrency(): string {
  return (process.env.PAYPAL_CURRENCY_CODE || "USD").trim().toUpperCase();
}

/** MAD → PayPal currency multiplier (default ~0.10 when PayPal currency is USD). */
export function getPayPalMadConversionRate(): number {
  const raw = Number(process.env.PAYPAL_MAD_TO_USD_RATE ?? "0.1");
  return Number.isFinite(raw) && raw > 0 ? raw : 0.1;
}

export function convertMadAmountForPayPal(madAmount: number): number {
  const checkoutCurrency = getPayPalCheckoutCurrency();
  if (checkoutCurrency === PLATFORM_CURRENCY_CODE) {
    return Math.round(madAmount * 100) / 100;
  }
  return Math.round(madAmount * getPayPalMadConversionRate() * 100) / 100;
}

export function formatPayPalCheckoutEquivalent(madAmount: number): string {
  const converted = convertMadAmountForPayPal(madAmount);
  return `${converted.toFixed(2)} ${getPayPalCheckoutCurrency()}`;
}
