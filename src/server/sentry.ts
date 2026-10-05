// ─── Sentry (suivi d'erreurs production) ────────────────────────────────────
//
// Sans SENTRY_DSN : aucun effet (zéro réseau, zéro middleware).
// Avec SENTRY_DSN : capture les erreurs des routes Express et les
// exceptions non interceptées du process.
// L'import est dynamique pour ne rien coûter quand la clé est absente.

import type { Express } from "express";

let initialized = false;
type SentryModule = typeof import("@sentry/node");
let sentryModule: SentryModule | null = null;

export function isSentryEnabled(): boolean {
  return initialized;
}

async function loadSentry(): Promise<SentryModule> {
  if (!sentryModule) sentryModule = (await import("@sentry/node")) as SentryModule;
  return sentryModule;
}

export async function initSentry(): Promise<boolean> {
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn || initialized) return initialized;

  const Sentry = await loadSentry();
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "production",
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0.05,
    integrations: [Sentry.expressIntegration()],
  });
  initialized = true;
  console.log(`[${new Date().toISOString()}] [INFO] [sentry] Error tracking enabled`);
  return true;
}

/**
 * Monte le porteur d'erreurs Sentry (API v10 : setupExpressErrorHandler).
 * À appeler juste après la création de l'app : monté en premier dans la
 * pile, il capture l'erreur puis next(err) vers le porteur métier qui
 * répond au client.
 */
export async function attachSentryExpressErrorHandler(app: Express): Promise<void> {
  if (!initialized) return;
  const Sentry = await loadSentry();
  Sentry.setupExpressErrorHandler(app);
}

/** Signale une exception non interceptée — no-op si Sentry est désactivé. */
export async function captureSentryException(err: unknown): Promise<void> {
  if (!initialized) return;
  const Sentry = await loadSentry();
  Sentry.captureException(err);
}
