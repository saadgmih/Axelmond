import dotenv from "dotenv";
import { createPayPalOrder, getPayPalRuntimeEnv, isPayPalConfigured } from "../src/paypal-server.ts";

dotenv.config();

async function main() {
  console.log("configured", isPayPalConfigured(), "env", getPayPalRuntimeEnv());
  try {
    const order = await createPayPalOrder({
      courseId: 1,
      courseTitle: "Programmation en C++",
      amountMad: 128,
      userId: "test-user",
    });
    console.log("ORDER_OK", order.id, order.currency, order.amount, order.amountMad);
  } catch (err) {
    console.log("ORDER_FAIL", err?.message || err);
  }
}

main();
