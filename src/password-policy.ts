import crypto from "node:crypto";
import { z } from "zod";
import { logSecurity } from "./security-logger";

const COMMON_WEAK_PASSWORDS = new Set([
  "password123!",
  "password1234",
  "azerty123!",
  "admin123456!",
  "welcome123!",
  "changeme123!",
]);

const HIBP_TIMEOUT_MS = Number(process.env.HIBP_TIMEOUT_MS) || 4000;

export function shouldSkipHibpCheck(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.HIBP_CHECK_DISABLED === "true") return true;
  const nodeEnv = String(env.NODE_ENV || "").toLowerCase();
  if (nodeEnv === "test" || nodeEnv === "development") return true;
  return false;
}

export function shouldFailClosedOnHibpError(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.HIBP_FAIL_OPEN === "true") return false;
  return String(env.NODE_ENV || "").toLowerCase() === "production";
}

export async function isPasswordBreached(password: string, env: NodeJS.ProcessEnv = process.env): Promise<boolean> {
  if (shouldSkipHibpCheck(env)) return false;

  const sha1 = crypto.createHash("sha1").update(password, "utf8").digest("hex").toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HIBP_TIMEOUT_MS);

  try {
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true", "User-Agent": "Axelmond-Research-Labs-Password-Check" },
      signal: controller.signal,
    });
    if (!response.ok) {
      if (shouldFailClosedOnHibpError(env)) {
        logSecurity("ERROR", "HIBP breach check HTTP error — rejecting password", { status: response.status });
        return true;
      }
      return false;
    }

    const body = await response.text();
    return body.split("\n").some((line) => {
      const [hashSuffix] = line.trim().split(":");
      return hashSuffix?.toUpperCase() === suffix;
    });
  } catch (err) {
    if (shouldFailClosedOnHibpError(env)) {
      logSecurity("ERROR", "HIBP breach check unavailable — rejecting password", { error: String(err) });
      return true;
    }
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export const strongPasswordField = z
  .string()
  .min(12, "Le mot de passe doit contenir au moins 12 caractères")
  .max(128, "Le mot de passe est trop long")
  .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une majuscule")
  .regex(/[a-z]/, "Le mot de passe doit contenir au moins une minuscule")
  .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre")
  .regex(/[^A-Za-z0-9]/, "Le mot de passe doit contenir au moins un caractère spécial")
  .refine((password) => !COMMON_WEAK_PASSWORDS.has(password.toLowerCase()), "Mot de passe trop courant")
  .superRefine(async (password, ctx) => {
    if (await isPasswordBreached(password)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ce mot de passe est compromis dans une fuite connue — choisissez-en un autre",
      });
    }
  });

export async function assertStrongPassword(password: string): Promise<void> {
  const result = await strongPasswordField.safeParseAsync(password);
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message || "Mot de passe invalide");
  }
}
