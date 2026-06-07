import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const APP_SCHEMA = "AxelmondResearchLab";

async function main() {
  const tables = await pool.query(`
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_name IN ('User', 'Course', 'FacultyDomain', 'Enrollment', '_prisma_migrations')
    ORDER BY table_schema, table_name
  `);
  console.log("Matching tables:");
  for (const row of tables.rows) {
    console.log(`  ${row.table_schema}.${row.table_name}`);
  }

  const counts = await pool.query(
    `
    SELECT table_schema, COUNT(*)::int AS table_count
    FROM information_schema.tables
    WHERE table_schema IN ('public', $1)
      AND table_type = 'BASE TABLE'
    GROUP BY table_schema
    ORDER BY table_schema
  `,
    [APP_SCHEMA],
  );
  console.log("\nTable counts by schema:");
  for (const row of counts.rows) {
    console.log(`  ${row.table_schema}: ${row.table_count} tables`);
  }

  for (const schema of [APP_SCHEMA, "public"]) {
    try {
      const migrations = await pool.query(`
        SELECT migration_name, finished_at
        FROM "${schema}"."_prisma_migrations"
        ORDER BY finished_at DESC NULLS LAST
        LIMIT 11
      `);
      if (migrations.rows.length) {
        console.log(`\nMigrations in ${schema} (${migrations.rows.length} shown):`);
        for (const row of migrations.rows) {
          console.log(`  ${row.migration_name}`);
        }
      }
    } catch {
      console.log(`\nNo _prisma_migrations in ${schema}`);
    }
  }

  console.log("\nUser columns by schema:");
  for (const schema of ["public", APP_SCHEMA]) {
    const columns = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = 'User' ORDER BY column_name`,
      [schema],
    );
    console.log(`  ${schema}: ${columns.rows.map((row) => row.column_name).join(", ")}`);
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
