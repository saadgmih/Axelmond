import assert from "node:assert/strict";
import {
  buildPayPalCustomId,
  formatPayPalAmount,
  getPayPalRuntimeEnv,
  parsePayPalCustomId,
} from "../src/paypal-server.ts";

const originalEnv = process.env.PAYPAL_ENV;

try {
  process.env.PAYPAL_ENV = "Sandbox";
  assert.equal(getPayPalRuntimeEnv(), "sandbox");

  process.env.PAYPAL_ENV = "live";
  assert.equal(getPayPalRuntimeEnv(), "live");

  assert.equal(formatPayPalAmount(19.5), "19.50");

  const customId = buildPayPalCustomId("user-123", 42, 128);
  assert.deepEqual(parsePayPalCustomId(customId), {
    userId: "user-123",
    courseId: 42,
    expectedAmount: "128.00",
  });
  assert.equal(parsePayPalCustomId("invalid"), null);

  console.log("PayPal server helper tests passed");
} finally {
  if (originalEnv === undefined) delete process.env.PAYPAL_ENV;
  else process.env.PAYPAL_ENV = originalEnv;
}
