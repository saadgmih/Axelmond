/**
 * CI migration guard — offline structure checks + optional drift detection on PostgreSQL.
 * Usage:
 *   node scripts/check-migrations-ci.mjs
 *   DATABASE_URL=postgresql://... node scripts/check-migrations-ci.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const migrationsDir = path.join("prisma", "migrations");
const lockFile = path.join(migrationsDir, "migration_lock.toml");

function fail(message) {
  console.error(`[migrations-ci] ${message}`);
  process.exit(1);
}

function run(command) {
  console.log(`[migrations-ci] ${command}`);
  execSync(command, { stdio: "inherit", env: process.env });
}

if (!fs.existsSync(lockFile)) {
  fail("Missing prisma/migrations/migration_lock.toml");
}

const migrationFolders = fs
  .readdirSync(migrationsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

if (migrationFolders.length === 0) {
  fail("No migration folders found under prisma/migrations");
}

for (const folder of migrationFolders) {
  const sqlPath = path.join(migrationsDir, folder, "migration.sql");
  if (!fs.existsSync(sqlPath)) {
    fail(`Missing migration.sql in ${folder}`);
  }
  const sql = fs.readFileSync(sqlPath, "utf8").trim();
  if (!sql) {
    fail(`Empty migration.sql in ${folder}`);
  }
}

console.log(`[migrations-ci] ${migrationFolders.length} migration folders validated`);

run("npx prisma validate");

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.log("[migrations-ci] DATABASE_URL not set — skipping deploy/drift checks (offline mode)");
  console.log("[migrations-ci] OK");
  process.exit(0);
}

run("npx prisma migrate deploy");

try {
  run(
    `npx prisma migrate diff --from-url "${databaseUrl}" --to-schema-datamodel prisma/schema.prisma --exit-code`,
  );
} catch (err) {
  if (typeof err.status === "number" && err.status === 2) {
    fail("Schema drift detected: prisma/schema.prisma is not fully reflected in applied migrations");
  }
  throw err;
}

console.log("[migrations-ci] OK");
