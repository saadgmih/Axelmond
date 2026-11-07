import crypto from "node:crypto";

const API_KEY_PREFIX = "pam_live_";

export interface GeneratedApiKey {
  rawKey: string;
  keyPrefix: string;
  keyHash: string;
}

/**
 * Generate a cryptographically secure PAM API Key.
 * Format: pam_live_<32 hex chars>
 */
export function generateApiKey(): GeneratedApiKey {
  const randomBytes = crypto.randomBytes(24).toString("hex");
  const rawKey = `${API_KEY_PREFIX}${randomBytes}`;
  const keyPrefix = rawKey.slice(0, 16);
  const keyHash = hashApiKey(rawKey);

  return { rawKey, keyPrefix, keyHash };
}

/**
 * Hash an API key with SHA-256 for secure storage.
 */
export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key.trim()).digest("hex");
}

/**
 * Constant-time comparison to prevent timing attacks.
 */
export function verifyApiKey(candidateKey: string, storedHash: string): boolean {
  if (!candidateKey || !storedHash) return false;
  const candidateHash = hashApiKey(candidateKey);
  const bufA = Buffer.from(candidateHash, "hex");
  const bufB = Buffer.from(storedHash, "hex");

  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Extract API key from Request headers (X-PAM-API-Key or Authorization: Bearer).
 */
export function extractApiKeyFromHeaders(headers: Record<string, string | string[] | undefined>): string | null {
  const customHeader = headers["x-pam-api-key"] || headers["x-api-key"];
  if (typeof customHeader === "string" && customHeader.trim()) {
    return customHeader.trim();
  }

  const authHeader = headers["authorization"];
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token.startsWith(API_KEY_PREFIX)) {
      return token;
    }
  }

  return null;
}
