import { createServer } from "node:http";
import path from "node:path";
import fs from "node:fs";
import express from "express";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { patchExpressAsyncRoutes } from "../express-async";
import { isBlockedProductionSourcePath } from "../static-source-guard";
import { assertProductionConfiguration } from "../production-config";
import { initMessagingSocket } from "../messaging-socket";
import { prisma, verifyDatabaseConnection } from "../db";
import { getPayPalRuntimeEnv } from "../paypal-server";
import { startPerformanceMonitor } from "../performance";
import { startCachePruner } from "../cache";
import { logSecurity } from "../security-logger";
import { verifySmtpConnection, readSmtpBanner } from "../email";
import { seedDatabase, synchronizePostgresSequences } from "./startup-db";
import { apiErrorStatus, apiErrorMessage } from "./api-errors";
import { createAxelmondApp } from "./create-app";
import { logDb, logEmail } from "./route-deps";

dotenv.config();

function normalizeOriginUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function wrapRouteHandler(handler: unknown) {
  if (typeof handler !== "function" || (handler as Function).length === 4) return handler;
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const result = (handler as Function)(req, res, next);
      if (result && typeof (result as Promise<unknown>).catch === "function") {
        (result as Promise<unknown>).catch(next);
      }
      return result;
    } catch (err) {
      next(err);
    }
  };
}

function patchAsyncRouteHandlers(app: express.Express) {
  for (const method of ["get", "post", "put", "patch", "delete"] as const) {
    const original = (app as any)[method].bind(app);
    (app as any)[method] = (pathOrRoute: unknown, ...handlers: unknown[]) =>
      original(pathOrRoute, ...handlers.map(wrapRouteHandler));
  }
}

function isConfiguredEnv(name: string) {
  const value = process.env[name];
  return {
    configured: Boolean(value),
    trimmed: value ? value === value.trim() : true,
  };
}

function logEnvironmentStatus(allowedOrigins: Set<string>, isProduction: boolean) {
  logDb("INFO", "Environment configuration loaded", {
    NODE_ENV: process.env.NODE_ENV || "development",
    APP_URL: isConfiguredEnv("APP_URL"),
    ALLOWED_ORIGINS: isConfiguredEnv("ALLOWED_ORIGINS"),
    corsOriginCount: allowedOrigins.size,
    DATABASE_URL: isConfiguredEnv("DATABASE_URL"),
    AUTH_TOKEN_SECRET: isConfiguredEnv("AUTH_TOKEN_SECRET"),
    PAYPAL_CLIENT_ID: isConfiguredEnv("PAYPAL_CLIENT_ID"),
    PAYPAL_CLIENT_SECRET: isConfiguredEnv("PAYPAL_CLIENT_SECRET"),
    PAYPAL_WEBHOOK_ID: isConfiguredEnv("PAYPAL_WEBHOOK_ID"),
    PAYPAL_ENV: getPayPalRuntimeEnv(),
    LIVEKIT_URL: isConfiguredEnv("LIVEKIT_URL"),
    LIVEKIT_API_KEY: isConfiguredEnv("LIVEKIT_API_KEY"),
    LIVEKIT_API_SECRET: isConfiguredEnv("LIVEKIT_API_SECRET"),
    UPLOADTHING_TOKEN: isConfiguredEnv("UPLOADTHING_TOKEN"),
    UPLOADTHING_IS_DEV: process.env.UPLOADTHING_IS_DEV === "true",
    SMTP_HOST: isConfiguredEnv("SMTP_HOST"),
    SMTP_USER: isConfiguredEnv("SMTP_USER"),
    SMTP_PASS: isConfiguredEnv("SMTP_PASS"),
    OPENAI_API_KEY: isConfiguredEnv("OPENAI_API_KEY"),
  });
  if (isProduction && allowedOrigins.size === 0) {
    logSecurity("WARN", "Production CORS has no allowed origins — set APP_URL and/or ALLOWED_ORIGINS", {});
  }
}

function logApiResponse(req: express.Request, res: express.Response, startedAt: number) {
  if (String(process.env.LOG_LEVEL || "").toLowerCase() !== "debug") return;
  logDb("INFO", "API response", {
    method: req.method,
    path: req.originalUrl,
    status: res.statusCode,
    durationMs: Date.now() - startedAt,
  });
}

