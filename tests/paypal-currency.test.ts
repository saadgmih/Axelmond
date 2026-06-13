import assert from "node:assert/strict";
import {
  convertMadAmountForPayPal,
  formatPayPalCheckoutEquivalent,
  getPayPalCheckoutCurrency,
  getPayPalMadConversionRate,
} from "../src/paypal-currency.ts";

const previousCurrency = process.env.PAYPAL_CURRENCY_CODE;
const previousRate = process.env.PAYPAL_MAD_TO_USD_RATE;
delete process.env.PAYPAL_CURRENCY_CODE;
delete process.env.PAYPAL_MAD_TO_USD_RATE;

assert.equal(getPayPalCheckoutCurrency(), "USD");
assert.equal(getPayPalMadConversionRate(), 0.1);
assert.equal(convertMadAmountForPayPal(128), 12.8);
assert.equal(formatPayPalCheckoutEquivalent(128), "12.80 USD");

process.env.PAYPAL_CURRENCY_CODE = "MAD";
assert.equal(convertMadAmountForPayPal(128), 128);

if (previousCurrency !== undefined) process.env.PAYPAL_CURRENCY_CODE = previousCurrency;
else delete process.env.PAYPAL_CURRENCY_CODE;
if (previousRate !== undefined) process.env.PAYPAL_MAD_TO_USD_RATE = previousRate;
else delete process.env.PAYPAL_MAD_TO_USD_RATE;

console.log("PayPal currency conversion tests passed");
