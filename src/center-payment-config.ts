import { COURSE_ENROLLMENT_ACCESS_DAYS } from "./enrollment-access";

function positiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function text(value: string | undefined, fallback: string) {
  return value?.trim() || fallback;
}

export function getCenterPaymentConfig() {
  const expirationDays = positiveInt(process.env.CENTER_PAYMENT_EXPIRATION_DAYS, 5);
  return {
    centerName: text(process.env.CENTER_NAME, "Centre Performance Académique"),
    address: text(process.env.CENTER_ADDRESS, "Centre Performance Académique, Maroc"),
    openingHours: text(process.env.CENTER_OPENING_HOURS, "Du lundi au samedi, de 09h00 à 18h00"),
    phone: text(process.env.CENTER_PHONE, "+212 6 00 00 00 00"),
    email: text(process.env.CENTER_EMAIL, "contact@axelmond.com"),
    expirationDays,
    currency: text(process.env.CENTER_PAYMENT_CURRENCY, "MAD").toUpperCase(),
    accessDurationDays: positiveInt(process.env.CENTER_PAYMENT_ACCESS_DAYS, COURSE_ENROLLMENT_ACCESS_DAYS),
    instructions: text(
      process.env.CENTER_PAYMENT_INSTRUCTIONS,
      "Présentez votre référence au centre. L'accès sera activé uniquement après validation du paiement.",
    ),
  };
}

export type CenterPaymentPublicConfig = ReturnType<typeof getCenterPaymentConfig>;
