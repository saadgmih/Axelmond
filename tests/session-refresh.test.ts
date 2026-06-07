import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const apiSource = readFileSync("src/api.ts", "utf8");
const authScreenSource = readFileSync("src/components/AuthScreen.tsx", "utf8");
const appSource = readFileSync("src/App.tsx", "utf8");
const appSessionSource = readFileSync("src/hooks/useAppSession.ts", "utf8");
const sessionSource = appSource + appSessionSource;
const serverSource = readFileSync("server.ts", "utf8");

assert.match(apiSource, /refreshSessionToken/);
assert.match(apiSource, /"\/api\/auth\/refresh"/);
assert.match(apiSource, /res\.status === 401/);
assert.match(apiSource, /axelmond:session-expired/);
assert.match(apiSource, /getFreshSessionToken/);
assert.match(apiSource, /credentials:\s*"include"/);
assert.match(apiSource, /accessTokenMemory/);
assert.match(apiSource, /purgeLegacyTokenStorage/);

assert.match(authScreenSource, /setSessionToken\(user\.token,\s*user\.csrfToken\)/);
assert.match(sessionSource, /setSessionToken\(token,\s*csrfToken\)/);
assert.match(sessionSource, /axelmond:session-expired/);
assert.match(sessionSource, /getFreshSessionToken/);
assert.match(sessionSource, /api\.logout\(\)/);

assert.match(serverSource, /createRefreshToken\(safeUser\.id\)/);
assert.match(serverSource, /rotateRefreshToken\(storedToken\.id,\s*safeUser\.id\)/);
assert.match(serverSource, /setAuthCookies\(res,\s*newRefreshToken\)/);
assert.match(serverSource, /clearAuthCookies\(res\)/);
assert.doesNotMatch(serverSource, /refreshToken:\s*newRefreshToken/);

console.log("Session refresh rules passed");
