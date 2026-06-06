import pg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const userCols = await pool.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'unicode' AND table_name = 'User'
    ORDER BY ordinal_position
  `);
  console.log("unicode.User columns:");
  for (const row of userCols.rows) {
    console.log(`  ${row.column_name} (${row.data_type}, nullable=${row.is_nullable}, default=${row.column_default ?? "none"})`);
  }

  const tables = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'unicode'
      AND table_name IN ('RefreshToken', 'AuditLog')
    ORDER BY table_name
  `);
  console.log("\nRelated tables in unicode:", tables.rows.map((r) => r.table_name).join(", ") || "(none)");

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
