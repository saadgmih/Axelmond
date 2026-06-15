import crypto from "node:crypto";
import type { Request } from "express";

export const MOBILE_CLIENT_HEADER = "x-axelmond-client";
export const MOBILE_CLIENT_VALUE = "mobile";
export const MOBILE_CLIENT_KEY_HEADER = "x-axelmond-client-key";

function readMobileClientSecret(env: NodeJS.ProcessEnv = process.env): string {
  return env.MOBILE_CLIENT_SECRET?.trim() || "";
}

function isProductionEnv(env: NodeJS.ProcessEnv = process.env): boolean {
  return String(env.NODE_ENV || "").toLowerCase() === "production";
}

function verifyMobileClientKey(req: Pick<Request, "headers">, env: NodeJS.ProcessEnv = process.env): boolean {
  const secret = readMobileClientSecret(env);
  if (!secret) {
    return !isProductionEnv(env);
  }

  const provided = req.headers[MOBILE_CLIENT_KEY_HEADER];
  if (typeof provided !== "string" || provided.length === 0) return false;

  const expectedBuf = Buffer.from(secret, "utf8");
  const providedBuf = Buffer.from(provided, "utf8");
  if (expectedBuf.length !== providedBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}

export function isMobileClientRequest(req: Pick<Request, "headers">, env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = req.headers[MOBILE_CLIENT_HEADER];
  if (typeof raw !== "string" || raw.toLowerCase() !== MOBILE_CLIENT_VALUE) return false;
  return verifyMobileClientKey(req, env);
}

export function withMobileRefreshToken<T extends Record<string, unknown>>(
  req: Pick<Request, "headers">,
  payload: T,
  rawRefreshToken: string,
): T & { refreshToken?: string } {
  if (!isMobileClientRequest(req)) return payload;
  return { ...payload, refreshToken: rawRefreshToken };
}
