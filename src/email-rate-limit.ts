import type { Request } from "express";
import { rateLimitIpKey } from "./client-ip";

export function emailRateLimitKey(req: Request): string {
  const email = req.body?.email;
  if (typeof email === "string" && email.trim()) {
    return `email:${email.trim().toLowerCase()}`;
  }
  return `ip:${rateLimitIpKey(req)}`;
}
