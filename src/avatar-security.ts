export const ALLOWED_RASTER_IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);

export const RASTER_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";

const FORBIDDEN_AVATAR_MIMES = new Set(["image/svg+xml", "image/gif", "application/pdf"]);

export const FORBIDDEN_RASTER_IMAGE_EXTENSIONS = [".svg", ".svgz"] as const;

const AVATAR_URL_MAX_LENGTH = 500;

function normalizeMime(mime: string | null): string {
  return String(mime || "").trim().toLowerCase();
}

export function isForbiddenRasterImageExtension(filename: string): boolean {
  const dotIndex = filename.lastIndexOf(".");
  if (dotIndex === -1) return false;
  const ext = filename.substring(dotIndex).toLowerCase();
  return FORBIDDEN_RASTER_IMAGE_EXTENSIONS.includes(ext as typeof FORBIDDEN_RASTER_IMAGE_EXTENSIONS[number]);
}

export function isAllowedRasterImageMime(mime: string | null): boolean {
  if (!mime) return false;
  const normalized = normalizeMime(mime);
  if (FORBIDDEN_AVATAR_MIMES.has(normalized)) return false;
  return ALLOWED_RASTER_IMAGE_MIMES.has(normalized);
}

export function isAllowedRasterImageUpload(filename: string, mime: string | null): boolean {
  if (isForbiddenRasterImageExtension(filename)) return false;
  return isAllowedRasterImageMime(mime);
}

function isAllowedAvatarHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === "uploadthing.com" || host.endsWith(".uploadthing.com")) return true;
  if (host === "ufs.sh" || host.endsWith(".ufs.sh")) return true;
  if (host === "utfs.io" || host.endsWith(".utfs.io")) return true;
  return false;
}

export function isAllowedAvatarMime(mime: string | null): boolean {
  return isAllowedRasterImageMime(mime);
}

export function isAllowedAvatarUrl(url: string): boolean {
  if (typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed) return false;

  const lower = trimmed.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("http://")) {
    return false;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return false;
  }

  if (parsed.protocol !== "https:") return false;
  return isAllowedAvatarHost(parsed.hostname);
}

export function sanitizeAvatarUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const truncated = trimmed.slice(0, AVATAR_URL_MAX_LENGTH);
  if (!isAllowedAvatarUrl(truncated)) return null;
  return truncated;
}
