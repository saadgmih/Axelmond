import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();
const sourcePath = path.join(root, ".env");
const outputPath = path.join(root, ".hostinger-import.env");

/** Legacy / wrong names — never deploy to Hostinger. */
const FORBIDDEN_KEYS = new Set(["MOBILE_API_SECRET"]);

/** Dev-only flags — must not appear in production hPanel. */
const DEV_ONLY_KEYS = new Set([
  "ALLOW_MOCK_ENROLLMENT",
  "HIBP_FAIL_OPEN",
  "REGISTRATION_SEED_ENROLLMENT",
  "ALLOW_DEV_VERIFICATION_CODE_LOG",
  "SECURITY_RUNTIME_TEST",
]);

const PLACEHOLDER_PATTERN = /^(MY_|CHANGE_ME|CHANGEME|TODO|YOUR_|EXAMPLE_|DEFAULT_)/i;

const PRODUCTION_OVERRIDES = {
  NODE_ENV: "production",
  APP_URL: "https://axelmond.com",
  EMAIL_VERIFICATION_URL: "https://axelmond.com",
  UPLOADTHING_IS_DEV: "false",
  UPLOADTHING_CALLBACK_URL: "https://axelmond.com/api/uploadthing",
  PAYPAL_ENV: "live",
  RUN_STARTUP_SEED: "false",
  CACHE_MAX_ENTRIES: "100",
  CACHE_MAX_VALUE_BYTES: "512000",
  AUTH_USER_CACHE_MAX_ENTRIES: "200",
  PERF_MONITOR_INTERVAL_MS: "120000",
  HOSTINGER_WEBAPP: "1",
  SKIP_PRISMA_POSTINSTALL: "1",
  GRACEFUL_SHUTDOWN_MS: "5000",
};

const required = [
  "NODE_ENV",
  "APP_URL",
  "DATABASE_URL",
  "AUTH_TOKEN_SECRET",
  "EMAIL_VERIFICATION_SECRET",
  "MOBILE_CLIENT_SECRET",
  "PAYPAL_CLIENT_ID",
  "PAYPAL_CLIENT_SECRET",
  "PAYPAL_WEBHOOK_ID",
  "PAYPAL_ENV",
  "LIVEKIT_URL",
  "LIVEKIT_API_KEY",
  "LIVEKIT_API_SECRET",
  "UPLOADTHING_TOKEN",
  "UPLOADTHING_IS_DEV",
  "SMTP_HOST",
  "SMTP_USER",
  "SMTP_PASS",
  "VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
];

function parseEnvFile(raw) {
  const entries = new Map();
  for (const line of raw.split(/\r?\n/)) {
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
    entries.set(key, value);
  }
  return entries;
}

if (!fs.existsSync(sourcePath)) {
  console.error(`[hostinger-env] Missing source file: ${sourcePath}`);
  process.exit(1);
}

const entries = parseEnvFile(fs.readFileSync(sourcePath, "utf8"));
const notes = [];

if (entries.has("MOBILE_API_SECRET") && !entries.has("MOBILE_CLIENT_SECRET")) {
  entries.set("MOBILE_CLIENT_SECRET", entries.get("MOBILE_API_SECRET"));
  notes.push("Renamed MOBILE_API_SECRET → MOBILE_CLIENT_SECRET");
}
entries.delete("MOBILE_API_SECRET");

for (const key of FORBIDDEN_KEYS) {
  if (entries.delete(key)) notes.push(`Removed forbidden key ${key}`);
}

for (const key of DEV_ONLY_KEYS) {
  if (entries.delete(key)) notes.push(`Removed dev-only key ${key}`);
}

for (const [key, value] of Object.entries(PRODUCTION_OVERRIDES)) {
  const previous = entries.get(key);
  if (previous !== value) {
    notes.push(`Set ${key}=${value}${previous ? ` (was ${previous})` : ""}`);
  }
  entries.set(key, value);
}

if (!entries.get("WEBAUTHN_RP_ID")) {
  entries.set("WEBAUTHN_RP_ID", "axelmond.com");
  notes.push("Set WEBAUTHN_RP_ID=axelmond.com");
}

if (!entries.get("HEALTH_CHECK_TOKEN")) {
  entries.set("HEALTH_CHECK_TOKEN", crypto.randomBytes(32).toString("hex"));
  notes.push("Generated HEALTH_CHECK_TOKEN (store securely — used for /api/health memory metrics)");
}

const missing = required.filter((key) => !entries.get(key));
if (missing.length > 0) {
  console.error("[hostinger-env] Missing required keys:", missing.join(", "));
  process.exit(1);
}

const placeholderIssues = required.filter((key) => {
  const value = entries.get(key) || "";
  return PLACEHOLDER_PATTERN.test(value) || value.includes("MY_");
});
if (placeholderIssues.length > 0) {
  console.error(
    "[hostinger-env] Placeholder values still set for:",
    placeholderIssues.join(", "),
  );
  process.exit(1);
}

if (entries.get("MOBILE_CLIENT_SECRET")?.length < 32) {
  console.error("[hostinger-env] MOBILE_CLIENT_SECRET must be at least 32 characters");
  process.exit(1);
}

const databaseUrl = entries.get("DATABASE_URL") || "";
if (
  databaseUrl &&
  !/sslmode=(require|verify-full|verify-ca)/i.test(databaseUrl) &&
  !/localhost|127\.0\.0\.1/.test(databaseUrl)
) {
  console.error("[hostinger-env] DATABASE_URL must include sslmode=require for Neon/production");
  process.exit(1);
}

const lines = [...entries.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([key, value]) => `${key}=${value}`);

fs.writeFileSync(outputPath, `${lines.join("\n")}\n`, "utf8");

console.log(`[hostinger-env] Wrote ${entries.size} variables to ${outputPath}`);
if (notes.length > 0) {
  console.log("[hostinger-env] Adjustments:");
  for (const note of notes) console.log(`  - ${note}`);
}
console.log("[hostinger-env] Import this file in hPanel → Environment variables → Import .env → Apply changes");
