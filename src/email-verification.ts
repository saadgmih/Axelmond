import crypto from "node:crypto";

export const EMAIL_VERIFICATION_TTL_MINUTES = 15;
export const EMAIL_VERIFICATION_MAX_ATTEMPTS = 5;

export function generateEmailVerificationCode() {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function normalizeEmailVerificationCode(code: unknown) {
  return String(code || "")
    .replace(/\D/g, "")
    .slice(0, 6);
}

export function getEmailVerificationSecret(env: NodeJS.ProcessEnv = process.env) {
  return (
    env.EMAIL_VERIFICATION_SECRET ||
    env.BETTER_AUTH_SECRET ||
    env.AUTH_TOKEN_SECRET ||
    "axelmond-email-verification-dev-secret"
  );
}

export function hashEmailVerificationCode(code: string, secret = getEmailVerificationSecret()) {
  return crypto.createHmac("sha256", secret).update(normalizeEmailVerificationCode(code)).digest("hex");
}

export function buildEmailVerificationExpiry(now = new Date()) {
  return new Date(now.getTime() + EMAIL_VERIFICATION_TTL_MINUTES * 60 * 1000);
}

export function isEmailVerificationExpired(expiresAt: Date, now = new Date()) {
  return expiresAt.getTime() <= now.getTime();
}

export function canAttemptEmailVerification(attempts: number) {
  return attempts < EMAIL_VERIFICATION_MAX_ATTEMPTS;
}

export function isDevVerificationCodeLogEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return (
    String(env.ALLOW_DEV_VERIFICATION_CODE_LOG || "")
      .trim()
      .toLowerCase() === "true"
  );
}

export function maskEmailForDevLog(email: string): string {
  const normalized = String(email || "").trim();
  const atIndex = normalized.indexOf("@");
  if (atIndex <= 0) return "utilisateur";
  return `${normalized.slice(0, 1)}***${normalized.slice(atIndex)}`;
}
