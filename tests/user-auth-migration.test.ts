import assert from "node:assert/strict";
import fs from "node:fs";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("user-auth-migration", () => {
  const migration = fs.readFileSync("prisma/migrations/20260606230000_user_auth_lockout_refresh/migration.sql", "utf8");

  assert.match(migration, /ADD COLUMN "failedLoginAttempts"/);
  assert.match(migration, /ADD COLUMN "lockoutUntil"/);
  assert.match(migration, /CREATE TABLE "RefreshToken"/);
  assert.match(migration, /CREATE TABLE "AuditLog"/);
  assert.doesNotMatch(migration, /db push/i);
});