async function attachStaticOrVite(app: express.Express, isSecurityRuntimeTest: boolean, isProduction: boolean) {
  if (isSecurityRuntimeTest) {
    console.log("Security runtime test mode: API-only server (no Vite/static middleware).");
    return;
  }

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development server middleware activated in Express.");
    return;
  }

  const distPath = path.join(process.cwd(), "dist");

  app.use((req, res, next) => {
    if (isBlockedProductionSourcePath(req.path)) {
      res.status(404).end();
      return;
    }
    next();
  });

  app.use(express.static(distPath, {
    dotfiles: "deny",
    index: false,
    setHeaders(res, filePath) {
      res.setHeader("X-Content-Type-Options", "nosniff");
      if (filePath.endsWith(".xml")) {
        res.setHeader("Content-Type", "application/xml; charset=utf-8");
        res.setHeader("Cache-Control", "public, max-age=86400");
        return;
      }
      if (filePath.endsWith("robots.txt")) {
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.setHeader("Cache-Control", "public, max-age=86400");
        return;
      }
      if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-store");
        return;
      }
      if (/\.(js|css|woff2?|png|svg|jpg|jpeg|webp|ico)$/i.test(filePath)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      }
    },
  }));

  const seoStaticFiles = ["sitemap.xml", "robots.txt"] as const;
  for (const fileName of seoStaticFiles) {
    app.get(`/${fileName}`, (_req, res) => {
      const filePath = path.join(distPath, fileName);
      if (!fs.existsSync(filePath)) {
        res.status(404).type("text/plain").send("Not found");
        return;
      }
      res.type(fileName.endsWith(".xml") ? "application/xml" : "text/plain");
      res.sendFile(filePath);
    });
  }

  app.get("*", (req, res) => {
    if (isBlockedProductionSourcePath(req.path)) {
      res.status(404).end();
      return;
    }
    if (req.path === "/sitemap.xml" || req.path === "/robots.txt") {
      res.status(404).type("text/plain").send("Not found");
      return;
    }
    res.sendFile(path.join(distPath, "index.html"));
  });
  console.log("Serving static files in production mode.");
}

export async function startAxelmondServer() {
  const isSecurityRuntimeTest = process.env.SECURITY_RUNTIME_TEST === "1";
  if (!isSecurityRuntimeTest) {
    assertProductionConfiguration(process.env);
  }

  const { app, allowedOrigins, isProduction, isSecurityRuntimeTest: securityTest } = createAxelmondApp();
  patchExpressAsyncRoutes(app);
  patchAsyncRouteHandlers(app);

  app.use("/api", (req, res, next) => {
    const startedAt = Date.now();
    res.on("finish", () => logApiResponse(req, res, startedAt));
    next();
  });

  process.on("uncaughtException", (err) => {
    logDb("ERROR", "Uncaught exception — process staying alive", { error: String(err), stack: err?.stack });
  });

  process.on("unhandledRejection", (reason) => {
    logDb("ERROR", "Unhandled promise rejection — process staying alive", { reason: String(reason) });
  });

  logEnvironmentStatus(allowedOrigins, isProduction);

  const dbCheck = await verifyDatabaseConnection();
  if (dbCheck.ok) {
    logDb("INFO", "Database schema verified at startup", { schema: dbCheck.schema });
  } else {
    logDb("ERROR", "Database schema verification failed at startup", {
      schema: dbCheck.schema,
      error: dbCheck.error,
    });
  }

  try {
    await seedDatabase();
  } catch (err) {
    logDb("ERROR", "Startup seed failed — server continuing", { error: String(err) });
  }

  try {
    await synchronizePostgresSequences();
  } catch (err) {
    logDb("WARN", "PostgreSQL sequence sync skipped", { error: String(err) });
  }

  if (!securityTest) {
    const smtpCheck = await verifySmtpConnection();
    if (smtpCheck.ok) {
      logEmail("INFO", "SMTP connection verified at startup", { smtp: smtpCheck.details });
    } else {
      logEmail(smtpCheck.configured ? "ERROR" : "WARN", "SMTP connection verification failed at startup", {
        smtp: smtpCheck.details,
        error: smtpCheck.error,
      });
    }
    const smtpBanner = await readSmtpBanner();
    if (smtpBanner.ok) {
      logEmail("INFO", "SMTP banner received at startup", { smtp: smtpBanner.details, banner: smtpBanner.banner });
    } else {
      logEmail("WARN", "SMTP banner check failed at startup", { smtp: smtpBanner.details, error: "error" in smtpBanner ? smtpBanner.error : undefined });
    }

    startCachePruner();
    startPerformanceMonitor(Number(process.env.PERF_MONITOR_INTERVAL_MS) || 30_000);
  } else {
    logDb("INFO", "Security runtime test mode: skipping SMTP checks and background monitors");
  }

  app.use("/api", (err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
    const status = apiErrorStatus(err);
    const code = (err as { code?: string; name?: string })?.code || (err as { name?: string })?.name || "API_ERROR";
    logDb("ERROR", "API route failed", {
      method: req.method,
      path: req.originalUrl,
      status,
      code,
      message: apiErrorMessage(err),
    });
    if (res.headersSent) {
      next(err);
      return;
    }
    res.status(status).json(
      isProduction
        ? { error: apiErrorMessage(err) }
        : {
            error: apiErrorMessage(err),
            code,
            route: `${req.method} ${req.originalUrl}`,
          },
    );
  });

  await attachStaticOrVite(app, securityTest, isProduction);

  const PORT = Number(process.env.PORT) || 3000;
  const httpServer = createServer(app);
  initMessagingSocket(httpServer, allowedOrigins, normalizeOriginUrl);
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Axelmond Research Labs server running at http://localhost:${PORT}`);
  });
}
