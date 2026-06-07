import dotenv from "dotenv";
import express from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../src/db.ts";

dotenv.config();

const email = process.argv[2] || "saadgmih2004@gmail.com";
const password = process.argv[3] || "saadgmih2004@";

try {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log("User not found:", email);
    process.exit(1);
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  console.log("User:", user.email, "role:", user.role, "verified:", user.emailVerified);
  console.log("Password match:", ok);
  console.log("Schema:", process.env.DATABASE_URL?.match(/schema=([^&]+)/)?.[1]);
} catch (err) {
  console.error("FAIL", err.code, err.message);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
