import { isBlockedUrlScheme } from "./external-url-security";

const DEFAULT_FALLBACK = "/";

export function sanitizeInternalAppPath(raw: unknown, fallback = DEFAULT_FALLBACK): string {
  if (typeof raw !== "string") return fallback;
  const candidate = raw.trim();
  if (!candidate) return fallback;
  if (isBlockedUrlScheme(candidate)) return fallback;
  if (candidate.startsWith("//")) return fallback;

  if (candidate.startsWith("/") && !candidate.startsWith("//")) {
    try {
      const url = new URL(candidate, "https://app.internal");
      if (!url.pathname.startsWith("/")) return fallback;
      return `${url.pathname}${url.search}`;
    } catch {
      return fallback;
    }
  }

  return fallback;
}

export function sanitizeInternalAppPathForOrigin(
  raw: unknown,
  allowedOrigin: string,
  fallback = DEFAULT_FALLBACK,
): string {
  if (typeof raw !== "string" || !raw.trim()) return fallback;
  const candidate = raw.trim();
  if (isBlockedUrlScheme(candidate) || candidate.startsWith("//")) return fallback;

  if (candidate.startsWith("/") && !candidate.startsWith("//")) {
    return sanitizeInternalAppPath(candidate, fallback);
  }

  try {
    const allowed = new URL(allowedOrigin);
    const url = new URL(candidate);
    if (url.origin !== allowed.origin) return fallback;
    if (!url.pathname.startsWith("/")) return fallback;
    return `${url.pathname}${url.search}`;
  } catch {
    return fallback;
  }
}

export function buildAbsoluteAppUrl(path: unknown, env: NodeJS.ProcessEnv = process.env): string {
  const base = (env.APP_URL || "https://axelmond.com").trim().replace(/\/+$/, "");
  const safePath = sanitizeInternalAppPath(path);
  return `${base}${safePath}`;
}
