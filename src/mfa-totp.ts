import { generateSync, generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";
import { prisma } from "./db";
import { decryptMfaSecret, encryptMfaSecret, generateRecoveryCodes, hashRecoveryCode } from "./mfa-crypto";

const ISSUER = "Performance Académique";

export function generateTotpSecret(): string {
  return generateSecret();
}

export function buildTotpUri(email: string, secret: string): string {
  return generateURI({ issuer: ISSUER, label: email, secret });
}

export async function buildTotpQrDataUrl(email: string, secret: string): Promise<string> {
  return QRCode.toDataURL(buildTotpUri(email, secret), { margin: 1, width: 220 });
}

export function verifyTotpCode(secret: string, code: string): boolean {
  const normalized = String(code || "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(normalized)) return false;
  return verifySync({ secret, token: normalized }).valid;
}

export async function getDecryptedTotpSecret(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { totpSecretEnc: true, totpEnabled: true },
  });
  if (!user?.totpEnabled || !user.totpSecretEnc) return null;
  return decryptMfaSecret(user.totpSecretEnc);
}

export async function verifyUserTotp(userId: string, code: string): Promise<boolean> {
  const secret = await getDecryptedTotpSecret(userId);
  if (!secret) return false;
  if (verifyTotpCode(secret, code)) return true;
  return verifyRecoveryCode(userId, code);
}

async function verifyRecoveryCode(userId: string, code: string): Promise<boolean> {
  const normalized = code.trim().toUpperCase().replace(/\s+/g, "");
  if (!/^[A-Z0-9-]{8,12}$/.test(normalized)) return false;
  const hash = hashRecoveryCode(normalized);
  const row = await prisma.totpRecoveryCode.findFirst({
    where: { userId, codeHash: hash, usedAt: null },
  });
  if (!row) return false;
  await prisma.totpRecoveryCode.update({
    where: { id: row.id },
    data: { usedAt: new Date() },
  });
  return true;
}

export async function enableTotpForUser(userId: string, secret: string): Promise<string[]> {
  const recoveryCodes = generateRecoveryCodes();
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        totpEnabled: true,
        totpSecretEnc: encryptMfaSecret(secret),
      },
    }),
    prisma.totpRecoveryCode.deleteMany({ where: { userId } }),
    ...recoveryCodes.map((code) =>
      prisma.totpRecoveryCode.create({
        data: { userId, codeHash: hashRecoveryCode(code) },
      }),
    ),
  ]);
  return recoveryCodes;
}

export async function disableTotpForUser(userId: string): Promise<void> {
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { totpEnabled: false, totpSecretEnc: null },
    }),
    prisma.totpRecoveryCode.deleteMany({ where: { userId } }),
  ]);
}

export async function userHasPasskeys(userId: string): Promise<boolean> {
  const count = await prisma.webAuthnCredential.count({ where: { userId } });
  return count > 0;
}

export async function getUserMfaStatus(userId: string) {
  const [user, passkeyCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { totpEnabled: true },
    }),
    prisma.webAuthnCredential.count({ where: { userId } }),
  ]);
  return {
    totpEnabled: Boolean(user?.totpEnabled),
    passkeyCount,
    passkeysEnabled: passkeyCount > 0,
  };
}

/** Test helper — generate a valid code for the current window. */
export function generateTotpCodeForSecret(secret: string): string {
  return generateSync({ secret });
}
