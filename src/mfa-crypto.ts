import crypto from "node:crypto";
import { getAuthTokenSecret } from "./auth-token";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;

function getMfaEncryptionKey(env: NodeJS.ProcessEnv = process.env): Buffer {
  const dedicated = env.MFA_ENCRYPTION_KEY?.trim();
  if (dedicated) {
    const buf = Buffer.from(dedicated, dedicated.length === 64 && /^[0-9a-f]+$/i.test(dedicated) ? "hex" : "base64");
    if (buf.length < 32) {
      throw new Error("MFA_ENCRYPTION_KEY must decode to at least 32 bytes");
    }
    return buf.subarray(0, 32);
  }

  return crypto.createHmac("sha256", getAuthTokenSecret(env)).update("axelmond-mfa-v1").digest();
}

export function encryptMfaSecret(plaintext: string, env: NodeJS.ProcessEnv = process.env): string {
  const key = getMfaEncryptionKey(env);
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptMfaSecret(payload: string, env: NodeJS.ProcessEnv = process.env): string {
  const [ivPart, tagPart, dataPart] = payload.split(".");
  if (!ivPart || !tagPart || !dataPart) {
    throw new Error("Invalid encrypted MFA payload");
  }
  const key = getMfaEncryptionKey(env);
  const iv = Buffer.from(ivPart, "base64url");
  const tag = Buffer.from(tagPart, "base64url");
  const data = Buffer.from(dataPart, "base64url");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function hashRecoveryCode(code: string): string {
  return crypto.createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}

export function hashWebAuthnCredentialId(credentialId: string): string {
  return crypto.createHash("sha256").update(credentialId).digest("hex");
}

export function generateRecoveryCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const raw = crypto.randomBytes(5).toString("hex").toUpperCase();
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 10)}`);
  }
  return codes;
}
