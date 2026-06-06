import assert from "node:assert/strict";
import { buildFixedDatabaseUrl, resolvePgSchema } from "../src/db.ts";

assert.equal(
  resolvePgSchema("postgresql://user:pass@host/db?sslmode=require&schema=unicode"),
  "unicode",
);

assert.equal(
  resolvePgSchema("postgresql://user:pass@host/db?schema=public"),
  "public",
);

assert.equal(
  resolvePgSchema("postgresql://user:pass@host/db"),
  "unicode",
);

assert.equal(
  resolvePgSchema("postgresql://user:pass@host/db?schema=bad-schema"),
  "unicode",
);

const fixed = buildFixedDatabaseUrl("postgresql://user:pass@host/neondb");
assert.match(fixed.url, /schema=unicode/);
assert.match(fixed.url, /sslmode=require/);
assert.equal(fixed.schema, "unicode");

const fixedExisting = buildFixedDatabaseUrl(
  "postgresql://user:pass@host/neondb?sslmode=require&schema=unicode",
);
assert.match(fixedExisting.url, /schema=unicode/);
assert.equal(fixedExisting.schema, "unicode");

console.log("Database schema resolver tests passed");
