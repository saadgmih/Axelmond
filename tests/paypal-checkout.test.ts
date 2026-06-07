import assert from "node:assert/strict";
import fs from "node:fs";

const apiSource = fs.readFileSync("src/api.ts", "utf8");
const appSource = fs.readFileSync("src/App.tsx", "utf8");
const paymentModalSource = fs.readFileSync("src/components/PaymentModal.tsx", "utf8");
const serverSource = fs.readFileSync("server.ts", "utf8");
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
assert.match(serverSource, /PAYMENT_PAYPAL_SUCCESS/);
assert.match(serverSource, /PayPal capture duplicate ignored/);
assert.match(paypalServerSource, /\/v2\/checkout\/orders/);
assert.doesNotMatch(serverSource, /stripe\.checkout\.sessions\.create/);
assert.doesNotMatch(serverSource, /\/api\/stripe\/webhook/);
assert.doesNotMatch(apiSource, /createCheckoutSession/);

console.log("PayPal checkout rules passed");
