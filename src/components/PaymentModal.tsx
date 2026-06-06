import React, { useEffect, useState } from "react";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { X, Shield, CheckCircle, Ticket } from "lucide-react";
import { Course } from "../types";
import type { AppUser } from "./AuthScreen";
import { api } from "../api";

interface PaymentModalProps {
  course: Course | null;
  onClose: () => void;
  onSuccess: (courseId: number, amountPaid: number, syncedUser?: AppUser) => void | Promise<void>;
}

type PayPalConfig = {
  clientId: string;
  env: "sandbox" | "live";
};

export default function PaymentModal({ course, onClose, onSuccess }: PaymentModalProps) {
  const [promoCode, setPromoCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [promoError, setPromoError] = useState("");
  const [promoSuccess, setPromoSuccess] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<"form" | "loading" | "success">("form");
  const [paypalConfig, setPaypalConfig] = useState<PayPalConfig | null>(null);
  const [configError, setConfigError] = useState("");

  useEffect(() => {
    let active = true;
    api.getPayPalConfig()
      .then((config) => {
        if (active) setPaypalConfig(config);
      })
      .catch((err: any) => {
        if (active) {
          setConfigError(err?.message || "PayPal indisponible pour le moment.");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  if (!course) return null;

  const handleApplyPromo = () => {
    setPromoError("");
    setPromoSuccess("");
    if (promoCode.trim().toUpperCase() === "AXELMOND20") {
      setAppliedDiscount(20);
      setPromoSuccess("Code promo validé ! -20% sur votre abonnement.");
    } else if (promoCode.trim() !== "") {
      setPromoError("Code invalide ou expiré.");
    }
  };

  const originalPrice = course.price;
  const finalPrice = originalPrice * (1 - appliedDiscount / 100);

  const handlePayPalApprove = async (orderId: string) => {
    setStep("loading");
    setIsProcessing(true);
    setPaymentError("");

    try {
      const result = await api.capturePayPalOrder(orderId, course.id);
      await onSuccess(course.id, result.invoice?.amount ?? course.price, result.user);
      setStep("success");
    } catch (err: any) {
      setPaymentError(err?.message || "Impossible de finaliser le paiement PayPal.");
      setStep("form");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSuccessClose = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transition-all transform scale-100 border border-slate-100 animate-in fade-in duration-200 max-h-[90vh] overflow-y-auto">
        {step === "form" && (
          <div>
            <div className="bg-slate-900 p-6 text-white relative">
              <button
                id="close-payment-modal"
                onClick={onClose}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors p-1 rounded-full hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
              <span className="text-xs text-indigo-400 font-bold uppercase tracking-wider bg-indigo-950 px-2.5 py-1 rounded inline-block mb-3 border border-indigo-900">
                Paiement sécurisé
              </span>
              <h2 className="text-2xl font-bold leading-tight mb-1">Activer votre abonnement</h2>
              <p className="text-slate-400 text-sm">
                Débloquez l&apos;accès complet au module : <span className="text-white font-medium">{course.title}</span>.
              </p>
            </div>

            <div className="p-6 space-y-5">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-slate-800 text-base">Abonnement Mensuel</p>
                  <p className="text-xs text-slate-500">Résiliable en 1 clic à tout moment</p>
                </div>
                <div className="text-right shrink-0">
                  {appliedDiscount > 0 && (
                    <p className="text-sm text-slate-400 line-through font-medium">{originalPrice.toFixed(2)}€</p>
                  )}
                  <p className="text-2xl font-black text-indigo-600">
                    {finalPrice.toFixed(2)}€
                    <span className="text-xs text-slate-400 font-semibold"> / mois</span>
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Code Promo</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Ticket className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Ex: AXELMOND20"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-600 uppercase font-mono text-slate-800"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold font-mono text-slate-700 hover:bg-slate-50"
                  >
                    Appliquer
                  </button>
                </div>
                {promoError && <p className="text-xs font-semibold text-red-500">{promoError}</p>}
                {promoSuccess && <p className="text-xs font-semibold text-emerald-600">{promoSuccess}</p>}
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-3">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Payer avec PayPal</p>
                {configError && (
                  <p className="text-sm font-semibold text-red-500">{configError}</p>
                )}
                {!paypalConfig && !configError && (
                  <p className="text-sm text-slate-500">Chargement du module PayPal...</p>
                )}
                {paypalConfig && (
                  <PayPalScriptProvider
                    options={{
                      clientId: paypalConfig.clientId,
                      currency: "EUR",
                      intent: "capture",
                      components: "buttons",
                    }}
                  >
                    <div className="min-h-[120px]">
                      <PayPalButtons
                        style={{ layout: "vertical", color: "gold", shape: "rect", label: "paypal", height: 45 }}
                        disabled={isProcessing}
                        createOrder={async () => {
                          setPaymentError("");
                          const order = await api.createPayPalOrder(course.id);
                          return order.id;
                        }}
                        onApprove={async (data) => {
                          if (!data.orderID) {
                            setPaymentError("Commande PayPal invalide.");
                            return;
                          }
                          await handlePayPalApprove(data.orderID);
                        }}
                        onError={(err) => {
                          console.error("[paypal] checkout error", err);
                          setPaymentError("Erreur PayPal. Veuillez réessayer ou utiliser un autre moyen de paiement.");
                        }}
                        onCancel={() => {
                          setPaymentError("Paiement annulé.");
                        }}
                      />
                    </div>
                  </PayPalScriptProvider>
                )}
                {paymentError && <p className="text-xs font-semibold text-red-500">{paymentError}</p>}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all text-center"
              >
                Annuler
              </button>

              <p className="text-center text-[10px] text-slate-400 flex items-center justify-center gap-1">
                <Shield className="w-3.5 h-3.5" /> Paiement sécurisé via PayPal Checkout.
              </p>
            </div>
          </div>
        )}

        {step === "loading" && (
          <div className="p-12 text-center space-y-6">
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
              <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">Validation de la transaction...</h3>
              <p className="text-slate-500 text-sm mt-1.5 max-w-xs mx-auto">
                Capture sécurisée de votre paiement PayPal. Veuillez patienter.
              </p>
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="p-10 text-center space-y-6 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 shadow-md border border-emerald-200">
              <CheckCircle className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 leading-tight">Merci pour votre confiance !</h3>
              <p className="text-slate-500 text-sm mt-2">
                Votre abonnement mensuel au module <strong className="text-slate-800 font-semibold">{course.title}</strong> a bien été activé.
              </p>
            </div>
            <button
              onClick={handleSuccessClose}
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm shadow-lg transition-transform hover:scale-105"
            >
              Accéder au module immédiatement
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
