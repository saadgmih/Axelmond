import assert from "node:assert/strict";
import fs from "node:fs";
import { readApiRouteSources } from "./helpers/api-route-sources.ts";

const apiSource = fs.readFileSync("src/api.ts", "utf8");
const routeSources = readApiRouteSources();

assert.doesNotMatch(apiSource, /\benrollMock\b/, "enrollMock client removed; use PayPal capture or server enroll-mock in dev only");
assert.doesNotMatch(apiSource, /\bsyncUser\b/, "syncUser client removed; use api.me() after payment");
assert.doesNotMatch(apiSource, /\bgetUser:\s*\(/, "getUser client removed; use api.me()");

assert.doesNotMatch(routeSources, /\/api\/users\/sync/, "legacy PUT /api/users/sync route removed");
assert.doesNotMatch(routeSources, /app\.get\("\/api\/users\/:id"/, "legacy GET /api/users/:id route removed");
assert.doesNotMatch(routeSources, /\bsyncUserSchema\b/, "syncUserSchema removed with legacy sync route");

assert.ok(fs.existsSync("scripts/README.md"), "scripts/README.md documents active vs archived scripts");
assert.ok(fs.existsSync("scripts/archive"), "legacy one-shot scripts live under scripts/archive/");

const archivedDestructive = "scripts/archive/delete_modules.cjs";
assert.ok(fs.existsSync(archivedDestructive), "destructive delete_modules.cjs must stay archived, not at repo root");

console.log("Dead code cleanup guard tests passed");
