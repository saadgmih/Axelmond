import assert from "node:assert/strict";
import fs from "node:fs";
import { rulesTest } from "./helpers/rulesTest.ts";
import {
  buildPayPalDonationCustomId,
  isPayPalDonationCustomId,
  parsePayPalDonationCustomId,
} from "../src/paypal-server.ts";
import { extractPayPalDonationCaptureContext } from "../src/paypal-charity-donation.ts";

rulesTest("charity-paypal-donation", async () => {
  const charityRoutesSource = fs.readFileSync("src/routes/charity-routes.ts", "utf8");
  const charityViewSource = fs.readFileSync("src/views/student/CharityView.tsx", "utf8");
  const checkoutSource = fs.readFileSync("src/components/CharityDonationCheckout.tsx", "utf8");
  const adminSource = fs.readFileSync("src/views/teacher/AdminCharityView.tsx", "utf8");

  assert.match(charityRoutesSource, /\/api\/charity\/donations\/paypal\/create-order/);
  assert.match(charityRoutesSource, /\/api\/charity\/donations\/paypal\/capture-order/);
  assert.match(charityRoutesSource, /paymentEnabled:\s*api\.isPayPalConfigured\(\)/);
  assert.match(charityViewSource, /CharityDonationCheckout/);
  assert.match(charityViewSource, /paymentEnabled/);
  assert.doesNotMatch(adminSource, /PayPalButtons|CharityDonationCheckout/);
  assert.match(adminSource, /curriculumUi/);
  assert.doesNotMatch(adminSource, /#07101f/);
  assert.doesNotMatch(adminSource, /#0b1528/);
  assert.doesNotMatch(adminSource, /bg-teal-/);
  assert.doesNotMatch(adminSource, /text-teal-/);
  assert.match(checkoutSource, /createCharityPayPalOrder/);
  assert.match(checkoutSource, /captureCharityPayPalOrder/);

  const customId = buildPayPalDonationCustomId("user-1", "don-abc", 5.5, 55, "USD");
  assert.equal(isPayPalDonationCustomId(customId), true);
  assert.deepEqual(parsePayPalDonationCustomId(customId), {
    userId: "user-1",
    donationId: "don-abc",
    expectedAmount: "5.50",
    payPalCurrency: "USD",
    amountMad: "55.00",
  });

  const captureResult = {
    status: "COMPLETED",
    purchase_units: [
      {
        custom_id: customId,
        payments: {
          captures: [{ id: "cap-1", status: "COMPLETED", amount: { value: "5.50", currency_code: "USD" } }],
        },
      },
    ],
  };
  const ctx = extractPayPalDonationCaptureContext(captureResult);
  assert.equal(ctx.metadata?.donationId, "don-abc");
  assert.equal(ctx.capture?.id, "cap-1");
});
