import type { Prisma } from "@prisma/client";
import { prisma } from "./db";

export function buildDirectConversationKey(userAId: string, userBId: string): string {
  return [userAId, userBId].sort().join(":");
}

export async function findDirectConversationId(userAId: string, userBId: string): Promise<string | null> {
  const directKey = buildDirectConversationKey(userAId, userBId);
  const byKey = await prisma.conversation.findUnique({
    where: { directKey },
    select: { id: true },
  });
  if (byKey) return byKey.id;

  const conversation = await prisma.conversation.findFirst({
    where: {
      AND: [
        { participants: { some: { userId: userAId } } },
        { participants: { some: { userId: userBId } } },
      ],
    },
    include: { participants: true },
  });
  if (!conversation || conversation.participants.length !== 2) return null;
  return conversation.id;
}

export async function findOrCreateDirectConversation(userAId: string, userBId: string) {
  const directKey = buildDirectConversationKey(userAId, userBId);
  const existingByKey = await prisma.conversation.findUnique({ where: { directKey } });
  if (existingByKey) return existingByKey;

  const legacyId = await findDirectConversationId(userAId, userBId);
  if (legacyId) {
    await prisma.conversation.updateMany({
      where: { id: legacyId, directKey: null },
      data: { directKey },
    });
    const upgraded = await prisma.conversation.findUnique({ where: { directKey } });
    if (upgraded) return upgraded;
    const legacy = await prisma.conversation.findUnique({ where: { id: legacyId } });
    if (legacy) return legacy;
  }

  try {
    return await prisma.conversation.create({
      data: {
        directKey,
        participants: {
          create: [{ userId: userAId }, { userId: userBId }],
        },
      },
    });
  } catch (err) {
    const prismaError = err as Prisma.PrismaClientKnownRequestError;
    if (prismaError?.code === "P2002") {
      const raced = await prisma.conversation.findUnique({ where: { directKey } });
      if (raced) return raced;
    }
    throw err;
  }
}
