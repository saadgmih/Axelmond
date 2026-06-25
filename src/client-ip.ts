import type { Request } from "express";
import { ipKeyGenerator } from "express-rate-limit";

/** Trust-proxy setting for reverse proxies (Cloudflare, Hostinger edge). */
export function parseTrustProxySetting(raw?: string): number | boolean {
  const value = raw?.trim();
  if (!value || value === "1") return 1;
  if (value === "true") return true;
  if (value === "false") return false;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 1;
}

/**
 * Best-effort client IP behind Cloudflare + Express trust proxy.
 * Prefers CF-Connecting-IP when present (authoritative on proxied zones).
 */
export function getClientIp(req: Request): string {
  const cfConnectingIp = req.headers["cf-connecting-ip"];
  if (typeof cfConnectingIp === "string" && cfConnectingIp.trim()) {
    return cfConnectingIp.trim();
  }
  return req.ip || "";
}

export function rateLimitIpKey(req: Request): string {
  return ipKeyGenerator(getClientIp(req));
}
