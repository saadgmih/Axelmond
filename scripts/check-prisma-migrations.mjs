import pg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const APP_SCHEMA = "AxelmondResearchLab";

async function main() {
  for (const schema of [APP_SCHEMA, "public"]) {
    try {
      const rows = await pool.query(`SELECT COUNT(*)::int AS count FROM "${schema}"."_prisma_migrations"`);
      const latest = await pool.query(`
        SELECT migration_name, finished_at
        FROM "${schema}"."_prisma_migrations"
        ORDER BY finished_at DESC NULLS LAST
        LIMIT 3
      `);
      console.log(`${schema}._prisma_migrations count:`, rows.rows[0].count);
      for (const row of latest.rows) console.log(`  ${row.migration_name}`);
    } catch (err) {
      console.log(`${schema}._prisma_migrations:`, err.message);
    }
  }
  await pool.end();
}

main();
