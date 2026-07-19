import { prisma } from "../src/db.ts";

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true, fullName: true }
  });
  console.log("Users:", JSON.stringify(users, null, 2));

  const courses = await prisma.course.findMany({
    select: { id: true, title: true, instructor: true }
  });
  console.log("Courses:", JSON.stringify(courses, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
