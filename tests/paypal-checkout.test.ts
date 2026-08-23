import assert from "node:assert/strict";
import { readApiRouteSources } from "./helpers/api-route-sources.ts";
import { readAppSources } from "./helpers/app-sources.ts";
import fs from "node:fs";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("paypal-checkout", () => {
  const apiSource = fs.readFileSync("src/api.ts", "utf8");
  const appSource = readAppSources();
  const paymentModalSource = fs.readFileSync("src/components/PaymentModal.tsx", "utf8");
  const serverSource = readApiRouteSources();
  const paypalServerSource = fs.readFileSync("src/paypal-server.ts", "utf8");

  assert.match(apiSource, /createPayPalOrder:\s*\(courseId:\s*number,\s*promoCode\?:\s*string\)/);
  assert.match(apiSource, /capturePayPalOrder:\s*\(orderId:\s*string,\s*courseId:\s*number\)/);
  assert.match(apiSource, /"\/api\/paypal\/create-order"/);
  assert.match(apiSource, /"\/api\/paypal\/capture-order"/);
  assert.doesNotMatch(paymentModalSource, /PayPalButtons|PayPalScriptProvider/);
  // Grille tarifaire 3 colonnes (e2da623) : largeur conditionnelle + zone scroll dédiée.
  assert.match(paymentModalSource, /isFreeCheckout \? "max-w-2xl" : "max-w-6xl"/);
  assert.match(paymentModalSource, /overflow-y-auto max-h-\[calc\(90vh-180px\)\]/);
  assert.match(paymentModalSource, /handleHostedPayPalCheckout/);
  assert.match(paymentModalSource, /Payer par carte ou PayPal/);
  assert.doesNotMatch(paymentModalSource, /axelmond-paypal-buttons/);
  assert.match(paymentModalSource, /buildPayPalHostedCheckoutUrl/);
  assert.match(paymentModalSource, /storePendingPayPalCheckout/);
  assert.match(appSource, /readPendingPayPalCheckout/);
  assert.match(appSource, /setCourseToPurchase\(checkoutCourse\)/);
  const globalStyles = fs.readFileSync("src/index.css", "utf8");
  assert.doesNotMatch(globalStyles, /iframe\.component-frame/);
  assert.doesNotMatch(globalStyles, /\[data-funding-source\]/);
  assert.match(paymentModalSource, /api\.createPayPalOrder\(course\.id,\s*appliedPromo\?\.code\)/);
  assert.doesNotMatch(paymentModalSource, /includeAiAssistant|Tuteur IA|Assistant IA pédagogique/);
  assert.doesNotMatch(apiSource + serverSource, /includeAiAssistant|computeCourseCheckoutTotalMad/);
  assert.match(paymentModalSource, /api\.capturePayPalOrder\(/);
  assert.match(serverSource, /app\.post\("\/api\/paypal\/create-order"/);
  assert.match(serverSource, /app\.post\("\/api\/paypal\/capture-order"/);
  assert.match(serverSource, /app\.post\(\s*"\s*\/api\/paypal\/webhook"/);
  assert.match(serverSource, /processPayPalCaptureEnrollment/);
  assert.match(serverSource, /PAYMENT_PAYPAL_SUCCESS/);
  assert.match(serverSource, /PayPal capture duplicate ignored/);
  assert.match(paypalServerSource, /\/v2\/checkout\/orders/);
  assert.match(paypalServerSource, /landing_page:\s*"BILLING"/);
  assert.doesNotMatch(serverSource, /stripe\.checkout\.sessions\.create/);
  assert.doesNotMatch(serverSource, /\/api\/stripe\/webhook/);
  assert.doesNotMatch(apiSource, /createCheckoutSession/);
});
