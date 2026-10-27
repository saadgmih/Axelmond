/**
 * Utility to detect whether the user is interacting via the installed mobile app
 * (Play Store / App Store / APK wrapped via react-native-webview / Standalone PWA on iPhone)
 * or via a standard web browser (desktop Chrome/Safari/Firefox, or mobile browser).
 */

export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  const win = window as unknown as {
    ReactNativeWebView?: unknown;
    IS_AXELMOND_APP?: boolean;
    navigator?: { standalone?: boolean };
  };

  const isStandalonePwa =
    win.navigator?.standalone === true ||
    (typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)").matches);

  return Boolean(
    win.ReactNativeWebView ||
    win.IS_AXELMOND_APP ||
    document.documentElement.classList.contains("is-axelmond-app") ||
    isStandalonePwa
  );
}
