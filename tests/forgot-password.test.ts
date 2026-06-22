import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readApiRouteSources } from "./helpers/api-route-sources.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("forgot-password", () => {
  const serverSource = readApiRouteSources();
  const apiSource = readFileSync("src/api.ts", "utf-8");
  const authScreenSource = readFileSync("src/components/AuthScreen.tsx", "utf-8");

  // 1. Validate Zod Schemas
  assert.match(serverSource, /const forgotPasswordSchema\s*=\s*z\.object\(\{/);
  assert.match(serverSource, /const resetPasswordSchema\s*=\s*z\.object\(\{/);

  // 2. Validate Express API Endpoints
  assert.match(serverSource, /app\.post\("\/api\/auth\/forgot-password",/);
  assert.match(serverSource, /app\.post\("\/api\/auth\/reset-password",/);
  assert.match(serverSource, /"FORGOT_PASSWORD_REQUEST"/);
  assert.match(serverSource, /"RESET_PASSWORD_SUCCESS"/);
  assert.match(serverSource, /Si un compte Performance Académique existe pour cette adresse/);
  assert.doesNotMatch(serverSource, /Aucun compte n'est associé à cette adresse e-mail/);

  // 3. Validate client-side API helper methods
  assert.match(apiSource, /forgotPassword:\s*\(email:\s*string\)/);
  assert.match(apiSource, /resetPassword:\s*\(email:\s*string,\s*code:\s*string,\s*newPassword:\s*string\)/);

  // 4. Validate UI AuthScreen Integration
  assert.match(authScreenSource, /setAuthMode\("forgot"\)/);
  assert.match(authScreenSource, /setAuthMode\("reset"\)/);
  assert.match(authScreenSource, /handleForgotPassword/);
  assert.match(authScreenSource, /handleResetPassword/);
  assert.match(authScreenSource, /Mot de passe oublié \?/);
});
