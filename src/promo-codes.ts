const PROMO_DISCOUNTS: Record<string, number> = {
  AXELMOND20: 20,
};

/** Returns discount percent (0 = no promo), or null if code is invalid. */
export function resolvePromoDiscountPercent(promoCode: string | undefined | null): number | null {
  const normalized = String(promoCode || "").trim().toUpperCase();
  if (!normalized) return 0;
  const discount = PROMO_DISCOUNTS[normalized];
  return discount != null ? discount : null;
}

export function computeDiscountedPrice(originalPrice: number, discountPercent: number): number {
  const raw = originalPrice * (1 - discountPercent / 100);
  return Math.round(raw * 100) / 100;
}

export function resolveCourseChargeAmount(originalPrice: number, promoCode: string | undefined | null): {
  amount: number;
  discountPercent: number;
  error?: string;
} {
  const discountPercent = resolvePromoDiscountPercent(promoCode);
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
