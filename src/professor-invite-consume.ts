import type { Prisma } from "@prisma/client";

export class ProfessorInviteConsumeError extends Error {
  constructor(
    message: string,
    readonly code: "INVALID" | "EXPIRED",
  ) {
    super(message);
    this.name = "ProfessorInviteConsumeError";
  }
}

export async function reserveProfessorInviteCode(tx: Prisma.TransactionClient, inviteCode: string) {
  const reserved = await tx.professorInviteCode.updateMany({
    where: {
      code: inviteCode,
      usedAt: null,
      revokedAt: null,
    },
    data: { usedAt: new Date() },
  });

  if (reserved.count !== 1) {
    const invite = await tx.professorInviteCode.findUnique({ where: { code: inviteCode } });
    if (!invite || invite.revokedAt || invite.usedAt) {
      throw new ProfessorInviteConsumeError("INVALID", "INVALID");
    }
    throw new ProfessorInviteConsumeError("INVALID", "INVALID");
  }
}

export async function attachProfessorInviteUsage(tx: Prisma.TransactionClient, inviteCode: string, userId: string) {
  await tx.professorInviteCode.update({
    where: { code: inviteCode },
    data: { usedById: userId },
  });
}
