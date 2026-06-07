import dotenv from "dotenv";
import pg from "pg";
import bcrypt from "bcryptjs";

dotenv.config();
const { Pool } = pg;

const email = (process.argv[2] || "saadgmih2004@gmail.com").trim().toLowerCase();
const password = process.argv[3] || "saadgmih2004@";
const SCHEMA = "AxelmondResearchLab";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  const client = await pool.connect();
  await client.query(`SET search_path TO "${SCHEMA}"`);
  const result = await client.query(
    `SELECT email, role, "emailVerified", "passwordHash" FROM "User" WHERE email = $1 LIMIT 1`,
    [email],
  );
  client.release();

  if (!result.rows.length) {
    console.log("User not found:", email);
    process.exit(1);
  }

  const user = result.rows[0];
  const ok = await bcrypt.compare(password, user.passwordHash);
  console.log("User:", user.email, "role:", user.role, "verified:", user.emailVerified);
  console.log("Password match:", ok);
} catch (err) {
  console.error("FAIL", err.message);
  process.exit(1);
} finally {
  await pool.end();
}
