#!/usr/bin/env tsx
import fs from "node:fs";
import { validateProductionConfiguration } from "../src/production-config.ts";

const env: NodeJS.ProcessEnv = { ...process.env };
const dotenvPath = ".env";
if (fs.existsSync(dotenvPath)) {
  for (const line of fs.readFileSync(dotenvPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!env[key]) env[key] = value;
  }
}

env.NODE_ENV = env.NODE_ENV || "production";

const issues = validateProductionConfiguration(env);
const checks = [
  {
    id: "production-config",
    ok: issues.length === 0,
    detail: issues.length ? issues.join("; ") : "ok",
  },
  {
    id: "mobile-client-secret",
    ok: Boolean(env.MOBILE_CLIENT_SECRET && env.MOBILE_CLIENT_SECRET.length >= 32),
    detail: env.MOBILE_CLIENT_SECRET ? `${env.MOBILE_CLIENT_SECRET.length} chars` : "missing",
  },
  {
    id: "database-ssl",
    ok: !env.DATABASE_URL || /sslmode=(require|verify-full|verify-ca)/i.test(env.DATABASE_URL),
    detail: env.DATABASE_URL ? "sslmode ok" : "no DATABASE_URL",
  },
  {
    id: "dangerous-flags-off",
    ok:
      env.ALLOW_MOCK_ENROLLMENT !== "true" &&
      env.HIBP_FAIL_OPEN !== "true" &&
      env.REGISTRATION_SEED_ENROLLMENT !== "true",
    detail: "mock/HIBP/seed flags",
  },
];

const failed = checks.filter((check) => !check.ok);
for (const check of checks) {
  const status = check.ok ? "PASS" : "FAIL";
  console.log(`[security-preflight] ${status} ${check.id}: ${check.detail}`);
}

if (failed.length > 0) {
  console.error(`[security-preflight] ${failed.length} check(s) failed`);
  process.exit(1);
}

console.log("[security-preflight] All checks passed");
