import assert from "node:assert/strict";
import { validateProductionConfiguration } from "../src/production-config.ts";

import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("production-config", () => {
  const validProductionEnv: NodeJS.ProcessEnv = {
    NODE_ENV: "production",
    APP_URL: "https://axelmond.example",
    DATABASE_URL: "postgresql://user:password@db.example:5432/app?schema=AxelmondResearchLab",
    AUTH_TOKEN_SECRET: "auth-secret-32-characters-minimum-value",
    EMAIL_VERIFICATION_SECRET: "email-secret-32-characters-minimum-value",
    PAYPAL_CLIENT_ID: "live-client-id",
    PAYPAL_CLIENT_SECRET: "paypal-client-secret",
    PAYPAL_ENV: "live",
    PAYPAL_WEBHOOK_ID: "webhook-id",
    LIVEKIT_URL: "wss://axelmond.livekit.cloud",
    LIVEKIT_API_KEY: "livekit-api-key",
    LIVEKIT_API_SECRET: "livekit-secret-32-characters-minimum",
    UPLOADTHING_TOKEN: "uploadthing-token-32-characters-minimum",
    UPLOADTHING_IS_DEV: "false",
    SMTP_HOST: "smtp.example.com",
    SMTP_USER: "verification@example.com",
    SMTP_PASS: "smtp-pass",
    EMAIL_VERIFICATION_URL: "https://axelmond.example",
    VAPID_PUBLIC_KEY: "vapid-public-key",
    VAPID_PRIVATE_KEY: "vapid-private-key-32-characters-minimum",
    MOBILE_CLIENT_SECRET: "mobile-client-secret-32-characters-minimum",
  };

  assert.deepEqual(validateProductionConfiguration(validProductionEnv), []);

  assert.match(
    validateProductionConfiguration({
      ...validProductionEnv,
      PAYPAL_ENV: "Sandbox",
    }).join("\n"),
    /PAYPAL_ENV must be live/,
  );

  assert.match(
    validateProductionConfiguration({
      ...validProductionEnv,
      EMAIL_VERIFICATION_SECRET: validProductionEnv.AUTH_TOKEN_SECRET,
    }).join("\n"),
    /EMAIL_VERIFICATION_SECRET must not reuse/,
  );

  assert.match(
    validateProductionConfiguration({
      ...validProductionEnv,
      APP_URL: "http://localhost:3000",
    }).join("\n"),
    /APP_URL must be a public HTTPS URL/,
  );

  console.log("Production configuration guard tests passed");
});
