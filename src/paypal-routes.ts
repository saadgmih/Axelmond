import type { Express } from "express";
import { getPayPalCheckoutCurrency } from "./paypal-currency";
import { getPayPalRuntimeEnv, isPayPalConfigured } from "./paypal-server";

export function registerPayPalConfigRoute(app: Express): void {
  app.get("/api/paypal/config", (_req, res) => {
    const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
    if (!clientId || !isPayPalConfigured()) {
      res.status(503).json({ error: "PayPal non configuré" });
      return;
    }

    res.json({
      clientId,
      env: getPayPalRuntimeEnv(),
      currency: getPayPalCheckoutCurrency(),
    });
  });
}
