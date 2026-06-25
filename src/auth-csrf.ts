import type { NextFunction, Request, Response } from "express";
import { CSRF_COOKIE_NAME } from "./auth-cookies";
import { isMobileClientRequest } from "./auth-mobile";
import { verifyAuthToken } from "./auth-token";
import { prisma } from "./db";
import { hashCsrfToken } from "./security-hardening";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const CSRF_EXEMPT_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/login-status",
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
  if (!isMobileClientRequest(req)) return false;

  const refreshToken = req.body?.refreshToken;
  return (
    typeof refreshToken === "string" &&
    refreshToken.length > 0 &&
    (req.path === "/api/auth/refresh" || req.path === "/api/auth/logout")
  );
}

function hasMatchingCookieCsrf(req: Request, headerToken: string): boolean {
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  return typeof cookieToken === "string" && cookieToken.length > 0 && headerToken === cookieToken;
}

async function hasValidMobileSessionCsrf(req: Request, headerToken: string): Promise<boolean> {
  const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const session = verifyAuthToken(bearer);
  if (!session) return false;

  const csrfHash = hashCsrfToken(headerToken);
  const activeSession = await prisma.refreshToken.findFirst({
    where: {
      userId: session.userId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
      csrfTokenHash: csrfHash,
    },
    select: { id: true },
  });
  return Boolean(activeSession);
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
  if (typeof headerToken !== "string" || headerToken.length === 0) {
    res.status(403).json({
      error: "Jeton CSRF invalide ou manquant",
      code: "CSRF_TOKEN_INVALID",
    });
    return;
  }

  if (hasMatchingCookieCsrf(req, headerToken)) {
    next();
    return;
  }

  if (isMobileClientRequest(req)) {
    void hasValidMobileSessionCsrf(req, headerToken)
      .then((valid) => {
        if (valid) {
          next();
          return;
        }
        res.status(403).json({
          error: "Jeton CSRF invalide ou manquant",
          code: "CSRF_TOKEN_INVALID",
        });
      })
      .catch(() => {
        res.status(503).json({ error: "Base de données indisponible" });
      });
    return;
  }

  res.status(403).json({
    error: "Jeton CSRF invalide ou manquant",
    code: "CSRF_TOKEN_INVALID",
  });
}
