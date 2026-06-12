import type { Request } from "express";

export const MOBILE_CLIENT_HEADER = "x-axelmond-client";
export const MOBILE_CLIENT_VALUE = "mobile";
export const MOBILE_API_SECRET_HEADER = "x-axelmond-mobile-secret";

export function isMobileClientRequest(req: Pick<Request, "headers">): boolean {
  const raw = req.headers[MOBILE_CLIENT_HEADER];
  return typeof raw === "string" && raw.toLowerCase() === MOBILE_CLIENT_VALUE;
}

export function isTrustedMobileClientRequest(req: Pick<Request, "headers">): boolean {
  if (!isMobileClientRequest(req)) return false;

  const configuredSecret = process.env.MOBILE_API_SECRET?.trim();
  if (configuredSecret) {
    const provided = req.headers[MOBILE_API_SECRET_HEADER];
    return typeof provided === "string" && provided === configuredSecret;
  }

  return process.env.NODE_ENV !== "production";
}

export function withMobileRefreshToken<T extends Record<string, unknown>>(
  req: Pick<Request, "headers">,
  payload: T,
  rawRefreshToken: string,
): T & { refreshToken?: string } {
  if (!isMobileClientRequest(req)) return payload;
  return { ...payload, refreshToken: rawRefreshToken };
}
