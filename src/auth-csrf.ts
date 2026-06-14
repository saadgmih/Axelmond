import type { NextFunction, Request, Response } from "express";
import { CSRF_COOKIE_NAME } from "./auth-cookies";
import { isTrustedMobileClientRequest } from "./auth-mobile";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const CSRF_EXEMPT_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/verify-email",
  "/api/auth/resend-verification-code",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/mfa/totp/verify",
  "/api/auth/mfa/passkey/login/options",
  "/api/auth/mfa/passkey/login/verify",
]);

const CSRF_EXEMPT_PREFIXES = ["/api/uploadthing", "/api/paypal/webhook"];

function isCsrfExempt(req: Request): boolean {
  if (!UNSAFE_METHODS.has(req.method)) return true;

  const path = req.path;
  if (CSRF_EXEMPT_PATHS.has(path)) return true;

  return CSRF_EXEMPT_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

function isMobileCsrfExempt(req: Request): boolean {
  if (!isTrustedMobileClientRequest(req)) return false;

  const authHeader = req.headers.authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return true;
  }

  const refreshToken = req.body?.refreshToken;
  if (
    typeof refreshToken === "string" &&
    refreshToken.length > 0 &&
    (req.path === "/api/auth/refresh" || req.path === "/api/auth/logout")
  ) {
    return true;
  }

  return false;
}

export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  if (isCsrfExempt(req) || !req.path.startsWith("/api/")) {
    next();
    return;
  }

  if (isMobileCsrfExempt(req)) {
    next();
    return;
  }

  const headerToken = req.headers["x-csrf-token"];
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];

  if (
    typeof headerToken !== "string" ||
    typeof cookieToken !== "string" ||
    headerToken.length === 0 ||
    headerToken !== cookieToken
  ) {
    res.status(403).json({
      error: "Jeton CSRF invalide ou manquant",
      code: "CSRF_TOKEN_INVALID",
    });
    return;
  }

  next();
}
