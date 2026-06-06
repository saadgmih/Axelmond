import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const apiSource = readFileSync("src/api.ts", "utf8");
const authScreenSource = readFileSync("src/components/AuthScreen.tsx", "utf8");
const appSource = readFileSync("src/App.tsx", "utf8");
const appSessionSource = readFileSync("src/hooks/useAppSession.ts", "utf8");
const sessionSource = appSource + appSessionSource;
const serverSource = readFileSync("server.ts", "utf8");

assert.match(apiSource, /axelmond_refresh_token/);
assert.match(apiSource, /refreshSessionToken/);
assert.match(apiSource, /"\/api\/auth\/refresh"/);
assert.match(apiSource, /res\.status === 401/);
assert.match(apiSource, /axelmond:session-expired/);
assert.match(apiSource, /getFreshSessionToken/);

assert.match(authScreenSource, /setSessionToken\(user\.token,\s*user\.refreshToken\)/);
assert.match(sessionSource, /setSessionToken\(token,\s*refreshToken\)/);
assert.match(sessionSource, /axelmond:session-expired/);
assert.match(sessionSource, /getFreshSessionToken/);

assert.match(serverSource, /createRefreshToken\(safeUser\.id\)/);
assert.match(serverSource, /rotateRefreshToken\(storedToken\.id,\s*safeUser\.id\)/);
assert.match(serverSource, /refreshToken:\s*newRefreshToken/);

console.log("Session refresh rules passed");
