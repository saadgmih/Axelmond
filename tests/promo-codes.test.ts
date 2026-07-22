import assert from "node:assert/strict";
import { readApiRouteSources } from "./helpers/api-route-sources.ts";
import fs from "node:fs";
import {
  computeDiscountedPrice,
  isPromoCodesEnabled,
  resolveCourseChargeAmount,
  resolvePromoDiscountPercent,
} from "../src/promo-codes.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("promo-codes", () => {
  assert.equal(resolvePromoDiscountPercent(""), 0);
  assert.equal(resolvePromoDiscountPercent(undefined), 0);
  assert.equal(resolvePromoDiscountPercent("AXELMOND20"), 20);
  assert.equal(resolvePromoDiscountPercent("axelmond20"), 20);
  assert.equal(resolvePromoDiscountPercent("INVALID"), null);
  assert.equal(resolvePromoDiscountPercent("AXELMOND20", { NODE_ENV: "production" }), null);
  assert.equal(resolvePromoDiscountPercent("AXELMOND20", { NODE_ENV: "production", PROMO_CODES_ENABLED: "true" }), 20);
  assert.equal(isPromoCodesEnabled({ NODE_ENV: "production" }), false);
  assert.equal(isPromoCodesEnabled({ NODE_ENV: "production", PROMO_CODES_ENABLED: "true" }), true);

  assert.equal(computeDiscountedPrice(160, 20), 128);
  assert.equal(computeDiscountedPrice(125, 20), 100);

  const withPromo = resolveCourseChargeAmount(160, "AXELMOND20");
  assert.equal(withPromo.amount, 128);
  assert.equal(withPromo.discountPercent, 20);
  assert.equal(withPromo.error, undefined);

  const withoutPromo = resolveCourseChargeAmount(160, "");
  assert.equal(withoutPromo.amount, 160);
  assert.equal(withoutPromo.discountPercent, 0);

  const invalidPromo = resolveCourseChargeAmount(160, "BADCODE");
  assert.equal(invalidPromo.error, "Code promo invalide ou expiré.");

  const serverSource = readApiRouteSources();
  const paymentModalSource = fs.readFileSync("src/components/PaymentModal.tsx", "utf8");
  const apiSource = fs.readFileSync("src/api.ts", "utf8");
  const paypalServerSource = fs.readFileSync("src/paypal-server.ts", "utf8");
  const paypalEnrollmentSource = fs.readFileSync("src/paypal-enrollment.ts", "utf8");

  assert.match(apiSource, /createPayPalOrder:\s*\(courseId:\s*number,\s*promoCode\?:\s*string\)/);
  assert.match(paymentModalSource, /api\.createPayPalOrder\(course\.id,\s*appliedPromo\?\.code\)/);
  assert.match(serverSource, /validatePromoCodeEligibility\(/);
  assert.match(serverSource, /reservePromoCodeUsage\(/);
  assert.match(paypalEnrollmentSource, /metadata\.expectedAmount/);
  assert.match(paypalServerSource, /buildPayPalCustomId\([\s\S]*payPalCurrency/);
  assert.doesNotMatch(serverSource, /includeAiAssistant|computeCourseCheckoutTotalMad/);
});
