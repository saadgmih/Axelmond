export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL || "https://axelmond.com"
).replace(/\/$/, "");

/** URL du site web affiché dans l'app (même UI que le navigateur). */
export const WEB_APP_URL = (
  process.env.EXPO_PUBLIC_WEB_APP_URL || API_BASE_URL
).replace(/\/$/, "");

/** `web` = site complet en WebView ; `native` = écrans React Native historiques */
export const APP_SHELL_MODE = (process.env.EXPO_PUBLIC_APP_SHELL || "web").toLowerCase();
export const MOBILE_CLIENT_HEADER = "X-Axelmond-Client";
export const MOBILE_CLIENT_VALUE = "mobile";
export const MOBILE_CLIENT_KEY_HEADER = "X-Axelmond-Client-Key";
export const MOBILE_CLIENT_KEY = (process.env.EXPO_PUBLIC_MOBILE_CLIENT_KEY || "").trim();