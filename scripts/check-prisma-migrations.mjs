import pg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const APP_SCHEMA = "AxelmondResearchLab";

function isLegacyChecksum(checksum) {
  return typeof checksum === "string" && (checksum.startsWith("manual-") || checksum.length !== 64);
}

async function main() {
  for (const schema of [APP_SCHEMA, "public"]) {
    try {
      const rows = await pool.query(`SELECT COUNT(*)::int AS count FROM "${schema}"."_prisma_migrations"`);
      const latest = await pool.query(`
        SELECT migration_name, checksum, finished_at
        FROM "${schema}"."_prisma_migrations"
        ORDER BY finished_at DESC NULLS LAST
        LIMIT 5
      `);
      console.log(`${schema}._prisma_migrations count:`, rows.rows[0].count);
      for (const row of latest.rows) {
        const flag = isLegacyChecksum(row.checksum) ? " [LEGACY CHECKSUM]" : "";
        console.log(`  ${row.migration_name}  ${row.checksum}${flag}`);
      }
      const legacy = await pool.query(`
        SELECT migration_name, checksum
        FROM "${schema}"."_prisma_migrations"
        WHERE checksum LIKE 'manual-%' OR length(checksum) <> 64
      `);
      if (legacy.rowCount > 0) {
        console.warn(`${schema}: ${legacy.rowCount} migration(s) with non-Prisma checksum — see docs/MIGRATIONS-RUNBOOK.md`);
      }
    } catch (err) {
      console.log(`${schema}._prisma_migrations:`, err.message);
    }
  }
  await pool.end();
}

main();
