/** Fixed add-on price (MAD) for the AI tutor per module activation. */
export const AI_TUTOR_ADDON_PRICE_MAD = 50;

export function computeAiTutorAddonPriceMad(isFreeModule: boolean): number {
  return isFreeModule ? 0 : AI_TUTOR_ADDON_PRICE_MAD;
}

export function computeCourseCheckoutTotalMad(params: {
  modulePriceMad: number;
  includeAiAssistant: boolean;
  isFreeModule: boolean;
}): number {
  const addon = params.includeAiAssistant ? computeAiTutorAddonPriceMad(params.isFreeModule) : 0;
  return Math.round((params.modulePriceMad + addon) * 100) / 100;
}

export function resolveEnrollmentHasAiAccess(includeAiAssistant: boolean): boolean {
  return Boolean(includeAiAssistant);
}
