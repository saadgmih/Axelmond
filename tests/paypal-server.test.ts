import assert from "node:assert/strict";
import {
  buildPayPalCustomId,
  formatPayPalAmount,
  getPayPalRuntimeEnv,
  parsePayPalCustomId,
} from "../src/paypal-server.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("paypal-server", () => {
  const originalEnv = process.env.PAYPAL_ENV;

  try {
    process.env.PAYPAL_ENV = "Sandbox";
    assert.equal(getPayPalRuntimeEnv(), "sandbox");

    process.env.PAYPAL_ENV = "live";
    assert.equal(getPayPalRuntimeEnv(), "live");

    assert.equal(formatPayPalAmount(19.5), "19.50");

    const customId = buildPayPalCustomId("user-123", 42, 12.8, 128, "USD");
    assert.deepEqual(parsePayPalCustomId(customId), {
      userId: "user-123",
      courseId: 42,
      expectedAmount: "12.80",
      payPalCurrency: "USD",
      amountMad: "128.00",
    });

    const customIdWithPromo = buildPayPalCustomId("user-123", 42, 18.8, 188, "USD", "PROMO-123");
    assert.deepEqual(parsePayPalCustomId(customIdWithPromo)?.promoReservationReference, "PROMO-123");
    const uuidCustomId = buildPayPalCustomId("a1b2c3d4-e5f6-7890-abcd-ef1234567890", 12, 12.8, 128, "USD");
    assert.ok(uuidCustomId.length <= 127, `custom_id length ${uuidCustomId.length} exceeds PayPal limit`);
    assert.deepEqual(
      parsePayPalCustomId(
        '{"userId":"legacy","courseId":1,"expectedAmount":"1.00","payPalCurrency":"USD","amountMad":"10.00"}',
      ),
      {
        userId: "legacy",
        courseId: 1,
        expectedAmount: "1.00",
        payPalCurrency: "USD",
        amountMad: "10.00",
      },
    );
    assert.equal(parsePayPalCustomId("invalid"), null);

    console.log("PayPal server helper tests passed");
  } finally {
    if (originalEnv === undefined) delete process.env.PAYPAL_ENV;
    else process.env.PAYPAL_ENV = originalEnv;
  }
});
