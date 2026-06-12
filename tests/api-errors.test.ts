import assert from "node:assert/strict";
import fs from "node:fs";

const serverSource = fs.readFileSync("server.ts", "utf8");
const expressAsyncSource = fs.readFileSync("src/express-async.ts", "utf8");
const dbSource = fs.readFileSync("src/db.ts", "utf8");

assert.match(expressAsyncSource, /patchExpressAsyncRoutes/);
assert.match(serverSource, /patchExpressAsyncRoutes\(app\)/);
assert.match(serverSource, /P2021/);
assert.match(serverSource, /verifyDatabaseConnection/);
assert.match(serverSource, /healthRateLimiter/);
assert.match(serverSource, /\$queryRaw`SELECT 1`/);
assert.match(serverSource, /isProduction\s*\?\s*\{\s*error: apiErrorMessage\(err\) \}/);
assert.match(dbSource, /export async function verifyDatabaseConnection/);

console.log("API error handling tests passed");
