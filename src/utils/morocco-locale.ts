/** Affichage plateforme — contexte marocain (devise MAD/DH). */
export const PLATFORM_CURRENCY_CODE = "MAD";
export const PLATFORM_CURRENCY_LABEL = "DH";

/** Autorité et cadre légal marocain (loi 09-08). */
export const DATA_PROTECTION_LAW = "Loi n° 09-08 relative à la protection des personnes physiques";
export const DATA_PROTECTION_AUTHORITY = "CNDP";
export const DATA_PROTECTION_AUTHORITY_URL = "https://www.cndp.ma";

export function formatMad(amount: number): string {
  const normalized = Math.round(amount * 100) / 100;
  const text = Number.isInteger(normalized)
    ? String(normalized)
    : normalized.toFixed(2).replace(/\.?0+$/, "") || normalized.toFixed(2);
  return `${text} ${PLATFORM_CURRENCY_LABEL}`;
}

/** Unité de progression Performance Académique (affichée « PA »). */
export const PLATFORM_CREDITS_ABBREV = "PA";
export const PLATFORM_CREDITS_NAME = "Performance Académique";

export function formatCredits(credits: number): string {
  return `${credits} ${PLATFORM_CREDITS_ABBREV}`;
}

export function creditsLabel(): string {
  return PLATFORM_CREDITS_ABBREV;
}
