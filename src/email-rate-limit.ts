import type { Request } from "express";
import { ipKeyGenerator } from "express-rate-limit";

export function emailRateLimitKey(req: Request): string {
  const email = req.body?.email;
  if (typeof email === "string" && email.trim()) {
    return `email:${email.trim().toLowerCase()}`;
  }
  return `ip:${ipKeyGenerator(req.ip || "")}`;
}
