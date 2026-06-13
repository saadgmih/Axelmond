/**
 * Diagnostic migrations — Prisma status + détection checksums legacy (manual-*).
 * Usage: node scripts/report-migration-status.mjs
 */
import { execSync } from "node:child_process";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const SCHEMA = "AxelmondResearchLab";

function runStatus() {
  try {
    execSync("npx prisma migrate status", { stdio: "inherit", env: process.env });
  } catch {
    console.warn("[report-migration-status] prisma migrate status exited with non-zero code");
  }
}

async function reportManualChecksums() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    console.log("[report-migration-status] DATABASE_URL not set — skipping _prisma_migrations query");
    return;
  }

  const pool = new pg.Pool({ connectionString: databaseUrl });
  try {
    const rows = await pool.query(
      `
      SELECT migration_name, checksum, finished_at
      FROM "${SCHEMA}"."_prisma_migrations"
      ORDER BY finished_at DESC NULLS LAST
      LIMIT 25
      `,
    );
    console.log(`\n[report-migration-status] Last ${rows.rowCount} rows in ${SCHEMA}._prisma_migrations:`);
    const manual = [];
    for (const row of rows.rows) {
      const bad =
        typeof row.checksum === "string" &&
        (row.checksum.startsWith("manual-") || row.checksum.length !== 64);
      if (bad) manual.push(row);
      console.log(
        `  ${row.migration_name}  checksum=${row.checksum}${bad ? "  ⚠ LEGACY/MANUAL" : ""}`,
      );
    }
    if (manual.length > 0) {
      console.error(
        `\n[report-migration-status] ${manual.length} migration(s) with non-Prisma checksum — see docs/MIGRATIONS-RUNBOOK.md (Réparation)`,
      );
      process.exitCode = 1;
    }
  } catch (err) {
    console.warn(`[report-migration-status] Could not query _prisma_migrations: ${err.message}`);
  } finally {
    await pool.end();
  }
}

runStatus();
await reportManualChecksums();
