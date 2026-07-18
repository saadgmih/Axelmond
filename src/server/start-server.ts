import { createServer } from "node:http";
import path from "node:path";
import fs from "node:fs";
import express from "express";
import { loadEnv } from "../load-env";
import { createServer as createViteServer } from "vite";
import { patchExpressAsyncRoutes } from "../express-async";
import { isBlockedProductionSourcePath } from "../static-source-guard";
import { assertProductionConfiguration } from "../production-config";
import { initMessagingSocket, stopMessagingSocket } from "../messaging-socket";
import { verifyDatabaseConnection } from "../db";
import { getPayPalRuntimeEnv } from "../paypal-server";
import { startPerformanceMonitor } from "../performance";
import { initCache, startCachePruner, stopCachePruner, disconnectCache } from "../cache";
import { startAuditLogRetention, stopAuditLogRetention } from "../audit-log-service";
import { startRefreshTokenCleanup, stopRefreshTokenCleanup } from "../auth-token-cleanup";
import { verifySmtpConnection, readSmtpBanner, getSmtpStartupSummary } from "../email";
import { seedDatabase, synchronizePostgresSequences } from "./startup-db";
import { apiErrorStatus, apiErrorMessage } from "./api-errors";
import { createAxelmondApp } from "./create-app";
import { logDb, logEmail, startAuthUserCachePruner, stopAuthUserCachePruner } from "./route-deps";
import { startupState } from "./startup-state";
import { stopPerformanceMonitor } from "../performance";
import { isVerboseStartup } from "./startup-logging";
import { drainDatabaseForShutdown, isExpectedShutdownCancellation, startupLifecycle } from "./startup-lifecycle";
import { getActiveHttpRequestCount, waitForActiveHttpRequests } from "./shutdown-coordination";
import { isKnownPlatformPath } from "../navigation/platformPaths";
import { renderPlatformHtml } from "./html-document";
import { getStaticCacheControl } from "./static-cache-policy";

loadEnv();

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
  if (isProduction && !isVerboseStartup()) {
    const integrationKeys = [
      "DATABASE_URL",
      "AUTH_TOKEN_SECRET",
      "PAYPAL_CLIENT_ID",
      "PAYPAL_CLIENT_SECRET",
      "PAYPAL_WEBHOOK_ID",
      "LIVEKIT_URL",
      "LIVEKIT_API_KEY",
      "LIVEKIT_API_SECRET",
      "UPLOADTHING_TOKEN",
      "SMTP_HOST",
      "SMTP_USER",
      "SMTP_PASS",
      "OPENAI_API_KEY",
    ] as const;
    const configuredCount = integrationKeys.filter((key) => isConfiguredEnv(key).configured).length;
    logDb("INFO", "Production environment loaded", {
      corsOriginCount: allowedOrigins.size,
      integrationsConfigured: configuredCount,
      integrationsTotal: integrationKeys.length,
    });
  } else {
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
  }
  if (isProduction && allowedOrigins.size === 0) {
    throw new Error("Production CORS allowlist is empty — set APP_URL and/or ALLOWED_ORIGINS");
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
  const indexTemplate = fs.readFileSync(path.join(distPath, "index.html"), "utf8");

  app.use((req, res, next) => {
    if (isBlockedProductionSourcePath(req.path)) {
      res.status(404).end();
      return;
    }
    next();
  });

  app.use(
    express.static(distPath, {
      dotfiles: "deny",
      index: false,
      setHeaders(res, filePath) {
        res.setHeader("X-Content-Type-Options", "nosniff");
        const cacheControl = getStaticCacheControl(filePath, distPath);
        if (cacheControl) res.setHeader("Cache-Control", cacheControl);
        if (filePath.endsWith(".xml")) {
          res.setHeader("Content-Type", "application/xml; charset=utf-8");
          return;
        }
        if (filePath.endsWith("robots.txt")) {
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
        }
      },
    }),
  );

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

  const FILE_EXTENSION_RE = /\.[a-zA-Z0-9]{2,8}$/;

  app.get("*", (req, res) => {
    if (isBlockedProductionSourcePath(req.path)) {
      res.status(404).end();
      return;
    }
    if (req.path === "/sitemap.xml" || req.path === "/robots.txt") {
      res.status(404).type("text/plain").send("Not found");
      return;
    }

    // Never serve the SPA shell for URLs with file extensions.
    // A request for /uploads/file.pdf or /assets/missing.js that reaches
    // this point means the static file was not found — return a real 404.
    if (FILE_EXTENSION_RE.test(req.path)) {
      res.status(404).type("text/plain").send("File not found");
      return;
    }

    res
      .status(isKnownPlatformPath(req.path) ? 200 : 404)
      .type("html")
      .setHeader("Cache-Control", "no-cache, must-revalidate, no-transform")
      .send(renderPlatformHtml(indexTemplate, req.path));
  });
  console.log(isVerboseStartup() ? "Serving static files in production mode." : "Static assets enabled.");
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
    if (isExpectedShutdownCancellation(reason)) return;
    logDb("ERROR", "Unhandled promise rejection — process staying alive", { reason: String(reason) });
  });

  logEnvironmentStatus(allowedOrigins, isProduction);

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

  const rawPort = process.env.PORT || "3000";
  const isPipe = isNaN(Number(rawPort));
  const PORT = isPipe ? rawPort : Number(rawPort);
  const httpServer = createServer(app);
  setImmediate(() => {
    if (startupLifecycle.signal.aborted) return;
    const messagingStartup = startupLifecycle.trackCriticalTask(
      initMessagingSocket(httpServer, allowedOrigins, normalizeOriginUrl, isProduction),
    );
    void messagingStartup.catch((err) => {
      if (!startupLifecycle.signal.aborted) {
        logDb("ERROR", "Messaging socket initialization failed", { error: String(err) });
      }
    });
  });
  registerGracefulShutdown(httpServer, isProduction);
  httpServer.on("error", (err: NodeJS.ErrnoException) => {
    logDb("ERROR", "HTTP server failed to bind", { port: PORT, code: err.code, error: String(err) });
    if (process.env.HOSTINGER_WEBAPP === "1" && err.code === "EADDRINUSE") {
      console.error("[hostinger] Port already in use — another instance is still running. Exiting without failure.");
      process.exit(0);
    }
    process.exit(1);
  });
  await new Promise<void>((resolve, reject) => {
    const listenCallback = () => {
      if (isVerboseStartup()) {
        console.log(
          `Performance Académique server running (pid=${process.pid}, target=${PORT}, NODE_ENV=${process.env.NODE_ENV || "development"})`,
        );
      } else {
        console.log(`Performance Académique server running on ${isPipe ? "pipe" : "port"} ${PORT}`);
      }
      resolve();
    };

    if (typeof PORT === "string") {
      httpServer.listen(PORT as string, listenCallback);
    } else {
      httpServer.listen(PORT, "0.0.0.0", listenCallback);
    }
    httpServer.once("error", reject);
  });

  startupState.listening = true;
  const deferredStartup = startupLifecycle.trackCriticalTask(
    runDeferredStartupTasks(securityTest, startupLifecycle.signal),
  );
  void deferredStartup.catch((err) => {
    if (!isExpectedShutdownCancellation(err)) {
      logDb("ERROR", "Deferred startup task failed", { error: String(err) });
    }
  });
}

