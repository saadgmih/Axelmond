import { prisma } from "../src/db.ts";

async function main() {
  console.log("Testing prisma.user.findFirst()...");
  const t0 = Date.now();
  const user = await prisma.user.findFirst({ select: { id: true, email: true } });
  const t1 = Date.now();
  console.log(`Prisma query took ${t1 - t0}ms!`, user);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
