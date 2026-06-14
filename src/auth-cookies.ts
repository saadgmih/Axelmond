import crypto from "node:crypto";
import type { CookieOptions, Request, Response } from "express";
import { REFRESH_TOKEN_TTL_MS } from "./auth-token";
import { isTrustedMobileClientRequest } from "./auth-mobile";

export const REFRESH_COOKIE_NAME = "refresh_token";
export const CSRF_COOKIE_NAME = "csrf_token";
export const REFRESH_COOKIE_PATH = "/api/auth";
export const CSRF_COOKIE_PATH = "/";

export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function isSecureCookieEnv(): boolean {
  return process.env.NODE_ENV === "production";
}

function baseCookieOptions(): CookieOptions {
  return {
    secure: isSecureCookieEnv(),
    sameSite: "strict",
  };
}

export function setRefreshTokenCookie(res: Response, rawToken: string): void {
  res.cookie(REFRESH_COOKIE_NAME, rawToken, {
    ...baseCookieOptions(),
    httpOnly: true,
    path: REFRESH_COOKIE_PATH,
    maxAge: REFRESH_TOKEN_TTL_MS,
  });
}

export function setCsrfTokenCookie(res: Response, csrfToken: string): void {
  res.cookie(CSRF_COOKIE_NAME, csrfToken, {
    ...baseCookieOptions(),
    httpOnly: false,
    path: CSRF_COOKIE_PATH,
    maxAge: REFRESH_TOKEN_TTL_MS,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    ...baseCookieOptions(),
    httpOnly: true,
    path: REFRESH_COOKIE_PATH,
  });
  res.clearCookie(CSRF_COOKIE_NAME, {
    ...baseCookieOptions(),
    httpOnly: false,
    path: CSRF_COOKIE_PATH,
  });
}

/** Sets HttpOnly refresh + readable CSRF cookies; returns CSRF token for JSON body. */
export function setAuthCookies(res: Response, rawRefreshToken: string): string {
  const csrfToken = generateCsrfToken();
  setRefreshTokenCookie(res, rawRefreshToken);
  setCsrfTokenCookie(res, csrfToken);
  return csrfToken;
}

export function readRefreshTokenFromRequest(req: Request): string | null {
  const fromCookie = req.cookies?.[REFRESH_COOKIE_NAME];
  if (typeof fromCookie === "string" && fromCookie.length > 0 && fromCookie.length <= 128) {
    return fromCookie;
  }

  const fromBody = req.body?.refreshToken;
  if (
    isTrustedMobileClientRequest(req) &&
    typeof fromBody === "string" &&
    fromBody.length > 0 &&
    fromBody.length <= 128
  ) {
    return fromBody;
  }

  return null;
}
