import { useEffect, useState } from "react";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Lock,
  Sparkles,
  Tag,
  X,
} from "lucide-react";
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
        if (active) setConfigError(err?.message || "PayPal indisponible pour le moment.");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!course) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && step === "form" && !isProcessing) onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [course, onClose, step, isProcessing]);

  if (!course) return null;

  const handleApplyPromo = () => {
    setPromoError("");
    setPromoSuccess("");
    if (promoCode.trim().toUpperCase() === "AXELMOND20") {
      setAppliedDiscount(20);
      setPromoSuccess("Réduction de 20% appliquée.");
    } else if (promoCode.trim() !== "") {
      setPromoError("Code invalide ou expiré.");
    }
  };

  const originalPrice = course.price;
  const finalPrice = originalPrice * (1 - appliedDiscount / 100);
  const savings = originalPrice - finalPrice;

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

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-xl"
      onClick={(event) => {
        if (event.target === event.currentTarget && step === "form" && !isProcessing) onClose();
      }}
    >
      <div className="relative w-full max-w-lg animate-in fade-in zoom-in-95 duration-300">
        <div className="absolute -inset-px rounded-[28px] bg-gradient-to-br from-indigo-500/40 via-violet-500/20 to-cyan-500/30 blur-sm" />

        <div className="relative max-h-[92vh] overflow-hidden rounded-[28px] border border-white/10 bg-slate-950 shadow-2xl">
          {step === "form" && (
            <>
              <div className="relative overflow-hidden border-b border-white/10 px-6 pb-6 pt-6 text-white">
                <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-indigo-500/20 blur-3xl" />
                <div className="absolute -left-6 bottom-0 h-28 w-28 rounded-full bg-violet-500/10 blur-2xl" />

                <button
                  id="close-payment-modal"
                  type="button"
                  onClick={onClose}
                  className="absolute right-4 top-4 rounded-xl border border-white/10 p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Fermer"
                >
                  <X className="h-4 w-4" />
                </button>

                <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/30 bg-indigo-500/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-indigo-200">
                  <Lock className="h-3 w-3" />
                  Paiement sécurisé
                </span>

                <h2 className="relative mt-4 text-2xl font-black tracking-tight">Activer votre abonnement</h2>
                <p className="relative mt-2 text-sm leading-relaxed text-slate-400">
                  Accès complet au module{" "}
                  <span className="font-semibold text-white">{course.title}</span>
                </p>
              </div>

              <div className="max-h-[calc(92vh-180px)] space-y-5 overflow-y-auto px-6 py-6">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 space-y-2">
                      <p className="text-sm font-black text-white">Abonnement mensuel</p>
                      <p className="text-xs text-slate-400">Résiliable en 1 clic à tout moment</p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <span className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold text-slate-300">
                          <BookOpen className="h-3 w-3 text-indigo-300" />
                          {course.credits} ECTS
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold text-slate-300">
                          <Clock className="h-3 w-3 text-indigo-300" />
                          {course.duration}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      {appliedDiscount > 0 && (
                        <p className="text-xs font-semibold text-slate-500 line-through">
                          {originalPrice.toFixed(2)}€
                        </p>
                      )}
                      <p className="text-3xl font-black tracking-tight text-indigo-300">
                        {finalPrice.toFixed(2)}€
                      </p>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">/ mois</p>
                      {appliedDiscount > 0 && (
                        <span className="mt-2 inline-flex rounded-lg bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                          -{savings.toFixed(2)}€
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Code promo
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Ex: AXELMOND20"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleApplyPromo()}
                        className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-3 font-mono text-sm uppercase text-white placeholder:text-slate-600 focus:border-indigo-400/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleApplyPromo}
                      className="shrink-0 rounded-xl border border-indigo-400/30 bg-indigo-500/15 px-4 py-3 text-xs font-bold text-indigo-200 transition-colors hover:bg-indigo-500/25"
                    >
                      Appliquer
                    </button>
                  </div>
                  {promoError && (
                    <p className="text-xs font-semibold text-red-400">{promoError}</p>
                  )}
                  {promoSuccess && (
                    <p className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                      <Sparkles className="h-3.5 w-3.5" />
                      {promoSuccess}
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Payer avec PayPal
                  </p>

                  {configError && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">
                      {configError}
                    </div>
                  )}

                  {!paypalConfig && !configError && (
                    <div className="flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-8">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
                      <p className="text-sm font-medium text-slate-400">Chargement PayPal...</p>
                    </div>
                  )}

                  {paypalConfig && (
                    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white p-3 shadow-inner">
                      <PayPalScriptProvider
                        options={{
                          clientId: paypalConfig.clientId,
                          currency: "EUR",
                          intent: "capture",
                          components: "buttons",
                        }}
                      >
                        <div className="min-h-[132px]">
                          <PayPalButtons
                            style={{
                              layout: "vertical",
                              color: "gold",
                              shape: "rect",
                              label: "paypal",
                              height: 48,
                              tagline: false,
                            }}
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
                            onError={() => {
                              setPaymentError("Erreur PayPal. Veuillez réessayer.");
                            }}
                            onCancel={() => {
                              setPaymentError("Paiement annulé.");
                            }}
                          />
                        </div>
                      </PayPalScriptProvider>
                    </div>
                  )}

                  {paymentError && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-semibold text-red-300">
                      {paymentError}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3.5 text-sm font-bold text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                >
                  Annuler
                </button>

                <p className="flex items-center justify-center gap-2 text-center text-[10px] font-medium text-slate-500">
                  <Lock className="h-3.5 w-3.5" />
                  Transaction chiffrée via PayPal Checkout
                </p>
              </div>
            </>
          )}

          {step === "loading" && (
            <div className="space-y-6 px-8 py-14 text-center">
              <div className="relative mx-auto h-20 w-20">
                <div className="absolute inset-0 rounded-full border-4 border-white/10" />
                <div className="absolute inset-0 animate-spin rounded-full border-4 border-indigo-400 border-t-transparent" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">Validation en cours</h3>
                <p className="mx-auto mt-2 max-w-xs text-sm text-slate-400">
                  Capture sécurisée de votre paiement PayPal. Ne fermez pas cette fenêtre.
                </p>
              </div>
            </div>
          )}

          {step === "success" && (
            <div className="space-y-6 px-8 py-12 text-center animate-in zoom-in-95 duration-300">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/15 text-emerald-300 shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <div>
                <h3 className="text-2xl font-black tracking-tight text-white">Paiement confirmé</h3>
                <p className="mt-2 text-sm text-slate-400">
                  Votre abonnement au module{" "}
                  <strong className="font-semibold text-white">{course.title}</strong> est actif.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-transform hover:scale-[1.02]"
              >
                Accéder au module
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
