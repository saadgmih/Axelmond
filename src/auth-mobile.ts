import crypto from "node:crypto";
import type { Request } from "express";
import { logSecurity } from "./security-logger";

export const MOBILE_CLIENT_HEADER = "x-axelmond-client";
export const MOBILE_CLIENT_VALUE = "mobile";
export const MOBILE_API_SECRET_HEADER = "x-axelmond-mobile-secret";

export function isMobileClientRequest(req: Pick<Request, "headers">): boolean {
  const raw = req.headers[MOBILE_CLIENT_HEADER];
  return typeof raw === "string" && raw.toLowerCase() === MOBILE_CLIENT_VALUE;
}

function secretsMatch(configured: string, provided: string): boolean {
  const left = Buffer.from(configured);
  const right = Buffer.from(provided);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export function isTrustedMobileClientRequest(req: Pick<Request, "headers">): boolean {
  if (!isMobileClientRequest(req)) return false;

  const configuredSecret = process.env.MOBILE_API_SECRET?.trim();
  if (!configuredSecret) {
    return process.env.NODE_ENV !== "production";
  }

  const provided = req.headers[MOBILE_API_SECRET_HEADER];
  if (typeof provided !== "string" || !secretsMatch(configuredSecret, provided.trim())) {
    if (process.env.NODE_ENV === "production") {
      logSecurity("WARN", "Mobile API secret rejected", {
        hasProvidedSecret: typeof provided === "string" && provided.trim().length > 0,
      });
    }
    return false;
  }

  return true;
}

export function withMobileRefreshToken<T extends Record<string, unknown>>(
  req: Pick<Request, "headers">,
  payload: T,
  rawRefreshToken: string,
): T & { refreshToken?: string } {
  if (!isTrustedMobileClientRequest(req)) return payload;
  return { ...payload, refreshToken: rawRefreshToken };
}
