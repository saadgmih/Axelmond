import type { Request } from "express";

export const MOBILE_CLIENT_HEADER = "x-axelmond-client";
export const MOBILE_CLIENT_VALUE = "mobile";

export function isMobileClientRequest(req: Pick<Request, "headers">): boolean {
  const raw = req.headers[MOBILE_CLIENT_HEADER];
  return typeof raw === "string" && raw.toLowerCase() === MOBILE_CLIENT_VALUE;
}

export function withMobileRefreshToken<T extends Record<string, unknown>>(
  req: Pick<Request, "headers">,
  payload: T,
  rawRefreshToken: string,
): T & { refreshToken?: string } {
  if (!isMobileClientRequest(req)) return payload;
  return { ...payload, refreshToken: rawRefreshToken };
}
