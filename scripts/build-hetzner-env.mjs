import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();
const sourcePath = fs.existsSync(path.join(root, ".hostinger-import.env"))
  ? path.join(root, ".hostinger-import.env")
  : path.join(root, ".env");
const outputPath = path.join(root, ".hetzner.env");

/** Clés spécifiques à Hostinger qu'il faut totalement supprimer pour Hetzner */
const FORBIDDEN_HOSTINGER_KEYS = new Set([
  "HOSTINGER_WEBAPP",
  "SKIP_PRISMA_POSTINSTALL",
  "HOSTINGER_PORT_WAIT_MS",
  "HOSTINGER_PORT_POLL_MS",
  "MOBILE_API_SECRET",
  "ALLOW_MOCK_ENROLLMENT",
  "HIBP_FAIL_OPEN",
  "REGISTRATION_SEED_ENROLLMENT",
  "ALLOW_DEV_VERIFICATION_CODE_LOG",
  "LOAD_TEST_MODE",
]);

/** Optimisations pour le serveur Hetzner CPX32 (4 vCPU / 8 Go RAM) */
const HETZNER_OVERRIDES = {
  NODE_ENV: "production",
  PORT: "3000",
  APP_URL: "https://perfacademy.ma",
  EMAIL_VERIFICATION_URL: "https://perfacademy.ma",
  ALLOWED_ORIGINS: "https://www.perfacademy.ma,https://perfacademy.ma,https://www.axelmond.com,https://axelmond.com",
  TRUST_PROXY: "1",

  // Google Gmail / Workspace SMTP (Remplace définitivement Resend & Hostinger)
  SMTP_HOST: process.env.SMTP_HOST || "smtp.gmail.com",
  SMTP_PORT: process.env.SMTP_PORT || "587",
  SMTP_USER: process.env.SMTP_USER || "saadgmih2004@gmail.com",
  SMTP_PASS: process.env.SMTP_PASS || "dgeuyjlhqfaqujsl",
  EMAIL_FROM: process.env.EMAIL_FROM || "Performance Académique <verification@perfacademy.ma>",
  EMAIL_REPLY_TO: process.env.EMAIL_REPLY_TO || "verification@perfacademy.ma",

  // Redis local & PM2 Cluster 4 workers
  REDIS_URL: "redis://127.0.0.1:6379",
  PM2_INSTANCES: "max",

  // Pool PostgreSQL optimisé pour PgBouncer et multi-workers
  DATABASE_POOL_MAX: "5",
  STARTUP_DB_TIMEOUT_MS: "15000",
  CATALOG_QUERY_TIMEOUT_MS: "10000",

  // Caches applicatifs
  CACHE_MAX_ENTRIES: "500",
  CACHE_MAX_VALUE_BYTES: "1048576", // 1 Mo
  CACHE_TTL_SECONDS: "180",
  STUDENT_CATALOG_CACHE_SECONDS: "90",
  AUTH_USER_CACHE_MS: "30000",
  AUTH_USER_CACHE_MAX_ENTRIES: "500",
  SOCKET_AUTH_CACHE_MS: "30000",

  // Services tiers
  UPLOADTHING_IS_DEV: "false",
  PAYPAL_ENV: "live",
  RUN_STARTUP_SEED: "false",
  RUN_STARTUP_PURGES: "false",
};

function parseEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, "utf8");
  const env = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIdx = line.indexOf("=");
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    let val = line.slice(eqIdx + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    else if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    env[key] = val;
  }
  return env;
}

const sourceEnv = parseEnv(sourcePath);
const merged = { ...sourceEnv, ...HETZNER_OVERRIDES };

// Toujours utiliser le PgBouncer Pooler Neon pour éviter les timeouts et la latence
if (merged.DATABASE_URL && merged.DATABASE_URL.includes(".neon.tech") && !merged.DATABASE_URL.includes("-pooler")) {
  merged.DATABASE_URL = merged.DATABASE_URL.replace(/@([^.]+)(\.[^/]*neon\.tech)/, (m, ep, rest) => `@${ep}-pooler${rest}`);
}

if (!merged.MFA_ENCRYPTION_KEY || merged.MFA_ENCRYPTION_KEY.length < 32) {
  merged.MFA_ENCRYPTION_KEY = crypto.randomBytes(32).toString("hex");
}

for (const key of FORBIDDEN_HOSTINGER_KEYS) {
  delete merged[key];
}

const keys = Object.keys(merged).sort();
const lines = [
  "# ==============================================================================",
  "# Environnement de production Hetzner Cloud (CPX32 — 4 vCPU / 8 Go RAM)",
  `# Généré automatiquement le ${new Date().toISOString()}`,
  "# ==============================================================================",
  "",
];

for (const k of keys) {
  lines.push(`${k}=${merged[k]}`);
}
lines.push("");

fs.writeFileSync(outputPath, lines.join("\n"), "utf8");
console.log(`✅ Fichier Hetzner généré avec succès : ${outputPath}`);
console.log(`   Source : ${sourcePath}`);
console.log(`   Nombre de variables : ${keys.length}`);
console.log(`   Variables Hostinger nettoyées : ${FORBIDDEN_HOSTINGER_KEYS.size}`);
console.log(`   Optimisations Hetzner/Redis injectées : REDIS_URL, PM2_INSTANCES=max, DATABASE_POOL_MAX=20`);
