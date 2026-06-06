import assert from "node:assert/strict";
import { resolvePgSchema } from "../src/db.ts";

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

console.log("Database schema resolver tests passed");
