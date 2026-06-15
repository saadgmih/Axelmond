import assert from "node:assert/strict";
import fs from "node:fs";
import { hasMobileClientHeader, isMobileClientRequest, MOBILE_CLIENT_KEY_HEADER } from "../src/auth-mobile.ts";
import { isMobileClientSpoofAttempt } from "../src/mobile-client-guard.ts";
import { isMockEnrollmentAllowed, isProductionDatabaseUrlSecure } from "../src/security-hardening.ts";
import { validateProductionConfiguration } from "../src/production-config.ts";
import { normalizePromoCodeInput } from "../src/promo-codes.ts";
import { readServerBootstrapSources } from "./helpers/api-route-sources.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("security-max-hardening", () => {
  const bootstrap = readServerBootstrapSources();
  const paymentsSource = fs.readFileSync("src/routes/payments-routes.ts", "utf8");
  const mobileGuardSource = fs.readFileSync("src/mobile-client-guard.ts", "utf8");

  assert.match(bootstrap, /mobileClientSpoofGuard/);
  assert.match(bootstrap, /crossOriginOpenerPolicy/);
  assert.match(bootstrap, /crossOriginResourcePolicy/);
  assert.match(paymentsSource, /isMockEnrollmentAllowed/);
  assert.match(mobileGuardSource, /MOBILE_CLIENT_REJECTED/);

  assert.equal(isMockEnrollmentAllowed({ NODE_ENV: "production", ALLOW_MOCK_ENROLLMENT: "true" }), false);
  assert.equal(isMockEnrollmentAllowed({ NODE_ENV: "development", ALLOW_MOCK_ENROLLMENT: "true" }), true);
  assert.equal(isMockEnrollmentAllowed({ NODE_ENV: "development" }), false);

  assert.equal(
    isProductionDatabaseUrlSecure(
      "postgresql://user:pass@ep-example.neon.tech/db?sslmode=require&schema=AxelmondResearchLab",
    ),
    true,
  );
  assert.equal(
    isProductionDatabaseUrlSecure("postgresql://user:pass@ep-example.neon.tech/db?schema=AxelmondResearchLab"),
    false,
  );

  assert.equal(normalizePromoCodeInput("  axelmond20  "), "AXELMOND20");
  assert.equal(normalizePromoCodeInput("A".repeat(80)).length, 32);

  const spoofReq = {
    headers: {
      "x-axelmond-client": "mobile",
      [MOBILE_CLIENT_KEY_HEADER]: "wrong-key",
    },
  } as any;

  assert.equal(hasMobileClientHeader(spoofReq), true);
  assert.equal(
    isMobileClientRequest(spoofReq, {
      NODE_ENV: "production",
      MOBILE_CLIENT_SECRET: "mobile-client-secret-32-characters-minimum",
    }),
    false,
  );
  assert.equal(
    isMobileClientSpoofAttempt(spoofReq, {
      NODE_ENV: "production",
      MOBILE_CLIENT_SECRET: "mobile-client-secret-32-characters-minimum",
    }),
    true,
  );

  const productionIssues = validateProductionConfiguration({
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
    ALLOW_MOCK_ENROLLMENT: "true",
    HIBP_FAIL_OPEN: "true",
  });

  assert.match(productionIssues.join("\n"), /DATABASE_URL must include sslmode=require/);
  assert.match(productionIssues.join("\n"), /ALLOW_MOCK_ENROLLMENT must not be enabled/);
  assert.match(productionIssues.join("\n"), /HIBP_FAIL_OPEN must not be enabled/);
});
