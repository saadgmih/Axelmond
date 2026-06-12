export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL || "https://www.uroahumain.com"
).replace(/\/$/, "");

/** URL du site web affiché dans l'app (même UI que le navigateur). */
export const WEB_APP_URL = (
  process.env.EXPO_PUBLIC_WEB_APP_URL || API_BASE_URL
).replace(/\/$/, "");

/** `web` = site complet en WebView ; `native` = écrans React Native historiques */
export const APP_SHELL_MODE = (process.env.EXPO_PUBLIC_APP_SHELL || "web").toLowerCase();
export const MOBILE_CLIENT_HEADER = "X-Axelmond-Client";
export const MOBILE_CLIENT_VALUE = "mobile";
export const MOBILE_API_SECRET_HEADER = "X-Axelmond-Mobile-Secret";
export const MOBILE_API_SECRET = process.env.EXPO_PUBLIC_MOBILE_API_SECRET || "";