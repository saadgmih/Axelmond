import fs from "fs";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pg;

const SCHEMA = "AxelmondResearchLab";

async function main() {
  const sql = fs.readFileSync(
    "prisma/migrations/20260606230000_user_auth_lockout_refresh/migration.sql",
    "utf8",
  );
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`SET search_path TO "${SCHEMA}"`);
    await client.query(sql);
    await client.query("COMMIT");
    console.log(`Migration SQL applied to ${SCHEMA} schema`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
