// Default push providers — leave PUSH_ALLOWED_HOST_SUFFIXES unset in .env to keep all of these.
// Browser coverage:
// - fcm.googleapis.com → Chrome, Brave, Opera, Vivaldi, Samsung Internet, Edge (Chromium)
// - updates.push.services.mozilla.com / push.services.mozilla.com → Firefox
// - web.push.apple.com → Safari (macOS, iOS 16.4+)
// - notify.windows.com → Edge (Windows, WNS subdomains such as wns2-*.notify.windows.com)
export const DEFAULT_PUSH_ALLOWED_HOST_SUFFIXES = [
  "fcm.googleapis.com",
  "updates.push.services.mozilla.com",
  "push.services.mozilla.com",
  "web.push.apple.com",
  "notify.windows.com",
] as const;

export const MAX_PUSH_ENDPOINT_LENGTH = 2048;
export const MAX_PUSH_KEY_LENGTH = 256;
export const DEFAULT_MAX_PUSH_SUBSCRIPTIONS_PER_USER = 5;

const BLOCKED_HOSTNAMES = new Set(["localhost", "metadata.google.internal", "metadata.google", "instance-data"]);

const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+={0,2}$/;

export class PushSubscriptionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PushSubscriptionValidationError";
  }
}

export class PushSubscriptionLimitError extends Error {
  constructor(message = "Nombre maximal d'appareils push atteint.") {
    super(message);
    this.name = "PushSubscriptionLimitError";
  }
}

function readAllowedHostSuffixes(env: NodeJS.ProcessEnv = process.env): string[] {
  const fromEnv = env.PUSH_ALLOWED_HOST_SUFFIXES?.split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  return [...DEFAULT_PUSH_ALLOWED_HOST_SUFFIXES];
}

function readMaxSubscriptionsPerUser(env: NodeJS.ProcessEnv = process.env): number {
  const parsed = Number(env.PUSH_MAX_SUBSCRIPTIONS_PER_USER);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_PUSH_SUBSCRIPTIONS_PER_USER;
}

function parseIpv4(host: string): number[] | null {
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) return null;
  const parts = host.split(".").map((part) => Number(part));
  if (parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null;
  return parts;
}

function isPrivateOrBlockedIpv4(parts: number[]): boolean {
  const [a, b] = parts;
  if (a === 127 || a === 0) return true;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 192 && b === 0) return true;
  return false;
}

function normalizeIpv6(host: string): string {
  return host
    .trim()
    .toLowerCase()
    .replace(/^\[(.*)\]$/, "$1");
}

function isPrivateOrBlockedIpv6(host: string): boolean {
  const normalized = normalizeIpv6(host);
  if (!normalized.includes(":")) return false;
  if (normalized === "::1") return true;
  if (normalized.startsWith("fe80:")) return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (normalized.startsWith("::ffff:")) {
    const mapped = normalized.slice("::ffff:".length);
    const ipv4 = parseIpv4(mapped);
    return ipv4 ? isPrivateOrBlockedIpv4(ipv4) : false;
  }
  return false;
}

export function isPrivateOrBlockedHost(host: string): boolean {
  const hostname = host.trim().toLowerCase().replace(/\.$/, "");
  if (!hostname) return true;

  if (BLOCKED_HOSTNAMES.has(hostname)) return true;
  if (hostname.endsWith(".local") || hostname.endsWith(".localhost") || hostname.endsWith(".internal")) {
    return true;
  }

  const ipv4 = parseIpv4(hostname);
  if (ipv4) return isPrivateOrBlockedIpv4(ipv4);
  if (hostname.includes(":")) return isPrivateOrBlockedIpv6(hostname);
  return false;
}

export function isAllowedPushProviderHost(host: string, env: NodeJS.ProcessEnv = process.env): boolean {
  const hostname = host.trim().toLowerCase().replace(/\.$/, "");
  if (!hostname || isPrivateOrBlockedHost(hostname)) return false;

  return readAllowedHostSuffixes(env).some((suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`));
}

export function isAllowedPushEndpointUrl(value: string, env: NodeJS.ProcessEnv = process.env): boolean {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_PUSH_ENDPOINT_LENGTH) return false;

  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("http://") ||
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("file:")
  ) {
    return false;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return false;
  }

  if (parsed.protocol !== "https:") return false;
  if (parsed.username || parsed.password) return false;
  if (!parsed.hostname) return false;

  return isAllowedPushProviderHost(parsed.hostname, env);
}

function isValidPushKey(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_PUSH_KEY_LENGTH) return false;
  return BASE64URL_PATTERN.test(trimmed);
}

export function validatePushSubscriptionInput(
  subscription: { endpoint: unknown; keys: unknown },
  env: NodeJS.ProcessEnv = process.env,
): { endpoint: string; keys: { p256dh: string; auth: string } } {
  if (!subscription || typeof subscription !== "object") {
    throw new PushSubscriptionValidationError("Abonnement push invalide.");
  }

  if (typeof subscription.endpoint !== "string") {
    throw new PushSubscriptionValidationError("Endpoint push invalide.");
  }

  const endpoint = subscription.endpoint.trim();
  if (!isAllowedPushEndpointUrl(endpoint, env)) {
    throw new PushSubscriptionValidationError("Endpoint push non autorisé.");
  }

  const keys = subscription.keys;
  if (!keys || typeof keys !== "object") {
    throw new PushSubscriptionValidationError("Clés push invalides.");
  }

  const record = keys as Record<string, unknown>;
  if (!isValidPushKey(record.p256dh) || !isValidPushKey(record.auth)) {
    throw new PushSubscriptionValidationError("Clés push invalides.");
  }

  return {
    endpoint,
    keys: {
      p256dh: record.p256dh.trim(),
      auth: record.auth.trim(),
    },
  };
}

export function getMaxPushSubscriptionsPerUser(env: NodeJS.ProcessEnv = process.env): number {
  return readMaxSubscriptionsPerUser(env);
}
