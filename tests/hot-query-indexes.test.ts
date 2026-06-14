import assert from "node:assert/strict";
import fs from "node:fs";

import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("hot-query-indexes", () => {
const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
const migration = fs.readFileSync(
  "prisma/migrations/20260613200000_hot_query_indexes/migration.sql",
  "utf8",
);

assert.match(schema, /model LiveMessage[\s\S]*@@index\(\[roomName,\s*createdAt\]\)/);
assert.match(schema, /model LiveAttendance[\s\S]*@@index\(\[sessionId,\s*userId,\s*leftAt\]\)/);
assert.match(schema, /model EmailVerificationCode[\s\S]*@@index\(\[userId,\s*usedAt,\s*createdAt\]\)/);

assert.match(migration, /LiveMessage_roomName_createdAt_idx/);
assert.match(migration, /LiveAttendance_sessionId_userId_leftAt_idx/);
assert.match(migration, /EmailVerificationCode_userId_usedAt_createdAt_idx/);

console.log("Hot query index guard tests passed");
});
