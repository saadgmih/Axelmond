export function normalizeNumericInputValue(value: string): string {
  if (value === "") return "";

  const sign = value.startsWith("-") ? "-" : "";
  const unsignedValue = sign ? value.slice(1) : value;
  const dotIndex = unsignedValue.indexOf(".");
  const integerPart = dotIndex >= 0 ? unsignedValue.slice(0, dotIndex) : unsignedValue;
  const decimalPart = dotIndex >= 0 ? unsignedValue.slice(dotIndex + 1) : "";
  const normalizedInteger = integerPart.replace(/^0+(?=\d)/, "");
  const safeInteger = normalizedInteger || (integerPart ? "0" : "");

  if (dotIndex >= 0) {
    return `${sign}${safeInteger || "0"}.${decimalPart}`;
  }

  return `${sign}${safeInteger || "0"}`;
}

export function numericInputFromNumber(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "";
}

export function numberFromNumericInput(value: string, fallback = 0): number {
  if (!value.trim()) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function integerFromNumericInput(value: string, fallback = 0): number {
  return Math.trunc(numberFromNumericInput(value, fallback));
}
