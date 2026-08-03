import assert from "node:assert/strict";
import { getMfaEncryptionKey, encryptMfaSecret, decryptMfaSecret } from "../src/mfa-crypto.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("mfa-crypto", () => {
  const dedicatedKey = "custom-mfa-secret-key-32-characters-min-val";
  const envWithKey: NodeJS.ProcessEnv = {
    NODE_ENV: "production",
    MFA_ENCRYPTION_KEY: dedicatedKey,
  };

  const keyBuffer = getMfaEncryptionKey(envWithKey);
  assert.equal(keyBuffer.length, 32);
  assert.deepEqual(keyBuffer, Buffer.from(dedicatedKey, "utf8").subarray(0, 32));

  assert.throws(
    () => getMfaEncryptionKey({ NODE_ENV: "production" }),
    /MFA_ENCRYPTION_KEY must be set in production/,
  );

  const devEnv: NodeJS.ProcessEnv = {
    NODE_ENV: "development",
    AUTH_TOKEN_SECRET: "dev-auth-token-secret-32-chars-min",
  };
  const devKeyBuffer = getMfaEncryptionKey(devEnv);
  assert.equal(devKeyBuffer.length, 32);

  const encrypted = encryptMfaSecret("JBSWY3DPEHPK3PXP", envWithKey);
  const decrypted = decryptMfaSecret(encrypted, envWithKey);
  assert.equal(decrypted, "JBSWY3DPEHPK3PXP");

  console.log("MFA crypto security tests passed");
});
