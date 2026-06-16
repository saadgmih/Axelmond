#!/usr/bin/env node
/**
 * Fail fast when Hostinger Web App is misconfigured to spawn extra Node processes.
 * Set HOSTINGER_WEBAPP=1 in hPanel environment variables.
 */
const forbidden = [];

if (process.env.HOSTINGER_WEBAPP === "1") {
  if (process.env.pm_id !== undefined || process.env.PM2_HOME) {
    forbidden.push("PM2 must not run alongside Hostinger Node.js Web App (remove pm2 start / start:cluster).");
  }
  if (process.env.NODE_APP_INSTANCE !== undefined && Number(process.env.NODE_APP_INSTANCE) > 0) {
    forbidden.push("Multiple Node cluster instances detected — Hostinger shared hosting allows one process.");
  }
}

if (forbidden.length > 0) {
  console.error("[hostinger-preflight] Invalid runtime configuration:");
  for (const message of forbidden) {
    console.error(`  - ${message}`);
  }
  process.exit(1);
}
