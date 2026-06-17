import assert from "node:assert/strict";
import {
  buildVerificationEmailContent,
  buildResetPasswordEmailContent,
  getVerificationUrl,
} from "../src/email.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("email-template", () => {
  const withoutLink = buildVerificationEmailContent({
    fullName: "Sophie Martin",
    code: "123456",
    expiresInMinutes: 15,
  });

  assert.match(withoutLink.text, /Bonjour Sophie/);
  assert.match(withoutLink.text, /123456/);
  assert.match(withoutLink.text, /15 minutes/);
  assert.match(withoutLink.html, /Axelmond Research Labs/);
  assert.match(withoutLink.html, /123456/);
  assert.match(withoutLink.html, /Sophie/);
  assert.doesNotMatch(withoutLink.html, /Vérifier mon compte/);

  const withLink = buildVerificationEmailContent({
    fullName: "Sophie Martin",
    code: "654321",
    expiresInMinutes: 15,
    verifyUrl: "https://axelmond.com/verify",
  });

  assert.match(withLink.html, /Vérifier mon compte/);
  assert.match(withLink.html, /https:\/\/axelmond\.com\/verify/);
  assert.match(withLink.text, /https:\/\/axelmond\.com\/verify/);

  // Test buildResetPasswordEmailContent
  const resetWithoutLink = buildResetPasswordEmailContent({
    fullName: "Marc Dubois",
    code: "987654",
    expiresInMinutes: 20,
  });

  assert.match(resetWithoutLink.text, /Bonjour Marc/);
  assert.match(resetWithoutLink.text, /987654/);
  assert.match(resetWithoutLink.text, /20 minutes/);
  assert.match(resetWithoutLink.text, /réinitialisation de votre mot de passe/i);
  assert.match(resetWithoutLink.html, /987654/);
  assert.match(resetWithoutLink.html, /réinitialisation de votre mot de passe/i);
  assert.doesNotMatch(resetWithoutLink.html, /Réinitialiser mon mot de passe/);

  const resetWithLink = buildResetPasswordEmailContent({
    fullName: "Marc Dubois",
    code: "987654",
    expiresInMinutes: 20,
    resetUrl: "https://axelmond.com/reset-password",
  });

  assert.match(resetWithLink.html, /Réinitialiser mon mot de passe/);
  assert.match(resetWithLink.html, /https:\/\/axelmond\.com\/reset-password/);
  assert.match(resetWithLink.text, /https:\/\/axelmond\.com\/reset-password/);

  assert.equal(getVerificationUrl({ EMAIL_VERIFICATION_URL: "http://localhost:3000" } as NodeJS.ProcessEnv), undefined);
  assert.equal(
    getVerificationUrl({ EMAIL_VERIFICATION_URL: "https://axelmond.com/verify" } as NodeJS.ProcessEnv),
    "https://axelmond.com/verify",
  );
});
