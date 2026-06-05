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
    const num = Math.floor(100000 + Math.random() * 900000);
    return String(num);
  }
  return `PROF-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}
