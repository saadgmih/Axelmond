// ─── Logger structuré unique de la plateforme ───────────────────────────────
//
// Backend pino partagé par tous les helpers de log (logDb, logEmail,
// logSecurity, logCache, logLiveKit…). En production : JSON sur stdout
// (machine-parseable pour Hostinger). En dev : sortie lisible pino-pretty
// si installé. SANS SENTRY/LOG_LEVEL : comportement identique, juste
// structuré et avec niveaux.

import pino from "pino";

export type PlatformLogLevel = "INFO" | "WARN" | "ERROR";

const isProduction = process.env.NODE_ENV === "production";

export const platformLogger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:HH:MM:ss",
            ignore: "pid,hostname,component",
          },
        },
      }),
});

/** Les INFO verbeux sont coupés en production sauf jalons de cycle de vie. */
export function isInfoIgnoredInProduction(level: PlatformLogLevel, message: string): boolean {
  if (!isProduction || level !== "INFO") return false;
  const msg = message.toLowerCase();
  return !(
    msg.includes("loaded") ||
    msg.includes("running") ||
    msg.includes("shutdown") ||
    msg.includes("verified") ||
    msg.includes("started") ||
    msg.includes("listening")
  );
}

/**
 * Point d'entrée unique : platformLog("WARN", "db", "Message", { …data }).
 * Les helpers métier (logDb, logEmail…) délèguent tous ici.
 */
export function platformLog(
  level: PlatformLogLevel,
  component: string,
  message: string,
  data?: unknown,
): void {
  if (isInfoIgnoredInProduction(level, message)) return;
  const sink = level === "INFO" ? "info" : level === "WARN" ? "warn" : "error";
  platformLogger[sink]({ component, ...(data !== undefined ? { data } : {}) }, message);
}
