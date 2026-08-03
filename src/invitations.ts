import crypto from "node:crypto";

export function normalizeProfessorInviteCode(code: unknown): string {
  return typeof code === "string" ? code.trim().toUpperCase() : "";
}

/**
 * Validates that a professor invite code is robust, long (at least 16 chars),
 * and not a predictable sequential pattern like PROF-INVITE-001.
 */
export function isValidProfessorInviteCodeFormat(code: unknown): boolean {
  const normalized = normalizeProfessorInviteCode(code);
  if (normalized.length < 16) return false;
  if (/^PROF-INVITE-\d+$/i.test(normalized)) return false;
  return /^[A-Z0-9_-]{16,64}$/.test(normalized);
}

export function parseProfessorInviteCodes(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[,\n;]/)
    .map((code) => normalizeProfessorInviteCode(code))
    .filter(Boolean);
}

/**
 * Generates an unpredictable, cryptographically secure 32-character hex invite code.
 */
export function generateProfessorInviteCode(isNumeric = false): string {
  if (isNumeric) {
    return String(crypto.randomInt(100000, 1000000));
  }
  return crypto.randomBytes(16).toString("hex").toUpperCase();
}
