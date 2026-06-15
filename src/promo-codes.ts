type PromoCodeEntry = {
  discountPercent: number;
  validUntil?: string;
};

const PROMO_CODES: Record<string, PromoCodeEntry> = {
  AXELMOND20: { discountPercent: 20, validUntil: "2026-12-31" },
};

export function isPromoCodesEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.PROMO_CODES_DISABLED === "true") return false;
  if (String(env.NODE_ENV || "").toLowerCase() === "production") {
    return env.PROMO_CODES_ENABLED === "true";
  }
  return true;
}

function isPromoEntryActive(entry: PromoCodeEntry, now = Date.now()): boolean {
  if (!entry.validUntil) return true;
  const expiry = new Date(`${entry.validUntil}T23:59:59.999Z`);
  return now <= expiry.getTime();
}

/** Returns discount percent (0 = no promo), or null if code is invalid or disabled. */
export function resolvePromoDiscountPercent(
  promoCode: string | undefined | null,
  env: NodeJS.ProcessEnv = process.env,
): number | null {
  const normalized = String(promoCode || "")
    .trim()
    .toUpperCase();
  if (!normalized) return 0;
  if (!isPromoCodesEnabled(env)) return null;

  const entry = PROMO_CODES[normalized];
  if (!entry || !isPromoEntryActive(entry)) return null;
  return entry.discountPercent;
}

export function computeDiscountedPrice(originalPrice: number, discountPercent: number): number {
  const raw = originalPrice * (1 - discountPercent / 100);
  return Math.round(raw * 100) / 100;
}

export function resolveCourseChargeAmount(
  originalPrice: number,
  promoCode: string | undefined | null,
  env: NodeJS.ProcessEnv = process.env,
): {
  amount: number;
  discountPercent: number;
  error?: string;
} {
  const discountPercent = resolvePromoDiscountPercent(promoCode, env);
  if (discountPercent === null) {
    return { amount: originalPrice, discountPercent: 0, error: "Code promo invalide ou expiré." };
  }
  if (discountPercent === 0) {
    return { amount: originalPrice, discountPercent: 0 };
  }
  return {
    amount: computeDiscountedPrice(originalPrice, discountPercent),
    discountPercent,
  };
}
