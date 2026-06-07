import assert from "node:assert/strict";
import { buildFixedDatabaseUrl, DEFAULT_PG_SCHEMA, resolvePgSchema } from "../src/db.ts";

assert.equal(
  resolvePgSchema("postgresql://user:pass@host/db?sslmode=require&schema=unicode"),
  DEFAULT_PG_SCHEMA,
);

assert.equal(
  resolvePgSchema("postgresql://user:pass@host/db?schema=public"),
  "public",
);

assert.equal(
  resolvePgSchema("postgresql://user:pass@host/db"),
  DEFAULT_PG_SCHEMA,
);

assert.equal(
  resolvePgSchema("postgresql://user:pass@host/db?schema=bad-schema"),
  DEFAULT_PG_SCHEMA,
);

const fixed = buildFixedDatabaseUrl("postgresql://user:pass@host/neondb");
assert.match(fixed.url, /schema=AxelmondResearchLab/);
assert.match(fixed.url, /sslmode=require/);
assert.equal(fixed.schema, DEFAULT_PG_SCHEMA);

const fixedLegacy = buildFixedDatabaseUrl(
  "postgresql://user:pass@host/neondb?sslmode=require&schema=unicode",
);
assert.match(fixedLegacy.url, /schema=AxelmondResearchLab/);
assert.equal(fixedLegacy.schema, DEFAULT_PG_SCHEMA);

const fixedExisting = buildFixedDatabaseUrl(
  "postgresql://user:pass@host/neondb?sslmode=require&schema=AxelmondResearchLab",
);
assert.match(fixedExisting.url, /schema=AxelmondResearchLab/);
assert.equal(fixedExisting.schema, "AxelmondResearchLab");

console.log("Database schema resolver tests passed");
