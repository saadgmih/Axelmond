/** Legacy key — full AppUser JSON (PII). Purged on boot; never written again. */
export const LEGACY_SESSION_USER_KEY = "axelmond_session_user";

export function purgeLegacySessionUserStorage() {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(LEGACY_SESSION_USER_KEY);
}
