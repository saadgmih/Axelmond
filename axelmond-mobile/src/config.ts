export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL || "https://www.uroahumain.com"
).replace(/\/$/, "");
export const MOBILE_CLIENT_HEADER = "X-Axelmond-Client";
export const MOBILE_CLIENT_VALUE = "mobile";