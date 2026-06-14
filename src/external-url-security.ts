const BLOCKED_URL_PROTOCOLS = ["javascript:", "data:", "vbscript:", "file:", "blob:"];

export function isBlockedUrlScheme(url: string): boolean {
  const lower = url.trim().toLowerCase();
  return BLOCKED_URL_PROTOCOLS.some((scheme) => lower.startsWith(scheme));
}

function parseHttpsUrl(url: string): URL | null {
  if (typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed || isBlockedUrlScheme(trimmed)) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:") return null;
  if (parsed.username || parsed.password) return null;
  if (!parsed.hostname) return null;
  return parsed;
}

function hostMatches(hostname: string, allowedHost: string): boolean {
  const host = hostname.toLowerCase();
  const allowed = allowedHost.toLowerCase();
  return host === allowed || host.endsWith(`.${allowed}`);
}

export function isAllowedHttpsHost(hostname: string, allowedHosts: readonly string[]): boolean {
  return allowedHosts.some((allowed) => hostMatches(hostname, allowed));
}

export function sanitizeHttpsUrl(
  value: unknown,
  options: { maxLength?: number; allowedHosts?: readonly string[] } = {},
): string | null {
  if (typeof value !== "string") return null;
  const maxLength = options.maxLength ?? 500;
  const trimmed = value.trim().slice(0, maxLength);
  if (!trimmed) return null;

  const parsed = parseHttpsUrl(trimmed);
  if (!parsed) return null;

  if (options.allowedHosts && options.allowedHosts.length > 0) {
    if (!isAllowedHttpsHost(parsed.hostname, options.allowedHosts)) return null;
  }

  return trimmed;
}

export const UPLOAD_HOSTS = [
  "uploadthing.com",
  "ufs.sh",
  "utfs.io",
] as const;

export const ACADEMIC_LINK_HOSTS = {
  linkedIn: ["linkedin.com", "www.linkedin.com"],
  orcid: ["orcid.org", "www.orcid.org"],
  googleScholar: ["scholar.google.com", "scholar.google.fr", "scholar.google.co.uk"],
} as const;

export function sanitizeAcademicLinkField(
  value: unknown,
  field: keyof typeof ACADEMIC_LINK_HOSTS,
  maxLength = 240,
): string | undefined {
  const sanitized = sanitizeHttpsUrl(value, {
    maxLength,
    allowedHosts: ACADEMIC_LINK_HOSTS[field],
  });
  return sanitized ?? undefined;
}
