import crypto from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";

export class CharityAccessCodeError extends Error {
  constructor(
    message: string,
    readonly code: "INVALID" | "ALREADY_USED" | "PAGE_DISABLED" | "INACTIVE",
  ) {
    super(message);
    this.name = "CharityAccessCodeError";
  }
}

export function normalizeCharityAccessCode(code: unknown): string {
  return typeof code === "string" ? code.trim().toUpperCase() : "";
}

export function hashCharityAccessCode(code: string): string {
  return crypto.createHash("sha256").update(normalizeCharityAccessCode(code)).digest("hex");
}

export function generateCharityAccessCode(): string {
  return `SADAQA-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

export function charityCodeSuffix(code: string): string {
  const normalized = normalizeCharityAccessCode(code);
  return normalized.slice(-4);
}

export function isMissingCharityStorageError(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  return code === "P2021" || code === "P2022";
}

export function charityStorageErrorMessage(): string {
  return "Les tables Lajr wa Tawab ne sont pas encore disponibles. Exécutez npm run deploy:migrate puis redémarrez le serveur.";
}

export async function isCharityPageEnabled(): Promise<boolean> {
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: "charityPageEnabled" },
      select: { value: true },
    });
    return setting?.value === true;
  } catch {
    return false;
  }
}

export async function setCharityPageEnabled(enabled: boolean): Promise<boolean> {
  await prisma.siteSetting.upsert({
    where: { key: "charityPageEnabled" },
    create: { key: "charityPageEnabled", value: enabled },
    update: { value: enabled },
  });
  return enabled;
}

export async function userHasCharityAccess(userId: string): Promise<boolean> {
  const pageEnabled = await isCharityPageEnabled();
  if (!pageEnabled) return false;

  const activeUsage = await prisma.charityCodeUsage.findFirst({
    where: {
      userId,
      code: { isActive: true },
    },
    select: { id: true },
  });
  return Boolean(activeUsage);
}

export async function consumeCharityAccessCode(userId: string, rawCode: string) {
  const code = normalizeCharityAccessCode(rawCode);
  if (!code) {
    throw new CharityAccessCodeError("Code d'accès invalide", "INVALID");
  }

  const pageEnabled = await isCharityPageEnabled();
  if (!pageEnabled) {
    throw new CharityAccessCodeError("Cette page est actuellement fermée", "PAGE_DISABLED");
  }

  const codeHash = hashCharityAccessCode(code);
  const accessCode = await prisma.charityAccessCode.findUnique({
    where: { codeHash },
    select: { id: true, isActive: true },
  });

  if (!accessCode || !accessCode.isActive) {
    throw new CharityAccessCodeError("Code d'accès invalide ou expiré", "INACTIVE");
  }

  const existingUsage = await prisma.charityCodeUsage.findUnique({
    where: { userId_codeId: { userId, codeId: accessCode.id } },
    select: { id: true },
  });
  if (existingUsage) {
    throw new CharityAccessCodeError("Vous avez déjà utilisé ce code", "ALREADY_USED");
  }

  await prisma.charityCodeUsage.create({
    data: { userId, codeId: accessCode.id },
  });

  return { ok: true as const };
}

export async function createCharityAccessCode(createdByAdminId: string, options?: { deactivateOthers?: boolean }) {
  const plaintext = generateCharityAccessCode();
  const codeHash = hashCharityAccessCode(plaintext);
  const codeSuffix = charityCodeSuffix(plaintext);

  const record = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    if (options?.deactivateOthers) {
      await tx.charityAccessCode.updateMany({
        where: { isActive: true },
        data: { isActive: false, disabledAt: new Date() },
      });
    }

    return tx.charityAccessCode.create({
      data: {
        codeHash,
        codeSuffix,
        createdByAdminId,
      },
    });
  });

  return { record, plaintext };
}

export async function deactivateCharityAccessCode(codeId: string) {
  const updated = await prisma.charityAccessCode.updateMany({
    where: { id: codeId, isActive: true },
    data: { isActive: false, disabledAt: new Date() },
  });
  return updated.count === 1;
}
