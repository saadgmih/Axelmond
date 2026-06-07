import { logSecurity } from "./security-logger";
import { PLATFORM_CURRENCY_CODE } from "./utils/morocco-locale";

export type PayPalRuntimeEnv = "sandbox" | "live";

export function getPayPalRuntimeEnv(): PayPalRuntimeEnv {
  const value = (process.env.PAYPAL_ENV || "sandbox").trim().toLowerCase();
  return value === "live" ? "live" : "sandbox";
}

export function getPayPalApiBaseUrl(): string {
  return getPayPalRuntimeEnv() === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

export function isPayPalConfigured(): boolean {
  return Boolean(
    process.env.PAYPAL_CLIENT_ID?.trim()
    && process.env.PAYPAL_CLIENT_SECRET?.trim(),
  );
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

async function paypalRequest<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const token = await getPayPalAccessToken();
  const response = await fetch(`${getPayPalApiBaseUrl()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    logPayPalError("PayPal API request failed", {
      method,
      path,
      status: response.status,
      payload,
    });
    const message = payload?.message || payload?.details?.[0]?.description || "Erreur PayPal";
    throw new Error(message);
  }

  return payload as T;
}

export function buildPayPalCustomId(userId: string, courseId: number): string {
  return JSON.stringify({ userId, courseId });
}

export function parsePayPalCustomId(customId: string | undefined): { userId: string; courseId: number } | null {
  if (!customId?.trim()) return null;
  try {
    const parsed = JSON.parse(customId);
    const userId = String(parsed?.userId || "").trim();
    const courseId = Number(parsed?.courseId);
    if (!userId || !courseId || Number.isNaN(courseId)) return null;
    return { userId, courseId };
  } catch {
    return null;
  }
}

export function formatPayPalAmount(value: number): string {
  return value.toFixed(2);
}

export async function createPayPalOrder(params: {
  courseId: number;
  courseTitle: string;
  courseDescription?: string | null;
  amount: number;
  userId: string;
}): Promise<{ id: string }> {
  const payload = await paypalRequest<{ id?: string }>("POST", "/v2/checkout/orders", {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: `course-${params.courseId}`,
        custom_id: buildPayPalCustomId(params.userId, params.courseId),
        description: params.courseTitle.slice(0, 127),
        amount: {
          currency_code: PLATFORM_CURRENCY_CODE,
          value: formatPayPalAmount(params.amount),
        },
      },
    ],
    application_context: {
      brand_name: "Axelmond Research Labs",
      user_action: "PAY_NOW",
      shipping_preference: "NO_SHIPPING",
    },
  });

  if (!payload.id) {
    logPayPalError("PayPal create order missing id", { payload });
    throw new Error("Identifiant de commande PayPal manquant");
  }

  return { id: payload.id };
}

export async function capturePayPalOrder(orderId: string): Promise<any> {
  return paypalRequest("POST", `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {});
}

export function logPayPalError(message: string, details: Record<string, unknown>) {
  logSecurity("ERROR", message, { provider: "paypal", ...details });
}
