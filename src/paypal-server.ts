import { logSecurity } from "./security-logger";
import { convertMadAmountForPayPal, getPayPalCheckoutCurrency } from "./paypal-currency";

export type PayPalRuntimeEnv = "sandbox" | "live";

const PAYPAL_REQUEST_TIMEOUT_MS = Number(process.env.PAYPAL_REQUEST_TIMEOUT_MS) || 15_000;

function getPayPalRequestSignal(): AbortSignal {
  return AbortSignal.timeout(PAYPAL_REQUEST_TIMEOUT_MS);
}

export function getPayPalRuntimeEnv(): PayPalRuntimeEnv {
  const value = (process.env.PAYPAL_ENV || "sandbox").trim().toLowerCase();
  return value === "live" ? "live" : "sandbox";
}

export function getPayPalApiBaseUrl(): string {
  return getPayPalRuntimeEnv() === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

export function isPayPalConfigured(): boolean {
  return Boolean(process.env.PAYPAL_CLIENT_ID?.trim() && process.env.PAYPAL_CLIENT_SECRET?.trim());
}

function getPayPalCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("PayPal non configuré");
  }
  return { clientId, clientSecret };
}

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

async function getPayPalAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedAccessToken && cachedAccessToken.expiresAt > now + 30_000) {
    return cachedAccessToken.token;
  }

  const { clientId, clientSecret } = getPayPalCredentials();
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch(`${getPayPalApiBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    signal: getPayPalRequestSignal(),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    logPayPalError("OAuth token request failed", { status: response.status, payload });
    throw new Error("Authentification PayPal impossible");
  }

  const token = String(payload.access_token || "");
  const expiresIn = Number(payload.expires_in || 3600);
  if (!token) {
    logPayPalError("OAuth token missing in PayPal response", { payload });
    throw new Error("Token PayPal manquant");
  }

  cachedAccessToken = {
    token,
    expiresAt: now + expiresIn * 1000,
  };
  return token;
}

/** Exposed for PayPal webhook signature verification (same OAuth cache). */
export async function getPayPalAccessTokenForWebhook(): Promise<string> {
  return getPayPalAccessToken();
}

async function paypalRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = await getPayPalAccessToken();
  const response = await fetch(`${getPayPalApiBaseUrl()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: getPayPalRequestSignal(),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    logPayPalError("PayPal API request failed", {
      method,
      path,
      status: response.status,
      payload,
    });
    const issue = payload?.details?.[0]?.issue;
    if (issue === "CURRENCY_NOT_SUPPORTED") {
      throw new Error("PayPal Live n'accepte pas le dirham (MAD). Le paiement sera converti en USD.");
    }
    const message = payload?.message || payload?.details?.[0]?.description || "Erreur PayPal";
    throw new Error(message);
  }

  return payload as T;
}

export function buildPayPalCustomId(
  userId: string,
  courseId: number,
  payPalAmount: number,
  amountMad: number,
  payPalCurrency: string,
): string {
  const customId = JSON.stringify({
    u: userId,
    c: courseId,
    e: formatPayPalAmount(payPalAmount),
    p: payPalCurrency,
    m: formatPayPalAmount(amountMad),
  });
  if (customId.length > 127) {
    throw new Error("PayPal custom_id trop long");
  }
  return customId;
}

export function parsePayPalCustomId(
  customId: string | undefined,
): { userId: string; courseId: number; expectedAmount?: string; payPalCurrency?: string; amountMad?: string } | null {
  if (!customId?.trim()) return null;
  try {
    const parsed = JSON.parse(customId);
    const userId = String(parsed?.u ?? parsed?.userId ?? "").trim();
    const courseId = Number(parsed?.c ?? parsed?.courseId);
    const expectedAmount = parsed?.e ?? parsed?.expectedAmount;
    const payPalCurrency = parsed?.p ?? parsed?.payPalCurrency;
    const amountMad = parsed?.m ?? parsed?.amountMad;
    if (!userId || !courseId || Number.isNaN(courseId)) return null;
    return {
      userId,
      courseId,
      expectedAmount: expectedAmount != null ? String(expectedAmount) : undefined,
      payPalCurrency: payPalCurrency != null ? String(payPalCurrency).trim().toUpperCase() : undefined,
      amountMad: amountMad != null ? String(amountMad) : undefined,
    };
  } catch {
    return null;
  }
}

export function formatPayPalAmount(value: number): string {
  return value.toFixed(2);
}

function getPayPalApplicationContext() {
  const appUrl = (process.env.APP_URL || "https://axelmond.com").replace(/\/$/, "");
  return {
    brand_name: "Performance Académique",
    user_action: "PAY_NOW" as const,
    shipping_preference: "NO_SHIPPING" as const,
    landing_page: "NO_PREFERENCE" as const,
    return_url: `${appUrl}/?payment=success`,
    cancel_url: `${appUrl}/?payment=cancel`,
  };
}

export async function createPayPalOrder(params: {
  courseId: number;
  courseTitle: string;
  courseDescription?: string | null;
  amountMad: number;
  userId: string;
}): Promise<{ id: string; currency: string; amount: string; amountMad: string }> {
  if (params.amountMad <= 0) {
    throw new Error("PAYPAL_AMOUNT_INVALID");
  }
  const payPalCurrency = getPayPalCheckoutCurrency();
  const payPalAmount = convertMadAmountForPayPal(params.amountMad);
  const customId = buildPayPalCustomId(params.userId, params.courseId, payPalAmount, params.amountMad, payPalCurrency);
  const payload = await paypalRequest<{ id?: string }>("POST", "/v2/checkout/orders", {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: `course-${params.courseId}`,
        custom_id: customId,
        description: params.courseTitle.slice(0, 127),
        amount: {
          currency_code: payPalCurrency,
          value: formatPayPalAmount(payPalAmount),
        },
      },
    ],
    application_context: getPayPalApplicationContext(),
  });

  if (!payload.id) {
    logPayPalError("PayPal create order missing id", { payload });
    throw new Error("Identifiant de commande PayPal manquant");
  }

  return {
    id: payload.id,
    currency: payPalCurrency,
    amount: formatPayPalAmount(payPalAmount),
    amountMad: formatPayPalAmount(params.amountMad),
  };
}

export async function capturePayPalOrder(orderId: string): Promise<any> {
  return paypalRequest("POST", `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {});
}

export async function getPayPalOrder(orderId: string): Promise<any> {
  return paypalRequest("GET", `/v2/checkout/orders/${encodeURIComponent(orderId)}`);
}

export function logPayPalError(message: string, details: Record<string, unknown>) {
  logSecurity("ERROR", message, { provider: "paypal", ...details });
}
