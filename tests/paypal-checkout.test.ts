import assert from "node:assert/strict";
import { readApiRouteSources } from "./helpers/api-route-sources.ts";
import { readAppSources } from "./helpers/app-sources.ts";
import fs from "node:fs";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("paypal-checkout", () => {
  const apiSource = fs.readFileSync("src/api.ts", "utf8");
  const _appSource = readAppSources();
  const paymentModalSource = fs.readFileSync("src/components/PaymentModal.tsx", "utf8");
  const serverSource = readApiRouteSources();
  const paypalServerSource = fs.readFileSync("src/paypal-server.ts", "utf8");

  assert.match(apiSource, /createPayPalOrder:\s*\(courseId:\s*number,\s*promoCode\?:\s*string\)/);
  assert.match(apiSource, /capturePayPalOrder:\s*\(orderId:\s*string,\s*courseId:\s*number\)/);
  assert.match(apiSource, /"\/api\/paypal\/create-order"/);
  assert.match(apiSource, /"\/api\/paypal\/capture-order"/);
  assert.match(paymentModalSource, /PayPalButtons/);
  assert.match(paymentModalSource, /api\.createPayPalOrder\(course\.id,\s*appliedPromo\)/);
  assert.match(paymentModalSource, /api\.capturePayPalOrder\(/);
  assert.match(serverSource, /app\.post\("\/api\/paypal\/create-order"/);
  assert.match(serverSource, /app\.post\("\/api\/paypal\/capture-order"/);
  assert.match(serverSource, /app\.post\(\s*"\s*\/api\/paypal\/webhook"/);
  assert.match(serverSource, /processPayPalCaptureEnrollment/);
  assert.match(serverSource, /PAYMENT_PAYPAL_SUCCESS/);
  assert.match(serverSource, /PayPal capture duplicate ignored/);
  assert.match(paypalServerSource, /\/v2\/checkout\/orders/);
  assert.doesNotMatch(serverSource, /stripe\.checkout\.sessions\.create/);
  assert.doesNotMatch(serverSource, /\/api\/stripe\/webhook/);
  assert.doesNotMatch(apiSource, /createCheckoutSession/);
});
