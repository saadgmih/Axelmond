import assert from "node:assert/strict";
import { buildVerificationEmailContent, getVerificationUrl } from "../src/email.ts";

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
assert.equal(getVerificationUrl({ EMAIL_VERIFICATION_URL: "http://localhost:3000" } as NodeJS.ProcessEnv), undefined);
assert.equal(getVerificationUrl({ EMAIL_VERIFICATION_URL: "https://axelmond.com/verify" } as NodeJS.ProcessEnv), "https://axelmond.com/verify");

console.log("Email template rules passed");
