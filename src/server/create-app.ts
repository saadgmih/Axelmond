import express from "express";
import crypto from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import compression from "compression";
import { createRouteHandler } from "uploadthing/express";
import * as routeDeps from "./route-deps";
import { createRouteContext, type RouteContext } from "./route-context";
import { registerApiRoutes } from "../routes/register-api-routes";
import { registerPayPalWebhook } from "../routes/payments-routes";
import { uploadRouter } from "../uploadthing";
import { requestTimingMiddleware } from "../performance";
import {
  JSON_BODY_LIMIT,
  REFRESH_RATE_LIMIT_MAX,
  REFRESH_RATE_LIMIT_WINDOW_MS,
  hashRefreshToken,
} from "../security-hardening";
import { readRefreshTokenFromRequest } from "../auth-cookies";
import { csrfProtection } from "../auth-csrf";
import { isMobileClientRequest, MOBILE_CLIENT_HEADER, MOBILE_CLIENT_KEY_HEADER } from "../auth-mobile";
import { mobileClientSpoofGuard } from "../mobile-client-guard";
import { verifyAuthToken } from "../auth-token";
import { applyMobileApiCorsHeaders } from "../routes/mobile-api-routes";
import { emailRateLimitKey } from "../email-rate-limit";
import { liveKitRateLimitKey } from "../livekit-rate-limit";
import { adminRateLimitKey } from "../admin-rate-limit";
import {
  PAYPAL_CSP_SCRIPT_SRC,
  PAYPAL_CSP_IMG_SRC,
  PAYPAL_CSP_FORM_ACTION,
  buildCspFrameSrc,
} from "../paypal-csp";

export type AxelmondApp = {
  app: express.Express;
  routeCtx: RouteContext;
  allowedOrigins: Set<string>;
  isProduction: boolean;
  isSecurityRuntimeTest: boolean;
};

function normalizeOriginUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function canonicalSiteHostname(appUrl: string): string | null {
  try {
    return new URL(appUrl).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function addOriginPair(origins: Set<string>, origin: string) {
  const normalized = normalizeOriginUrl(origin);
  if (!normalized) return;
  origins.add(normalized);
  try {
    const url = new URL(normalized);
    const host = url.hostname.toLowerCase();
    if (host.startsWith("www.")) {
      origins.add(`${url.protocol}//${host.slice(4)}`);
    } else {
      origins.add(`${url.protocol}//www.${host}`);
    }
  } catch {
    // ignore malformed origin
  }
}

function buildAllowedOrigins(port: number, isProduction: boolean): Set<string> {
  const origins = new Set<string>();

  if (process.env.APP_URL?.trim()) {
    addOriginPair(origins, process.env.APP_URL);
  }

  if (process.env.ALLOWED_ORIGINS?.trim()) {
    for (const part of process.env.ALLOWED_ORIGINS.split(",")) {
      addOriginPair(origins, part);
    }
  }

  if (!isProduction) {
    origins.add(`http://localhost:${port}`);
    origins.add(`http://127.0.0.1:${port}`);
    origins.add("http://localhost:5173");
    origins.add("http://127.0.0.1:5173");
  }

  return origins;
}

function buildCspConnectSrc(allowedOrigins: Set<string>, isProduction: boolean): string[] {
  const connectSrc = [
    "'self'",
    "wss://*.livekit.cloud",
    "https://*.livekit.cloud",
    "https://uploadthing.com",
    "https://*.uploadthing.com",
    "https://ufs.sh",
    "https://*.ufs.sh",
    "https://utfs.io",
    "https://*.utfs.io",
    "https://api-m.sandbox.paypal.com",
    "https://api-m.paypal.com",
    "https://www.paypal.com",
    "https://www.sandbox.paypal.com",
  ];

  if (!isProduction) {
    connectSrc.push("ws://localhost:*", "ws://127.0.0.1:*", "http://localhost:*", "http://127.0.0.1:*");
  }

  for (const origin of allowedOrigins) {
    connectSrc.push(origin);
    if (origin.startsWith("https://")) {
      connectSrc.push(origin.replace(/^https:/, "wss:"));
    }
  }

  return connectSrc;
}

export function createAxelmondApp(options?: { port?: number }): AxelmondApp {
  const app = express();
  const PORT = Number(options?.port ?? process.env.PORT) || 3000;
  const isSecurityRuntimeTest = process.env.SECURITY_RUNTIME_TEST === "1";
  const isProduction = process.env.NODE_ENV === "production";
  const AUTH_MAX_ATTEMPTS = Number(process.env.AUTH_MAX_ATTEMPTS) || 20;
  const AUTH_LOCKOUT_WINDOW_MS = Number(process.env.AUTH_LOCKOUT_WINDOW_MS) || 1 * 60 * 1000;
  const uploadThingCallbackUrl =
    process.env.UPLOADTHING_CALLBACK_URL ||
    (process.env.APP_URL ? `${process.env.APP_URL}/api/uploadthing` : undefined);
  const isUploadThingDevMode =
    process.env.UPLOADTHING_IS_DEV === "true" ||
    process.env.NODE_ENV !== "production" ||
    Boolean(uploadThingCallbackUrl?.includes("localhost") || uploadThingCallbackUrl?.includes("127.0.0.1"));

  const allowedOrigins = buildAllowedOrigins(PORT, isProduction);
  if (isProduction && allowedOrigins.size === 0) {
    throw new Error("Production CORS allowlist is empty — set APP_URL and/or ALLOWED_ORIGINS");
  }
  const cspNonce = (_req: IncomingMessage, res: ServerResponse) =>
    `'nonce-${(res as express.Response).locals.cspNonce}'`;

  const cspFrameSrc = buildCspFrameSrc();

  app.use((_req, res, next) => {
    res.locals.cspNonce = crypto.randomBytes(16).toString("base64");
    next();
  });

  if (isProduction && process.env.APP_URL?.trim()) {
    const canonicalHost = canonicalSiteHostname(process.env.APP_URL);
    app.use((req, res, next) => {
      if (!canonicalHost) {
        next();
        return;
      }
      const host = String(req.headers.host || "")
        .split(":")[0]
        .toLowerCase();
      if (host === `www.${canonicalHost}`) {
        const target = `${process.env.APP_URL!.trim().replace(/\/+$/, "")}${req.originalUrl}`;
        res.redirect(301, target);
        return;
      }
      next();
    });
  }

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: isProduction
            ? ["'self'", cspNonce, ...PAYPAL_CSP_SCRIPT_SRC]
            : ["'self'", "'unsafe-inline'", "'unsafe-eval'", ...PAYPAL_CSP_SCRIPT_SRC],
          scriptSrcAttr: ["'none'"],
          frameSrc: cspFrameSrc,
          childSrc: cspFrameSrc,
          styleSrc: isProduction ? ["'self'", cspNonce] : ["'self'", "'unsafe-inline'"],
          styleSrcAttr: ["'unsafe-inline'"],
          imgSrc: [
            "'self'",
            "data:",
            "blob:",
            ...PAYPAL_CSP_IMG_SRC,
            "https://uploadthing.com",
            "https://*.uploadthing.com",
            "https://ufs.sh",
            "https://*.ufs.sh",
            "https://utfs.io",
            "https://*.utfs.io",
          ],
          mediaSrc: [
            "'self'",
            "https://uploadthing.com",
            "https://*.uploadthing.com",
            "https://ufs.sh",
            "https://*.ufs.sh",
            "https://utfs.io",
            "https://*.utfs.io",
          ],
          connectSrc: buildCspConnectSrc(allowedOrigins, isProduction),
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'", ...PAYPAL_CSP_FORM_ACTION],
          frameAncestors: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: { policy: "same-origin" },
      crossOriginResourcePolicy: { policy: "same-site" },
      originAgentCluster: true,
      hsts: isProduction ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    }),
  );

  app.use((_req, res, next) => {
    res.setHeader("Permissions-Policy", "camera=(self), microphone=(self), geolocation=(), payment=(self)");
    next();
  });

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const requestedHeaders = req.headers["access-control-request-headers"];
    const mobilePreflight =
      typeof requestedHeaders === "string" && requestedHeaders.toLowerCase().includes(MOBILE_CLIENT_HEADER);
    if (req.path.startsWith("/api/") && (isMobileClientRequest(req) || mobilePreflight)) {
      const reqOrigin = req.headers.origin;
      const originAllowed =
        typeof reqOrigin !== "string" ||
        !reqOrigin.length ||
        !isProduction ||
        allowedOrigins.has(normalizeOriginUrl(reqOrigin));
      applyMobileApiCorsHeaders(req, res, { originAllowed });
    } else if (origin && allowedOrigins.has(normalizeOriginUrl(origin))) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-CSRF-Token, X-Axelmond-Client, X-Axelmond-Client-Key");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    }
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  });

  app.use(cookieParser());
  app.use(mobileClientSpoofGuard);
  const routeCtx = createRouteContext(routeDeps);

  const paypalWebhookRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isSecurityRuntimeTest ? 9999 : Number(process.env.PAYPAL_WEBHOOK_RATE_LIMIT_MAX) || 120,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => ipKeyGenerator(req.ip || ""),
    message: {
      error: "Trop de requêtes webhook PayPal. Veuillez patienter 15 minutes.",
      code: "PAYPAL_WEBHOOK_RATE_LIMIT_EXCEEDED",
    },
  });

  registerPayPalWebhook(app, routeCtx, paypalWebhookRateLimiter);

  app.use(express.json({ limit: JSON_BODY_LIMIT }));
  app.use(csrfProtection);
  app.use(
    compression({
      filter(req, res) {
        if (req.path.startsWith("/api")) return false;
        return compression.filter(req, res);
      },
    }),
  );
  app.set("trust proxy", 1);

  const globalRateLimiter = rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Trop de requêtes. Veuillez réessayer dans quelques minutes.", code: "RATE_LIMIT_EXCEEDED" },
    skip: (req) => req.path === "/api/health",
  });

  const authRateLimiter = rateLimit({
    windowMs: AUTH_LOCKOUT_WINDOW_MS,
    max: AUTH_MAX_ATTEMPTS,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const email = req.body?.email;
      return email ? String(email).trim().toLowerCase() : ipKeyGenerator(req.ip || "");
    },
    message: {
      error: "Trop de tentatives d'authentification (20 maximum). Veuillez patienter 1 minute.",
      code: "AUTH_RATE_LIMIT_EXCEEDED",
    },
  });

  const emailVerificationSendRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: emailRateLimitKey,
    message: {
      error: "Trop de demandes de vérification. Veuillez patienter 15 minutes.",
      code: "EMAIL_RATE_LIMIT_EXCEEDED",
    },
  });

  const emailVerificationCheckRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: emailRateLimitKey,
    message: {
      error: "Trop de demandes de vérification. Veuillez patienter 15 minutes.",
      code: "EMAIL_RATE_LIMIT_EXCEEDED",
    },
  });

  const passwordResetRequestRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: emailRateLimitKey,
    message: {
      error: "Trop de demandes de vérification. Veuillez patienter 15 minutes.",
      code: "EMAIL_RATE_LIMIT_EXCEEDED",
    },
  });

  const passwordResetConfirmRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: emailRateLimitKey,
    message: {
      error: "Trop de demandes de vérification. Veuillez patienter 15 minutes.",
      code: "EMAIL_RATE_LIMIT_EXCEEDED",
    },
  });

  const uploadRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isSecurityRuntimeTest ? Number(process.env.UPLOAD_RATE_LIMIT_MAX) || 9999 : 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Trop d'envois de fichiers. Veuillez patienter 15 minutes.", code: "UPLOAD_RATE_LIMIT_EXCEEDED" },
  });

  const liveKitRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.LIVEKIT_RATE_LIMIT_MAX) || 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: "Trop de demandes de connexions live. Veuillez patienter 15 minutes.",
      code: "LIVEKIT_RATE_LIMIT_EXCEEDED",
    },
  });

  const liveKitModerationRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isSecurityRuntimeTest
      ? Number(process.env.LIVEKIT_MODERATION_RATE_LIMIT_MAX) || 9999
      : Number(process.env.LIVEKIT_MODERATION_RATE_LIMIT_MAX) || 30,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: liveKitRateLimitKey,
    message: {
      error: "Trop d'actions de modération live. Veuillez patienter 15 minutes.",
      code: "LIVEKIT_MODERATION_RATE_LIMIT_EXCEEDED",
    },
  });

  const adminReadRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isSecurityRuntimeTest
      ? Number(process.env.ADMIN_READ_RATE_LIMIT_MAX) || 9999
      : Number(process.env.ADMIN_READ_RATE_LIMIT_MAX) || 300,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: adminRateLimitKey,
    message: {
      error: "Trop de lectures admin. Veuillez patienter 15 minutes.",
      code: "ADMIN_READ_RATE_LIMIT_EXCEEDED",
    },
  });

  const adminMutationRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isSecurityRuntimeTest
      ? Number(process.env.ADMIN_MUTATION_RATE_LIMIT_MAX) || 9999
      : Number(process.env.ADMIN_MUTATION_RATE_LIMIT_MAX) || 60,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: adminRateLimitKey,
    message: {
      error: "Trop d'actions admin. Veuillez patienter 15 minutes.",
      code: "ADMIN_MUTATION_RATE_LIMIT_EXCEEDED",
    },
  });

  const adminDiagnosticRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isSecurityRuntimeTest
      ? Number(process.env.ADMIN_DIAGNOSTIC_RATE_LIMIT_MAX) || 9999
      : Number(process.env.ADMIN_DIAGNOSTIC_RATE_LIMIT_MAX) || 10,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: adminRateLimitKey,
    message: {
      error: "Trop de diagnostics email. Veuillez patienter 15 minutes.",
      code: "ADMIN_DIAGNOSTIC_RATE_LIMIT_EXCEEDED",
    },
  });

  const ADMIN_MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
  const adminRouteRateLimiter: express.RequestHandler = (req, res, next) => {
    if (req.method === "GET") {
      adminReadRateLimiter(req, res, next);
      return;
    }
    if (ADMIN_MUTATION_METHODS.has(req.method)) {
      adminMutationRateLimiter(req, res, next);
      return;
    }
    next();
  };

  const chatTutorRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.CHAT_TUTOR_RATE_LIMIT_MAX) || 30,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
      const session = verifyAuthToken(token);
      if (session?.userId) return `chat-tutor:user:${session.userId}`;
      return ipKeyGenerator(req.ip || "");
    },
    message: {
      error: "Trop de questions à l'assistant. Veuillez patienter 15 minutes.",
      code: "CHAT_TUTOR_RATE_LIMIT_EXCEEDED",
    },
  });

  const paypalRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isSecurityRuntimeTest ? 9999 : Number(process.env.PAYPAL_RATE_LIMIT_MAX) || 10,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: liveKitRateLimitKey,
    message: { error: "Trop de demandes PayPal. Veuillez patienter 15 minutes.", code: "PAYPAL_RATE_LIMIT_EXCEEDED" },
  });

  const liveKitMessagesRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.LIVEKIT_MESSAGES_RATE_LIMIT_MAX) || 60,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: liveKitRateLimitKey,
    message: {
      error: "Trop de messages live. Veuillez patienter 15 minutes.",
      code: "LIVEKIT_MESSAGES_RATE_LIMIT_EXCEEDED",
    },
  });

  const liveKitEventsRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.LIVEKIT_EVENTS_RATE_LIMIT_MAX) || 60,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: liveKitRateLimitKey,
    message: {
      error: "Trop d'événements live. Veuillez patienter 15 minutes.",
      code: "LIVEKIT_EVENTS_RATE_LIMIT_EXCEEDED",
    },
  });

  const messagingRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.MESSAGING_RATE_LIMIT_MAX) || 60,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: liveKitRateLimitKey,
    message: { error: "Trop de messages. Veuillez patienter 15 minutes.", code: "MESSAGING_RATE_LIMIT_EXCEEDED" },
  });

  const contactSupportRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: Number(process.env.CONTACT_SUPPORT_RATE_LIMIT_MAX) || 5,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: liveKitRateLimitKey,
    message: {
      error: "Trop de demandes contact/support. Veuillez patienter 1 heure.",
      code: "CONTACT_SUPPORT_RATE_LIMIT_EXCEEDED",
    },
  });

  const liveKitSyncRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.LIVEKIT_SYNC_RATE_LIMIT_MAX) || 120,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: liveKitRateLimitKey,
    message: {
      error: "Trop de synchronisations live. Veuillez patienter 15 minutes.",
      code: "LIVEKIT_SYNC_RATE_LIMIT_EXCEEDED",
    },
  });

  const refreshRateLimiter = rateLimit({
    windowMs: REFRESH_RATE_LIMIT_WINDOW_MS,
    max: REFRESH_RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const refreshToken = readRefreshTokenFromRequest(req);
      if (refreshToken) {
        return `refresh:${hashRefreshToken(refreshToken).slice(0, 24)}`;
      }
      return ipKeyGenerator(req.ip || "");
    },
    message: {
      error: "Trop de tentatives de renouvellement de session. Réessayez plus tard.",
      code: "REFRESH_RATE_LIMIT_EXCEEDED",
    },
  });

  app.use("/api", globalRateLimiter);
  app.use("/api/auth/login", authRateLimiter);
  app.use("/api/auth/register", authRateLimiter);
  app.use("/api/auth/refresh", refreshRateLimiter);
  app.use("/api/auth/resend-verification-code", emailVerificationSendRateLimiter);
  app.use("/api/auth/verify-email", emailVerificationCheckRateLimiter);
  app.use("/api/auth/forgot-password", passwordResetRequestRateLimiter);
  app.use("/api/auth/reset-password", passwordResetConfirmRateLimiter);
  app.use("/api/auth/mfa/totp/verify", authRateLimiter);
  app.use("/api/auth/mfa/passkey/login/options", authRateLimiter);
  app.use("/api/auth/mfa/passkey/login/verify", authRateLimiter);
  app.use("/api/uploadthing", uploadRateLimiter);
  app.use("/api/me/avatar", uploadRateLimiter);
  app.use("/api/livekit/token", liveKitRateLimiter);
  app.use("/api/livekit/moderation", liveKitModerationRateLimiter);
  app.use("/api/livekit/messages", liveKitMessagesRateLimiter);
  app.use("/api/livekit/events", liveKitEventsRateLimiter);
  app.use("/api/livekit/sync", liveKitSyncRateLimiter);
  app.use("/api/conversations", messagingRateLimiter);
  app.use("/api/paypal", paypalRateLimiter);
  app.use("/api/contact", contactSupportRateLimiter);
  app.use("/api/support", contactSupportRateLimiter);
  app.use("/api/admin", adminRouteRateLimiter);
  app.use("/api/chat-tutor", chatTutorRateLimiter);
  app.use("/api/test-email", adminDiagnosticRateLimiter);

  app.use(
    "/api/uploadthing",
    createRouteHandler({
      router: uploadRouter,
      config: {
        token: process.env.UPLOADTHING_TOKEN,
        callbackUrl: uploadThingCallbackUrl,
        isDev: isUploadThingDevMode,
        logLevel: process.env.LOG_LEVEL === "debug" ? "Debug" : "Info",
      },
    }),
  );

  app.use("/api", requestTimingMiddleware);
  app.use("/api", routeCtx.middleware.requireGlobalApiRbac);
  registerApiRoutes(app, routeCtx);

  return { app, routeCtx, allowedOrigins, isProduction, isSecurityRuntimeTest };
}
