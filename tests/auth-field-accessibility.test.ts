import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rulesTest } from "./helpers/rulesTest";

rulesTest("authentication fields expose complete accessible identities", () => {
  const source = readFileSync("src/components/AuthScreen.tsx", "utf8");
  const requiredFieldIds = [
    "auth-verification-code",
    "auth-email",
    "auth-reset-email",
    "auth-reset-code",
    "auth-new-password",
    "auth-full-name",
    "auth-email-login",
    "auth-password",
    "auth-filiere",
    "auth-access-key",
  ];

  for (const id of requiredFieldIds) {
    assert.match(source, new RegExp(`(?:htmlFor|id)=[{"]+[^\n]*${id}`), `Missing label/input identity for ${id}`);
  }
  assert.match(source, /name="resetCode"[\s\S]*?autoComplete="one-time-code"/);
  assert.match(source, /name="newPassword"[\s\S]*?autoComplete="new-password"/);
  assert.match(source, /name=\{activeSector === "student" \? "filiere" : "professorInviteCode"\}/);
  assert.match(source, /aria-describedby=\{errorMsg \? "auth-error-msg" : undefined\}/);
  assert.match(source, /id="auth-error-msg"[\s\S]*?role="alert"/);
});
