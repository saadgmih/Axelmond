import type { Prisma } from "@prisma/client";
import crypto from "node:crypto";
import { prisma } from "./db";

export type SecurityChallengeKind = "WEBAUTHN_REGISTER" | "WEBAUTHN_LOGIN" | "TOTP_SETUP";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export async function createSecurityChallenge(params: {
  userId?: string | null;
  kind: SecurityChallengeKind;
  payload: Record<string, unknown>;
  ttlMs?: number;
}): Promise<string> {
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + (params.ttlMs ?? CHALLENGE_TTL_MS));
  await prisma.securityChallenge.create({
    data: {
      id,
      userId: params.userId ?? null,
      kind: params.kind,
      payload: params.payload as Prisma.InputJsonValue,
      expiresAt,
    },
  });
  return id;
}

export async function consumeSecurityChallenge<T extends Record<string, unknown>>(
  id: string,
  kind: SecurityChallengeKind,
): Promise<T | null> {
  const now = new Date();
  const consumed = await prisma.securityChallenge.updateMany({
    where: {
      id,
      kind,
      consumedAt: null,
      expiresAt: { gt: now },
    },
    data: { consumedAt: now },
  });
  if (consumed.count !== 1) {
    return null;
  }

  const row = await prisma.securityChallenge.findUnique({ where: { id } });
  if (!row || row.kind !== kind) {
    return null;
  }

  return row.payload as T;
}

export async function purgeExpiredSecurityChallenges(): Promise<number> {
  const result = await prisma.securityChallenge.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return result.count;
}
