import { prisma } from "./db";
import { formatPayPalAmount, logPayPalError, parsePayPalDonationCustomId } from "./paypal-server";
import { convertMadAmountForPayPal, getPayPalCheckoutCurrency } from "./paypal-currency";
import { donationSnapshot } from "./server/mappers/charity-mappers";

export type PayPalCaptureDonationInput = {
  orderId: string;
  captureResult: any;
  reqIp?: string;
  auditAction: string;
  expectedUserId?: string;
  expectedDonationId?: string;
};

export type PayPalCaptureDonationResult =
  | {
      ok: true;
      duplicate: boolean;
      userId: string;
      donationId: string;
      donation: ReturnType<typeof donationSnapshot>;
    }
  | {
      ok: false;
      status: number;
      error: string;
      code?: string;
    };

export const PAYPAL_DONATION_CAPTURE_MESSAGES: Record<string, string> = {
  PAYPAL_METADATA_MISSING: "Commande PayPal invalide",
  PAYPAL_USER_MISMATCH: "Commande PayPal invalide pour ce compte",
  PAYPAL_DONATION_MISMATCH: "Commande PayPal invalide pour ce don",
  DONATION_NOT_FOUND: "Don introuvable",
  DONATION_NOT_PAYABLE: "Ce don ne peut plus être payé",
  PAYPAL_CAPTURE_INCOMPLETE: "Paiement PayPal non finalisé",
  PAYPAL_AMOUNT_MISMATCH: "Montant de paiement incorrect",
};

export function toPayPalDonationCaptureClientResponse(result: {
  ok: false;
  status: number;
  error: string;
  code?: string;
}) {
  const code = result.code || "PAYPAL_CAPTURE_FAILED";
  return {
    error: PAYPAL_DONATION_CAPTURE_MESSAGES[code] || "Paiement PayPal invalide",
    code,
  };
}

export function extractPayPalDonationCaptureContext(captureResult: any) {
  const purchaseUnit = captureResult?.purchase_units?.[0];
  const metadata = parsePayPalDonationCustomId(purchaseUnit?.custom_id);
  const capture = purchaseUnit?.payments?.captures?.[0];
  return { purchaseUnit, metadata, capture };
}

export async function processPayPalCaptureDonation(
  params: PayPalCaptureDonationInput,
): Promise<PayPalCaptureDonationResult> {
  const { orderId, captureResult, expectedUserId, expectedDonationId } = params;
  const { metadata, capture } = extractPayPalDonationCaptureContext(captureResult);

  if (!metadata) {
    logPayPalError("PayPal donation capture missing metadata", { orderId });
    return { ok: false, status: 400, error: "Commande PayPal invalide", code: "PAYPAL_METADATA_MISSING" };
  }

  if (expectedUserId && metadata.userId !== expectedUserId) {
    logPayPalError("PayPal donation capture user mismatch", { orderId, expectedUserId, metadata });
    return { ok: false, status: 400, error: "Commande PayPal invalide pour ce compte", code: "PAYPAL_USER_MISMATCH" };
  }

  if (expectedDonationId && metadata.donationId !== expectedDonationId) {
    logPayPalError("PayPal donation capture donation mismatch", { orderId, expectedDonationId, metadata });
    return {
      ok: false,
      status: 400,
      error: "Commande PayPal invalide pour ce don",
      code: "PAYPAL_DONATION_MISMATCH",
    };
  }

  const donation = await prisma.donation.findUnique({
    where: { id: metadata.donationId },
    include: { campaign: { select: { id: true, title: true } } },
  });

  if (!donation || donation.userId !== metadata.userId) {
    return { ok: false, status: 404, error: "Don introuvable", code: "DONATION_NOT_FOUND" };
  }

  const captureId = String(capture?.id || orderId);

  if (donation.status === "COMPLETED") {
    if (donation.paymentReference === captureId) {
      return {
        ok: true,
        duplicate: true,
        userId: donation.userId,
        donationId: donation.id,
        donation: donationSnapshot(donation),
      };
    }
    return { ok: false, status: 409, error: "Ce don a déjà été payé", code: "DONATION_NOT_PAYABLE" };
  }

  if (donation.status !== "PENDING") {
    return { ok: false, status: 409, error: "Ce don ne peut plus être payé", code: "DONATION_NOT_PAYABLE" };
  }

  if (captureResult?.status !== "COMPLETED" || capture?.status !== "COMPLETED") {
    logPayPalError("PayPal donation capture incomplete", {
      orderId,
      orderStatus: captureResult?.status,
      captureStatus: capture?.status,
    });
    return { ok: false, status: 400, error: "Paiement PayPal non finalisé", code: "PAYPAL_CAPTURE_INCOMPLETE" };
  }

  const paidAmount = String(capture?.amount?.value || "");
  const paidCurrency = String(capture?.amount?.currency_code || "").toUpperCase();
  const expectedCurrency = (metadata.payPalCurrency || getPayPalCheckoutCurrency()).toUpperCase();
  const expectedAmount = metadata.expectedAmount ?? formatPayPalAmount(convertMadAmountForPayPal(donation.amount));

  if (paidCurrency !== expectedCurrency || paidAmount !== expectedAmount) {
    logPayPalError("PayPal donation capture amount mismatch", {
      orderId,
      donationId: donation.id,
      expectedAmount,
      paidAmount,
      paidCurrency,
    });
    return { ok: false, status: 400, error: "Montant de paiement incorrect", code: "PAYPAL_AMOUNT_MISMATCH" };
  }

  const updated = await prisma.donation.update({
    where: { id: donation.id },
    data: {
      status: "COMPLETED",
      paymentReference: captureId,
    },
    include: { campaign: { select: { id: true, title: true } } },
  });

  return {
    ok: true,
    duplicate: false,
    userId: updated.userId,
    donationId: updated.id,
    donation: donationSnapshot(updated),
  };
}
