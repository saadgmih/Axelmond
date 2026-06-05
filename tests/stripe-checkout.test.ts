import assert from "node:assert/strict";
import fs from "node:fs";

const apiSource = fs.readFileSync("src/api.ts", "utf8");
const appSource = fs.readFileSync("src/App.tsx", "utf8");
const paymentModalSource = fs.readFileSync("src/components/PaymentModal.tsx", "utf8");
const serverSource = fs.readFileSync("server.ts", "utf8");

assert.match(apiSource, /createCheckoutSession:\s*\(courseId:\s*number\)/);
assert.match(apiSource, /"\/api\/payments\/create-checkout-session"/);
assert.match(paymentModalSource, /api\.createCheckoutSession\(course\.id\)/);
assert.match(appSource, /params\.get\("success"\)\s*!==\s*"true"/);
assert.match(appSource, /Enrollment refreshed after Stripe checkout/);
assert.match(serverSource, /amount_total/);
assert.match(serverSource, /Stripe webhook duplicate ignored/);
assert.match(serverSource, /checkout\.sessions\.create/);

console.log("Stripe checkout rules passed");
