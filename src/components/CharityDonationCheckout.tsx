import { useEffect, useRef, useState } from "react";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { CreditCard, Sparkles } from "lucide-react";
import { api, getFreshSessionToken } from "../api";
import { getClientErrorMessage } from "../client-errors";
import { PLATFORM_CURRENCY_CODE } from "../utils/morocco-locale";

type PayPalConfig = {
  clientId: string;
  env: "sandbox" | "live";
  currency: string;
};

const paypalButtonStyle = {
  layout: "vertical" as const,
  shape: "rect" as const,
  height: 44,
  tagline: false,
  color: "blue" as const,
  label: "paypal" as const,
};

interface CharityDonationCheckoutProps {
  campaignId: string;
  amountMad: number;
  disabled?: boolean;
  onSuccess: () => void | Promise<void>;
}

export function CharityDonationCheckout({
  campaignId,
  amountMad,
  disabled = false,
  onSuccess,
}: CharityDonationCheckoutProps) {
  const [paypalConfig, setPaypalConfig] = useState<PayPalConfig | null>(null);
  const [configError, setConfigError] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderPreview, setOrderPreview] = useState<string | null>(null);
  const pendingDonationIdRef = useRef("");

  const amountValid = Number.isFinite(amountMad) && amountMad > 0;
  const checkoutDisabled = disabled || !amountValid || isProcessing;

  useEffect(() => {
    if (!amountValid) {
      setPaypalConfig(null);
      setConfigError("");
      setOrderPreview(null);
      return;
    }
    let active = true;
    api
      .getPayPalConfig()
      .then((config) => {
        if (active) setPaypalConfig(config);
      })
      .catch((err: unknown) => {
        if (active) setConfigError(getClientErrorMessage(err, "PayPal indisponible pour le moment."));
      });
    return () => {
      active = false;
    };
  }, [amountValid]);

  const handleCreateOrder = async () => {
    setPaymentError("");
    pendingDonationIdRef.current = "";
    const token = await getFreshSessionToken();
    if (!token) throw new Error("Session expirée. Reconnectez-vous.");

    const order = await api.createCharityPayPalOrder({ campaignId, amount: amountMad });
    pendingDonationIdRef.current = order.donation?.id || "";
    if (order.amount && order.currency) {
      setOrderPreview(`${order.amount} ${order.currency}`);
    }
    return order.id;
  };

  const handleApprove = async (orderId: string) => {
    const donationId = pendingDonationIdRef.current;
    if (!donationId) {
      setPaymentError("Don introuvable. Veuillez réessayer.");
      return;
    }
    setIsProcessing(true);
    setPaymentError("");
    try {
      await api.captureCharityPayPalOrder({ orderId, donationId });
      await onSuccess();
    } catch (err: unknown) {
      setPaymentError(getClientErrorMessage(err, "Impossible de finaliser le paiement PayPal."));
    } finally {
      setIsProcessing(false);
    }
  };

  if (!amountValid) {
    return (
      <p className="text-xs font-medium text-slate-500">
        Saisissez un montant en MAD pour afficher le paiement PayPal.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {configError && (
        <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-300">
          {configError}
        </p>
      )}

      {!paypalConfig && !configError && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-700/60 bg-slate-950/40 py-5">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-600/80 border-t-transparent" />
          <span className="text-xs font-medium text-slate-400">Initialisation PayPal…</span>
        </div>
      )}

      {paypalConfig && (
        <div className="axelmond-paypal-shell rounded-xl border border-emerald-800/40 bg-slate-950/50 p-3">
          {paypalConfig.currency !== PLATFORM_CURRENCY_CODE && (
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-emerald-800/40 bg-emerald-950/40 px-3 py-2">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
              <p className="text-[11px] leading-relaxed text-emerald-100/90">
                Don affiché en <span className="font-semibold text-white">{PLATFORM_CURRENCY_CODE}</span>. Encaissement
                sécurisé en <span className="font-semibold text-emerald-200">{paypalConfig.currency}</span>
                {orderPreview ? ` (~${orderPreview})` : ""}.
              </p>
            </div>
          )}

          <PayPalScriptProvider
            key={`${campaignId}-${amountMad}-${paypalConfig.clientId}`}
            options={{
              clientId: paypalConfig.clientId,
              currency: paypalConfig.currency,
              intent: "capture",
              components: "buttons",
              disableFunding: ["venmo", "paylater", "credit"],
            }}
          >
            <PayPalButtons
              style={paypalButtonStyle}
              disabled={checkoutDisabled}
              createOrder={async () => {
                try {
                  return await handleCreateOrder();
                } catch (err: unknown) {
                  const message = getClientErrorMessage(err, "Impossible de créer la commande PayPal.");
                  setPaymentError(message);
                  throw err;
                }
              }}
              onApprove={async (data) => {
                if (!data.orderID) {
                  setPaymentError("Commande PayPal invalide.");
                  return;
                }
                await handleApprove(data.orderID);
              }}
              onError={() => {
                setPaymentError(
                  (current) => current || "Erreur PayPal. Veuillez réessayer ou utiliser un autre moyen de paiement.",
                );
              }}
              onCancel={() => {
                setPaymentError("Paiement annulé.");
              }}
            />
          </PayPalScriptProvider>

          <p className="mt-3 flex items-center justify-center gap-1.5 text-[10px] font-medium text-slate-500">
            <CreditCard className="h-3 w-3 text-emerald-400/80" />
            Carte ou compte PayPal — traitement chiffré
          </p>
        </div>
      )}

      {paymentError && (
        <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-300">
          {paymentError}
        </p>
      )}
    </div>
  );
}
