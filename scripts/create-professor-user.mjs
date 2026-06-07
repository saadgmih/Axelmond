/**
 * Create or update a professor account on Neon.
 * Usage: npx tsx scripts/create-professor-user.mjs [email] [password] [fullName]
 */
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { prisma } from "../src/db.ts";

dotenv.config();

const email = (process.argv[2] || "prof@gmail.com").trim().toLowerCase();
const password = process.argv[3] || "saadgmih2004@";
const fullName = process.argv[4] || "Professeur Axelmond";

async function main() {
  const passwordHash = await bcrypt.hash(password, 10);
  const levelOrTitle = "Professeur associé";

  const user = await prisma.$transaction(async (tx) => {
    const saved = await tx.user.upsert({
      where: { email },
      update: {
        passwordHash,
        fullName,
        role: "PROFESSOR",
        emailVerified: true,
        levelOrTitle,
        failedLoginAttempts: 0,
        lockoutUntil: null,
        invoices: [],
      },
      create: {
        email,
        passwordHash,
        fullName,
        role: "PROFESSOR",
        emailVerified: true,
        levelOrTitle,
        invoices: [],
      },
    });

    await tx.academicProfile.upsert({
      where: { userId: saved.id },
      update: {},
      create: {
        userId: saved.id,
        title: levelOrTitle,
        teachingDomains: [],
        researchDomains: [],
        links: {},
      },
    });

    return saved;
  });

  console.log("Professor account ready:");
  console.log(`  id: ${user.id}`);
  console.log(`  email: ${user.email}`);
  console.log(`  role: ${user.role}`);
  console.log(`  emailVerified: ${user.emailVerified}`);
  console.log(`  fullName: ${user.fullName}`);
}

main()
  .catch((err) => {
    console.error("Failed:", err.message || err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
