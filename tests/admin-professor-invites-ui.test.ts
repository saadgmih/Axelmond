import assert from "node:assert/strict";import { readFileSync } from "node:fs";import { readApiRouteSources } from "./helpers/api-route-sources.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("admin-professor-invites-ui", () => {
const apiSource = readFileSync("src/api.ts", "utf8");
const serverSource = readApiRouteSources();

assert.match(serverSource, /app\.get\("\/api\/admin\/professor-invites",\s*requireAuth,\s*requireAdmin/);
assert.match(serverSource, /app\.post\("\/api\/admin\/professor-invites",\s*requireAuth,\s*requireAdmin/);
assert.match(serverSource, /app\.delete\("\/api\/admin\/professor-invites\/:code",\s*requireAuth,\s*requireAdmin/);

assert.doesNotMatch(apiSource, /\bgetProfessorInvites\b/);
assert.doesNotMatch(apiSource, /\bcreateProfessorInvite\b/);
assert.doesNotMatch(apiSource, /\bdeleteProfessorInvite\b/);

});
