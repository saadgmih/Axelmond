import crypto from "node:crypto";

export function normalizeProfessorInviteCode(code: unknown): string {
  return typeof code === "string" ? code.trim().toUpperCase() : "";
}

export function parseProfessorInviteCodes(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[,\n;]/)
    .map((code) => normalizeProfessorInviteCode(code))
    .filter(Boolean);
}

export function generateProfessorInviteCode(isNumeric = false) {
  if (isNumeric) {
    return String(crypto.randomInt(100000, 1000000));
  }
  return `PROF-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}
