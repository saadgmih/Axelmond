/**
 * Renames PostgreSQL schema `unicode` -> `AxelmondResearchLab` on Neon/production.
 * Run once after deploying code changes:
 *   node scripts/rename-pg-schema.mjs
 *
 * Also update DATABASE_URL on Hostinger:
 *   ...?sslmode=require&schema=AxelmondResearchLab
 */
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pg;

const OLD_SCHEMA = "unicode";
const NEW_SCHEMA = "AxelmondResearchLab";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const existing = await client.query(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name IN ($1, $2)`,
      [OLD_SCHEMA, NEW_SCHEMA],
    );
    const names = new Set(existing.rows.map((r) => r.schema_name));

    if (names.has(NEW_SCHEMA)) {
      console.log(`Schema "${NEW_SCHEMA}" already exists — nothing to do.`);
      return;
    }

    if (!names.has(OLD_SCHEMA)) {
      console.error(`Schema "${OLD_SCHEMA}" not found. Available schemas:`);
      const all = await client.query(
        `SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('pg_catalog', 'information_schema') ORDER BY 1`,
      );
      console.error(all.rows.map((r) => r.schema_name).join(", "));
      process.exit(1);
    }

    await client.query(`ALTER SCHEMA "${OLD_SCHEMA}" RENAME TO "${NEW_SCHEMA}"`);
    console.log(`Renamed PostgreSQL schema "${OLD_SCHEMA}" -> "${NEW_SCHEMA}"`);
    console.log(`Update DATABASE_URL: schema=${NEW_SCHEMA}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
