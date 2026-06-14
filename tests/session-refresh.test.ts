import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readApiRouteSources, readServerBootstrapSources } from "./helpers/api-route-sources.ts";
import { readAppSources } from "./helpers/app-sources.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("session-refresh", () => {
  const apiSource = readFileSync("src/api.ts", "utf8");
  const authScreenSource = readFileSync("src/components/AuthScreen.tsx", "utf8");
  const appSource = readAppSources();
  const appSessionSource = readFileSync("src/hooks/useAppSession.ts", "utf8");
  const sessionSource = appSource + appSessionSource;
  const bootstrapSource = readServerBootstrapSources();
  const serverSource = readApiRouteSources();

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
  assert.match(sessionSource, /handleLogout/);

  assert.match(serverSource, /api\.createRefreshToken\(safeUser\.id\)/);
  assert.match(serverSource, /api\.rotateRefreshToken\(storedToken\.id,\s*safeUser\.id\)/);
  assert.match(serverSource, /api\.setAuthCookies\(res,\s*newRefreshToken\)/);
  assert.match(serverSource, /api\.clearAuthCookies\(res\)/);
  assert.doesNotMatch(serverSource, /refreshToken:\s*newRefreshToken/);
});
console.log("Session refresh rules passed");
