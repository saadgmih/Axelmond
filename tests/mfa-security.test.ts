import assert from "node:assert/strict";
import {
  decryptMfaSecret,
  encryptMfaSecret,
  generateRecoveryCodes,
  hashRecoveryCode,
  hashWebAuthnCredentialId,
} from "../src/mfa-crypto.ts";
import { generateTotpCodeForSecret, generateTotpSecret, verifyTotpCode } from "../src/mfa-totp.ts";
import { getWebAuthnConfig } from "../src/mfa-webauthn.ts";
import { signMfaPendingToken, verifyMfaPendingToken } from "../src/mfa-pending-token.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("mfa-security", () => {
  const secret = generateTotpSecret();
  assert.ok(secret.length >= 16);

  const code = generateTotpCodeForSecret(secret);
  assert.equal(verifyTotpCode(secret, code), true);
  assert.equal(verifyTotpCode(secret, "000000"), false);

  const encrypted = encryptMfaSecret(secret, { AUTH_TOKEN_SECRET: "test-auth-secret-32-characters-minimum" });
  const decrypted = decryptMfaSecret(encrypted, { AUTH_TOKEN_SECRET: "test-auth-secret-32-characters-minimum" });
  assert.equal(decrypted, secret);

  const recovery = generateRecoveryCodes(3);
  assert.equal(recovery.length, 3);
  assert.equal(hashRecoveryCode(recovery[0]), hashRecoveryCode(recovery[0].toLowerCase()));

  assert.equal(hashWebAuthnCredentialId("abc"), hashWebAuthnCredentialId("abc"));
  assert.notEqual(hashWebAuthnCredentialId("abc"), hashWebAuthnCredentialId("def"));

  const token = signMfaPendingToken("user-1", "test-auth-secret-32-characters-minimum");
  const claims = verifyMfaPendingToken(token, "test-auth-secret-32-characters-minimum");
  assert.equal(claims?.userId, "user-1");

  const config = getWebAuthnConfig({ APP_URL: "https://axelmond.example", WEBAUTHN_RP_NAME: "Axelmond" });
  assert.equal(config.origin, "https://axelmond.example");
  assert.equal(config.rpID, "axelmond.example");
  assert.equal(config.rpName, "Axelmond");
});