async function verifyDatabaseAtStartup(signal: AbortSignal) {
  if (signal.aborted) return;
  const dbCheck = await verifyDatabaseConnection({
    trackTask: (task) => startupLifecycle.trackCriticalTask(task),
  });
  if (signal.aborted) return;
  startupState.dbVerified = dbCheck.ok;
  if (dbCheck.ok) {
    logDb(
      "INFO",
      isVerboseStartup() ? "Database schema verified at startup" : "Database connection verified at startup",
      isVerboseStartup() ? { schema: dbCheck.schema } : undefined,
    );
  } else {
    logDb("ERROR", "Database schema verification failed at startup", {
      schema: dbCheck.schema,
      error: dbCheck.error,
    });
  }
}

async function runDeferredStartupTasks(securityTest: boolean, signal: AbortSignal) {
  if (signal.aborted) return;
  await initCache();
  if (signal.aborted) return;
  startCachePruner();

  try {
    await verifyDatabaseAtStartup(signal);
  } catch (err) {
    if (!signal.aborted) {
      logDb("ERROR", "Database verification threw at startup", { error: String(err) });
    }
  }
  if (signal.aborted) return;

  try {
    await seedDatabase();
  } catch (err) {
    if (!signal.aborted) {
      logDb("ERROR", "Startup seed failed — server continuing", { error: String(err) });
    }
  }
  if (signal.aborted) return;

  try {
    await synchronizePostgresSequences();
  } catch (err) {
    if (!signal.aborted) {
      logDb("WARN", "PostgreSQL sequence sync skipped", { error: String(err) });
    }
  }
  if (signal.aborted) return;

  if (securityTest) {
    logDb("INFO", "Security runtime test mode: skipping SMTP checks and background monitors");
    return;
  }

  startAuthUserCachePruner();
  await Promise.all([startAuditLogRetention(signal), startRefreshTokenCleanup(signal)]);
  if (signal.aborted) return;
  startPerformanceMonitor(Number(process.env.PERF_MONITOR_INTERVAL_MS) || 300_000);

  void verifySmtpAtStartup(signal).catch((err) => {
    if (!signal.aborted) {
      logEmail("WARN", "Email service verification threw at startup", { error: String(err) });
    }
  });
}

