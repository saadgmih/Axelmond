import assert from "node:assert/strict";
import { buildVerificationEmailContent, buildResetPasswordEmailContent, getVerificationUrl } from "../src/email.ts";
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
  assert.match(withoutLink.text, /page de connexion ou de vérification/);
  assert.match(withoutLink.text, /Ne partagez jamais ce code/);
  assert.match(withoutLink.html, /Performance Académique/);
  assert.match(withoutLink.html, /performance-logo-e6657b8a\.png/);
  assert.match(withoutLink.html, /Code personnel de vérification/);
  assert.match(withoutLink.html, /Ne le partagez jamais/);
  assert.match(withoutLink.html, /#05C2A5/);
  assert.match(withoutLink.html, /123456/);
  assert.match(withoutLink.html, /Sophie/);
  assert.doesNotMatch(withoutLink.html, /Vérifier mon compte/);
  assert.doesNotMatch(withoutLink.html, /#8b5cf6|#ec4899|#6366f1|#4c1d95|#9d174d/);

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
  assert.match(resetWithoutLink.text, /Mot de passe oublié/);
  assert.match(resetWithoutLink.text, /Votre mot de passe ne sera pas modifié/);
  assert.match(resetWithoutLink.text, /Ne partagez jamais ce code/);
  assert.match(resetWithoutLink.html, /987654/);
  assert.match(resetWithoutLink.html, /Code personnel de réinitialisation/);
  assert.match(resetWithoutLink.html, /Mot de passe oublié/);
  assert.match(resetWithoutLink.html, /Votre mot de passe ne sera pas modifié/);
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
