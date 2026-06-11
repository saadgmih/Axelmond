const PLACEHOLDER_PATTERN = /^(MY_|CHANGE_ME|CHANGEME|TODO|YOUR_|EXAMPLE_|DEFAULT_|axelmond-dev-secret$)/i;
const LOCALHOST_PATTERN = /(^|\.)localhost$|^127\.0\.0\.1$|^0\.0\.0\.0$/i;

const REQUIRED_PRODUCTION_ENV = [
  "APP_URL",
  "DATABASE_URL",
  "AUTH_TOKEN_SECRET",
  "EMAIL_VERIFICATION_SECRET",
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
  "VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
] as const;

const HIGH_ENTROPY_SECRET_ENV = [
  "AUTH_TOKEN_SECRET",
  "EMAIL_VERIFICATION_SECRET",
  "LIVEKIT_API_SECRET",
  "UPLOADTHING_TOKEN",
  "VAPID_PRIVATE_KEY",
] as const;

const DISTINCT_SECRET_ENV = [
  "AUTH_TOKEN_SECRET",
  "EMAIL_VERIFICATION_SECRET",
  "PAYPAL_CLIENT_SECRET",
  "LIVEKIT_API_SECRET",
  "UPLOADTHING_TOKEN",
  "SMTP_PASS",
  "VAPID_PRIVATE_KEY",
] as const;

function readEnv(env: NodeJS.ProcessEnv, key: string): string {
  return String(env[key] || "").trim();
}

function hasPlaceholderValue(value: string): boolean {
  return PLACEHOLDER_PATTERN.test(value) || value.includes("MY_") || value.includes("your-");
}

function isHttpsPublicUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    return url.protocol === "https:" && !LOCALHOST_PATTERN.test(url.hostname);
  } catch {
    return false;
  }
}

export function validateProductionConfiguration(env: NodeJS.ProcessEnv = process.env): string[] {
  if (env.NODE_ENV !== "production") return [];

  const issues: string[] = [];

  for (const key of REQUIRED_PRODUCTION_ENV) {
    const value = readEnv(env, key);
    if (!value) {
      issues.push(`${key} is required in production`);
    } else if (hasPlaceholderValue(value)) {
      issues.push(`${key} still uses a placeholder value`);
    }
  }

  for (const key of HIGH_ENTROPY_SECRET_ENV) {
    const value = readEnv(env, key);
    if (value && value.length < 32) {
      issues.push(`${key} must be at least 32 characters in production`);
    }
  }

  const seenSecrets = new Map<string, string>();
  for (const key of DISTINCT_SECRET_ENV) {
    const value = readEnv(env, key);
    if (!value) continue;
    const previous = seenSecrets.get(value);
    if (previous) {
      issues.push(`${key} must not reuse the same secret as ${previous}`);
    } else {
      seenSecrets.set(value, key);
    }
  }

  if (readEnv(env, "PAYPAL_ENV").toLowerCase() !== "live") {
    issues.push("PAYPAL_ENV must be live in production");
  }

  if (readEnv(env, "UPLOADTHING_IS_DEV").toLowerCase() === "true") {
    issues.push("UPLOADTHING_IS_DEV must be false in production");
  }

  const appUrl = readEnv(env, "APP_URL");
  if (appUrl && !isHttpsPublicUrl(appUrl)) {
    issues.push("APP_URL must be a public HTTPS URL in production");
  }

  const emailVerificationUrl = readEnv(env, "EMAIL_VERIFICATION_URL");
  if (emailVerificationUrl && !isHttpsPublicUrl(emailVerificationUrl)) {
    issues.push("EMAIL_VERIFICATION_URL must be a public HTTPS URL in production");
  }

  return issues;
}

export function assertProductionConfiguration(env: NodeJS.ProcessEnv = process.env): void {
  const issues = validateProductionConfiguration(env);
  if (issues.length > 0) {
    throw new Error(`Invalid production configuration: ${issues.join("; ")}`);
  }
}
