import fs from "fs";
import crypto from "node:crypto";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pg;

const SCHEMA = "AxelmondResearchLab";
const MIGRATION_NAME = "20260607140000_messaging_notifications";

async function main() {
  const sql = fs.readFileSync(
    `prisma/migrations/${MIGRATION_NAME}/migration.sql`,
    "utf8",
  );
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`SET search_path TO "${SCHEMA}"`);

    const exists = await client.query(
      `SELECT to_regclass('"${SCHEMA}"."Conversation"') AS conversation_table`,
    );
    if (exists.rows[0]?.conversation_table) {
      console.log(`Messaging tables already exist in ${SCHEMA} — skipping SQL apply`);
    } else {
      await client.query(sql);
      console.log(`Migration SQL applied to ${SCHEMA} schema`);
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        "id" VARCHAR(36) PRIMARY KEY,
        "checksum" VARCHAR(64) NOT NULL,
        "finished_at" TIMESTAMPTZ,
        "migration_name" VARCHAR(255) NOT NULL,
        "logs" TEXT,
        "rolled_back_at" TIMESTAMPTZ,
        "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "applied_steps_count" INTEGER NOT NULL DEFAULT 0
      )
    `);

    const alreadyRecorded = await client.query(
      `SELECT 1 FROM "_prisma_migrations" WHERE "migration_name" = $1 LIMIT 1`,
      [MIGRATION_NAME],
    );
    if (alreadyRecorded.rowCount === 0) {
      await client.query(
        `INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "applied_steps_count")
         VALUES ($1, $2, NOW(), $3, NULL, 1)`,
        [crypto.randomUUID(), "manual-messaging-notifications", MIGRATION_NAME],
      );
      console.log(`Recorded migration ${MIGRATION_NAME} in _prisma_migrations`);
    }

    await client.query("COMMIT");
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
