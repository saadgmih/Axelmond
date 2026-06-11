import bcrypt from "bcryptjs";
import { prisma } from "../../src/db.ts";
import { SECURITY_RUNTIME_TEST_PASSWORD } from "./security-runtime-fixtures.ts";

export const ADMIN_RUNTIME_EMAIL_PREFIX = "security-runtime-admin+";

export interface AdminRuntimeFixture {
  users: {
    adminA: { id: string; email: string; role: "ADMIN" };
    adminB: { id: string; email: string; role: "ADMIN" };
  };
}

function runtimeEmail(label: string) {
  return `${ADMIN_RUNTIME_EMAIL_PREFIX}${label}@test.axelmond.local`;
}

export async function cleanupAdminRuntimeFixtures() {
  const emails = [runtimeEmail("a"), runtimeEmail("b")];
  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { id: true },
  });
  const userIds = users.map((user) => user.id);

  if (userIds.length > 0) {
    await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.professorInviteCode.deleteMany({ where: { createdById: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
}

export async function seedAdminRuntimeFixtures(): Promise<AdminRuntimeFixture> {
  await cleanupAdminRuntimeFixtures();

  const passwordHash = bcrypt.hashSync(SECURITY_RUNTIME_TEST_PASSWORD, 10);
  const users = {
    adminA: {
      id: "sec-rt-admin-a",
      email: runtimeEmail("a"),
      role: "ADMIN" as const,
    },
    adminB: {
      id: "sec-rt-admin-b",
      email: runtimeEmail("b"),
      role: "ADMIN" as const,
    },
  };

  for (const user of Object.values(users)) {
    await prisma.user.create({
      data: {
        id: user.id,
        email: user.email,
        passwordHash,
        fullName: `Runtime ${user.id}`,
        role: user.role,
        emailVerified: true,
        levelOrTitle: "Administrateur",
      },
    });
  }

  return { users };
}