async function verifySmtpAtStartup(signal: AbortSignal) {
  if (signal.aborted) return;
  if (process.env.HOSTINGER_WEBAPP === "1") {
    logEmail("INFO", "SMTP startup checks skipped on Hostinger Web App");
    return;
  }
  const smtpCheck = await verifySmtpConnection();
  if (signal.aborted) return;
  if (smtpCheck.ok) {
    logEmail(
      "INFO",
      isVerboseStartup() ? "SMTP connection verified at startup" : "Email service verified at startup",
      isVerboseStartup() ? { smtp: smtpCheck.details } : getSmtpStartupSummary(),
    );
  } else {
    logEmail(smtpCheck.configured ? "ERROR" : "WARN", "SMTP connection verification failed at startup", {
      ...(isVerboseStartup() ? { smtp: smtpCheck.details } : getSmtpStartupSummary()),
      error: smtpCheck.error,
    });
  }
  if (!isVerboseStartup()) return;

  const smtpBanner = await readSmtpBanner();
  if (signal.aborted) return;
  if (smtpBanner.ok) {
    logEmail("INFO", "SMTP banner received at startup", { smtp: smtpBanner.details, banner: smtpBanner.banner });
  } else {
    logEmail("WARN", "SMTP banner check failed at startup", {
      smtp: smtpBanner.details,
      error: "error" in smtpBanner ? smtpBanner.error : undefined,
    });
  }
}

function registerGracefulShutdown(httpServer: ReturnType<typeof createServer>, isProduction: boolean) {
  const shutdownTimeoutMs =
    Number(process.env.GRACEFUL_SHUTDOWN_MS) ||
    (process.env.HOSTINGER_WEBAPP === "1" ? 8_000 : isProduction ? 5_000 : 15_000);

  const shutdown = async (signal: string) => {
    if (!startupLifecycle.beginShutdown(signal)) return;
    const shutdownStartedAt = Date.now();
    logDb("INFO", "Graceful shutdown initiated", {
      signal,
      pid: process.pid,
      shutdownTimeoutMs,
      activeHttpRequests: getActiveHttpRequestCount(),
    });

    const forcedShutdownTimer = setTimeout(() => {
      logDb("ERROR", "Forced shutdown after timeout", {
        signal,
        shutdownTimeoutMs,
        activeHttpRequests: getActiveHttpRequestCount(),
      });
      process.exit(1);
    }, shutdownTimeoutMs);
    forcedShutdownTimer.unref();

    stopPerformanceMonitor();
    stopCachePruner();
    stopAuthUserCachePruner();

    const httpClosed = new Promise<void>((resolve) => {
      httpServer.close(() => {
        logDb("INFO", "HTTP server closed", { signal, activeHttpRequests: getActiveHttpRequestCount() });
        resolve();
      });
    });
    const messagingClosed = stopMessagingSocket().catch((err) => {
      logDb("WARN", "Messaging socket shutdown failed", { error: String(err) });
    });

    const remainingAfterHttpClose = () => Math.max(0, shutdownTimeoutMs - (Date.now() - shutdownStartedAt));
    await messagingClosed;
    const requestsDrained = await waitForActiveHttpRequests(remainingAfterHttpClose());
    if (!requestsDrained) {
      logDb("WARN", "Active HTTP requests still running before database shutdown", {
        signal,
        activeHttpRequests: getActiveHttpRequestCount(),
      });
      httpServer.closeAllConnections?.();
    }

    const databaseDisconnected = requestsDrained
      ? await drainDatabaseForShutdown({
          lifecycle: startupLifecycle,
          timeoutMs: remainingAfterHttpClose(),
          stopDatabaseTasks: async () => {
            await Promise.all([stopAuditLogRetention(), stopRefreshTokenCleanup()]);
          },
          disconnectDatabase: async () => {
            try {
              await disconnectCache();
            } catch (err) {
              logDb("WARN", "Cache disconnect failed during shutdown", { error: String(err) });
            }
            try {
              const { disconnectDatabase } = await import("../db");
              await disconnectDatabase();
            } catch (err) {
              logDb("WARN", "Database disconnect failed during shutdown", { error: String(err) });
            }
          },
        })
      : false;

    if (!databaseDisconnected) {
      logDb("WARN", "Database disconnect skipped because startup tasks did not finish in time", {
        signal,
        shutdownTimeoutMs,
        activeHttpRequests: getActiveHttpRequestCount(),
      });
    }

    httpServer.closeAllConnections?.();
    await httpClosed;
    clearTimeout(forcedShutdownTimer);
    process.exit(databaseDisconnected ? 0 : 1);
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}
