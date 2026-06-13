import type { Prisma } from "@prisma/client";

const PROFESSOR_INVITE_TTL_MS = 5 * 60 * 1000;

export class ProfessorInviteConsumeError extends Error {
  constructor(
    message: string,
    readonly code: "INVALID" | "EXPIRED",
  ) {
    super(message);
    this.name = "ProfessorInviteConsumeError";
  }
}

export async function reserveProfessorInviteCode(
  tx: Prisma.TransactionClient,
  inviteCode: string,
) {
  const reserved = await tx.professorInviteCode.updateMany({
    where: {
      code: inviteCode,
      usedAt: null,
      revokedAt: null,
      createdAt: { gte: new Date(Date.now() - PROFESSOR_INVITE_TTL_MS) },
    },
    data: { usedAt: new Date() },
  });

  if (reserved.count !== 1) {
    const invite = await tx.professorInviteCode.findUnique({ where: { code: inviteCode } });
    if (!invite || invite.revokedAt || invite.usedAt) {
      throw new ProfessorInviteConsumeError("INVALID", "INVALID");
    }
    const isExpired = Date.now() - new Date(invite.createdAt).getTime() > PROFESSOR_INVITE_TTL_MS;
    if (isExpired) {
      throw new ProfessorInviteConsumeError("EXPIRED", "EXPIRED");
    }
    throw new ProfessorInviteConsumeError("INVALID", "INVALID");
  }
}

export async function attachProfessorInviteUsage(
  tx: Prisma.TransactionClient,
  inviteCode: string,
  userId: string,
) {
  await tx.professorInviteCode.update({
    where: { code: inviteCode },
    data: { usedById: userId },
  });
}
