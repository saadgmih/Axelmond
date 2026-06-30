import { getPayPalRuntimeEnv } from "./paypal-server";

/** Explicit PayPal script hosts (no subdomain wildcards). */
export const PAYPAL_CSP_SCRIPT_SRC = [
  "https://www.paypal.com",
  "https://www.sandbox.paypal.com",
  "https://www.paypalobjects.com",
] as const;

/** Explicit PayPal iframe targets — hardened: no https://*.paypal.com wildcard. */
export const PAYPAL_CSP_FRAME_SRC = [
  "https://www.paypal.com",
  "https://www.sandbox.paypal.com",
  "https://checkout.paypal.com",
  "https://checkout.sandbox.paypal.com",
] as const;

export const PAYPAL_CSP_IMG_SRC = [
  "https://www.paypal.com",
  "https://www.sandbox.paypal.com",
  "https://www.paypalobjects.com",
] as const;

export const PAYPAL_CSP_FORM_ACTION = ["https://www.paypal.com", "https://www.sandbox.paypal.com"] as const;

/** PayPal REST + SDK connect targets for the active runtime environment. */
export function getPayPalCspConnectSrc(): string[] {
  const env = getPayPalRuntimeEnv();
  const shared = [
    "https://www.paypal.com",
    "https://www.sandbox.paypal.com",
    "https://api-m.paypal.com",
    "https://api-m.sandbox.paypal.com",
  ];
  if (env === "live") {
    return shared;
  }
  return shared;
}

export const UPLOADTHING_CSP_FRAME_SRC = [
  "https://uploadthing.com",
  "https://*.uploadthing.com",
  "https://ufs.sh",
  "https://*.ufs.sh",
  "https://utfs.io",
  "https://*.utfs.io",
] as const;

export const GOOGLE_MAPS_CSP_FRAME_SRC = ["https://www.google.com", "https://maps.google.com"] as const;

export function buildCspFrameSrc(): string[] {
  return ["'self'", ...PAYPAL_CSP_FRAME_SRC, ...UPLOADTHING_CSP_FRAME_SRC, ...GOOGLE_MAPS_CSP_FRAME_SRC];
}
