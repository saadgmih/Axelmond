import dotenv from "dotenv";
import { agentDebugLog } from "../src/agent-debug-log.ts";
import { buildPayPalCustomId, createPayPalOrder } from "../src/paypal-server.ts";

dotenv.config();

const sampleUserId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

function legacyCustomId(userId, courseId, payPalAmount, amountMad, currency) {
  return JSON.stringify({
    userId,
    courseId,
    expectedAmount: payPalAmount.toFixed(2),
    payPalCurrency: currency,
    amountMad: amountMad.toFixed(2),
  });
}

async function probePayPalCustomId(customId, label, hypothesisId) {
  agentDebugLog({
    hypothesisId,
    location: "scripts/debug-paypal-create-order.mjs:probe",
    message: "custom_id probe",
    data: { label, customIdLength: customId.length, withinPayPalLimit: customId.length <= 127 },
    runId: "pre-fix",
  });

  const tokenRes = await fetch(
    `${process.env.PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com"}/v1/oauth2/token`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    },
  );
  const tokenPayload = await tokenRes.json();
  const accessToken = tokenPayload.access_token;
  if (!accessToken) {
    agentDebugLog({
      hypothesisId: "H4",
      location: "scripts/debug-paypal-create-order.mjs:oauth",
      message: "oauth failed",
      data: { status: tokenRes.status },
      runId: "pre-fix",
    });
    return;
  }

  const orderRes = await fetch(
    `${process.env.PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com"}/v2/checkout/orders`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          amount: { currency_code: "USD", value: "12.80" },
          custom_id: customId,
          description: "Programmation en C++",
        }],
      }),
    },
  );
  const orderPayload = await orderRes.json();
  agentDebugLog({
    hypothesisId,
    location: "scripts/debug-paypal-create-order.mjs:paypal-response",
    message: label,
    data: {
      ok: orderRes.ok,
      status: orderRes.status,
      paypalMessage: orderPayload?.message || orderPayload?.details?.[0]?.description || null,
      issue: orderPayload?.details?.[0]?.issue || null,
    },
    runId: "pre-fix",
  });
}

async function main() {
  const legacyId = legacyCustomId(sampleUserId, 12, 12.8, 128, "USD");
  const compactId = buildPayPalCustomId(sampleUserId, 12, 12.8, 128, "USD");

  await probePayPalCustomId(legacyId, "legacy custom_id", "H1");
  await probePayPalCustomId(compactId, "compact custom_id", "H1");

  for (const [currency, value] of [["MAD", "128.00"], ["USD", "12.80"]]) {
    const tokenRes = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    const accessToken = (await tokenRes.json()).access_token;
    const orderRes = await fetch("https://api-m.paypal.com/v2/checkout/orders", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ intent: "CAPTURE", purchase_units: [{ amount: { currency_code: currency, value } }] }),
    });
    const orderPayload = await orderRes.json();
    agentDebugLog({
      hypothesisId: "H2",
      location: "scripts/debug-paypal-create-order.mjs:currency-probe",
      message: `currency probe ${currency}`,
      data: {
        ok: orderRes.ok,
        status: orderRes.status,
        paypalMessage: orderPayload?.message || orderPayload?.details?.[0]?.description || null,
        issue: orderPayload?.details?.[0]?.issue || null,
      },
      runId: "pre-fix",
    });
  }

  try {
    const order = await createPayPalOrder({
      courseId: 12,
      courseTitle: "Programmation en C++",
      amountMad: 128,
      userId: sampleUserId,
    });
    agentDebugLog({
      hypothesisId: "H2",
      location: "scripts/debug-paypal-create-order.mjs:createPayPalOrder",
      message: "createPayPalOrder success",
      data: { orderId: order.id, currency: order.currency, amount: order.amount },
      runId: "pre-fix",
    });
  } catch (err) {
    agentDebugLog({
      hypothesisId: "H2",
      location: "scripts/debug-paypal-create-order.mjs:createPayPalOrder",
      message: "createPayPalOrder failed",
      data: { error: String(err?.message || err) },
      runId: "pre-fix",
    });
  }
}

main();
