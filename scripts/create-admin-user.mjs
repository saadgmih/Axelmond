/**
 * Create or update an administrator account (not available via public registration).
 * Usage: npx tsx scripts/create-admin-user.mjs [email] [password] [fullName]
 */
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { prisma } from "../src/db.ts";

dotenv.config();

const email = (process.argv[2] || process.env.ADMIN_BOOTSTRAP_EMAIL || "admin@axelmond.com").trim().toLowerCase();
const password = process.argv[3] || process.env.ADMIN_BOOTSTRAP_PASSWORD || "Axelmond@Admin2026!";
const fullName = process.argv[4] || process.env.ADMIN_BOOTSTRAP_NAME || "Administrateur Axelmond";

async function main() {
  if (!password || password.length < 12) {
    throw new Error("Le mot de passe admin doit contenir au moins 12 caractères.");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const levelOrTitle = "Administrateur";

  const user = await prisma.$transaction(async (tx) => {
    const saved = await tx.user.upsert({
      where: { email },
      update: {
        passwordHash,
        fullName,
        role: "ADMIN",
        emailVerified: true,
        levelOrTitle,
        failedLoginAttempts: 0,
        lockoutUntil: null,
      },
      create: {
        email,
        passwordHash,
        fullName,
        role: "ADMIN",
        emailVerified: true,
        levelOrTitle,
        invoices: [],
      },
    });

    await tx.academicProfile.upsert({
      where: { userId: saved.id },
      update: { title: levelOrTitle },
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

  console.log("Admin account ready:");
  console.log(`  id: ${user.id}`);
  console.log(`  email: ${user.email}`);
  console.log(`  role: ${user.role}`);
  console.log(`  emailVerified: ${user.emailVerified}`);
  console.log(`  fullName: ${user.fullName}`);
  console.log("");
  console.log("Connexion: Espace Professeur / Chercheur / Admin sur la page de login.");
}

main()
  .catch((err) => {
    console.error("Failed:", err.message || err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
