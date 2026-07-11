import { prisma } from "../src/db.ts";

const TEST_EMAILS = [
  "prof1@axelmond.edu.fr",
  "stud1@axelmond.univ.fr",
  "stud2@axelmond.univ.fr",
  "stud3@axelmond.univ.fr",
  "stud4@axelmond.univ.fr",
  "stud5@axelmond.univ.fr",
  "stud6@axelmond.univ.fr",
];

const users = await prisma.user.findMany({ where: { email: { in: TEST_EMAILS } }, select: { id: true, email: true } });
const liveSessions = await prisma.liveSession.findMany({
  where: { professorId: { startsWith: "test-" } },
  select: { id: true, courseId: true, isActive: true },
});

console.log(JSON.stringify({ leftoverUsers: users.length, users, activeTestLiveSessions: liveSessions.filter((s) => s.isActive).length, liveSessions }, null, 2));
await prisma.$disconnect();
process.exit(users.length === 0 && liveSessions.filter((s) => s.isActive).length === 0 ? 0 : 1);
