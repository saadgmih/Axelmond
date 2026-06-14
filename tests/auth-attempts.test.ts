import assert from "node:assert/strict";import { readFileSync } from "node:fs";import { readApiRouteSources, readServerBootstrapSources } from "./helpers/api-route-sources.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("auth-attempts", () => {
const bootstrapSource = readServerBootstrapSources();
const apiSource = readApiRouteSources();
const authScreenSource = readFileSync("src/components/AuthScreen.tsx", "utf-8");

assert.match(bootstrapSource, /const AUTH_MAX_ATTEMPTS = Number\(process\.env\.AUTH_MAX_ATTEMPTS\) \|\| 20/);
assert.match(bootstrapSource, /const AUTH_LOCKOUT_WINDOW_MS = Number\(process\.env\.AUTH_LOCKOUT_WINDOW_MS\) \|\| 1 \* 60 \* 1000/);
assert.match(bootstrapSource, /max: AUTH_MAX_ATTEMPTS/);
assert.match(bootstrapSource, /ipKeyGenerator\(req\.ip \|\| ""\)/);
assert.match(apiSource, /attempts >= api\.AUTH_MAX_ATTEMPTS/);

assert.match(authScreenSource, /maxAttempts = 20/);
assert.match(authScreenSource, /maxAttempts=\{20\}/);
assert.match(authScreenSource, /1 minute/);

});
