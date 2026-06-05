import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const serverSource = readFileSync("server.ts", "utf-8");
const authScreenSource = readFileSync("src/components/AuthScreen.tsx", "utf-8");

assert.match(serverSource, /const AUTH_MAX_ATTEMPTS = Number\(process\.env\.AUTH_MAX_ATTEMPTS\) \|\| 20/);
assert.match(serverSource, /const AUTH_LOCKOUT_WINDOW_MS = Number\(process\.env\.AUTH_LOCKOUT_WINDOW_MS\) \|\| 1 \* 60 \* 1000/);
assert.match(serverSource, /max: AUTH_MAX_ATTEMPTS/);
assert.match(serverSource, /ipKeyGenerator\(req\.ip \|\| ""\)/);
assert.match(serverSource, /attempts >= AUTH_MAX_ATTEMPTS/);

assert.match(authScreenSource, /maxAttempts = 20/);
assert.match(authScreenSource, /maxAttempts=\{20\}/);
assert.match(authScreenSource, /1 minute/);

console.log("auth-attempts tests passed");
