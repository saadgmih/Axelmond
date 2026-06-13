import { useEffect, useRef, useState } from "react";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Lock,
  ShieldCheck,
  Sparkles,
  Tag,
  X,
} from "lucide-react";
import { Course } from "../types";
import type { AppUser } from "./AuthScreen";
import { api, getFreshSessionToken } from "../api";
import { formatCredits, formatMad, PLATFORM_CURRENCY_CODE } from "../utils/morocco-locale";
import { useFocusTrap } from "../hooks/useFocusTrap";

interface PaymentModalProps {
  course: Course | null;
  onClose: () => void;
  onSuccess: (courseId: number, amountPaid: number, syncedUser?: AppUser) => void | Promise<void>;
}

type PayPalConfig = {
  clientId: string;
  env: "sandbox" | "live";
  currency: string;
};

const scrollAreaClass = "overflow-y-auto overscroll-contain";

export default function PaymentModal({ course, onClose, onSuccess }: PaymentModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [promoCode, setPromoCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [promoError, setPromoError] = useState("");
  const [promoSuccess, setPromoSuccess] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<"form" | "loading" | "success">("form");
  const [paypalConfig, setPaypalConfig] = useState<PayPalConfig | null>(null);
  const [configError, setConfigError] = useState("");
  const [orderPreviewAmount, setOrderPreviewAmount] = useState<string | null>(null);

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
    const focusTimer = window.setTimeout(() => {
      document.getElementById("close-payment-modal")?.focus();
    }, 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && step === "form" && !isProcessing) onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [course, onClose, step, isProcessing]);

  useFocusTrap(dialogRef, Boolean(course));

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
      if (!result.user) {
        throw new Error("Inscription non confirmée par le serveur. Contactez le support.");
      }
      await onSuccess(course.id, result.invoice?.amount ?? finalPrice, result.user);
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
      ref={dialogRef}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/80 p-0 backdrop-blur-md sm:items-center sm:p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget && step === "form" && !isProcessing) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
    >
      <div className="w-full max-w-[440px] animate-in fade-in slide-in-from-bottom-4 duration-300 sm:zoom-in-95 sm:slide-in-from-bottom-0">
        <div className="flex max-h-[min(680px,94dvh)] flex-col overflow-hidden rounded-t-[24px] border border-white/10 bg-[#0b1220] shadow-[0_24px_80px_-12px_rgba(0,0,0,0.65)] sm:rounded-[24px]">
          {step === "form" && (
            <>
              {/* Header */}
              <div className="relative shrink-0 border-b border-white/[0.06] px-5 pb-4 pt-5 sm:px-6">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent" />

                <div className="mb-4 flex items-start justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-200">
                    <ShieldCheck className="h-3 w-3" />
                    Paiement sécurisé
                  </span>
                  <button
                    id="close-payment-modal"
                    type="button"
                    onClick={onClose}
                    className="kbd-nav-focus group -mr-1 flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-slate-400 transition-all hover:bg-white/10 hover:text-white"
                    aria-label="Fermer la fenêtre de paiement (Esc)"
                  >
                    <X className="h-4 w-4 transition-transform group-hover:scale-110" />
                  </button>
                </div>

                <h2 id="payment-modal-title" className="text-xl font-bold tracking-tight text-white sm:text-[1.35rem]">
                  Activer votre abonnement
                </h2>
                <p className="mt-1.5 line-clamp-2 text-sm leading-snug text-slate-400">
                  Module{" "}
                  <span className="font-semibold text-slate-200">{course.title}</span>
                </p>
              </div>

              {/* Body */}
              <div className={`flex-1 px-5 py-4 sm:px-6 ${scrollAreaClass}`}>
                <div className="space-y-4">
                  {/* Price card */}
                  <div className="relative overflow-hidden rounded-2xl border border-indigo-400/15 bg-gradient-to-br from-indigo-500/[0.12] via-slate-900/40 to-violet-500/[0.08] p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
                    <div className="flex items-end justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-300/80">
                          Abonnement mensuel
                        </p>
                        <p className="text-xs text-slate-400">Résiliable en 1 clic</p>
                      </div>
                      <div className="shrink-0 text-right">
                        {appliedDiscount > 0 && (
                          <p className="text-xs font-medium text-slate-500 line-through">
                            {formatMad(originalPrice)}
                          </p>
                        )}
                        <div className="flex items-baseline justify-end gap-1">
                          <span className="text-[2rem] font-black leading-none tracking-tight text-white">
                            {formatMad(finalPrice)}
                          </span>
                          <span className="text-[10px] font-bold uppercase text-slate-500">/mois</span>
                        </div>
                        {appliedDiscount > 0 && (
                          <span className="mt-1 inline-flex rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                            Économie {formatMad(savings)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 border-t border-white/[0.06] pt-3">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-black/20 px-2 py-1 text-[10px] font-semibold text-slate-300">
                        <BookOpen className="h-3 w-3 text-indigo-300" />
                        {formatCredits(course.credits)}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-lg bg-black/20 px-2 py-1 text-[10px] font-semibold text-slate-300">
                        <Clock className="h-3 w-3 text-indigo-300" />
                        {course.duration}
                      </span>
                    </div>
                  </div>

                  {/* Promo */}
                  <div className="space-y-2">
                    <label htmlFor="promo-code" className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Code promo
                    </label>
                    <div className="relative">
                      <Tag className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                      <input
                        id="promo-code"
                        type="text"
                        placeholder="AXELMOND20"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleApplyPromo()}
                        className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-[5.5rem] font-mono text-sm uppercase text-white placeholder:text-slate-600 focus:border-indigo-400/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                      <button
                        type="button"
                        onClick={handleApplyPromo}
                        className="absolute right-1 top-1 bottom-1 rounded-lg bg-indigo-600 px-3 text-[11px] font-bold text-white transition-colors hover:bg-indigo-500"
                      >
                        Appliquer
                      </button>
                    </div>
                    {promoError && <p className="text-xs font-medium text-red-400">{promoError}</p>}
                    {promoSuccess && (
                      <p className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                        <Sparkles className="h-3.5 w-3.5" />
                        {promoSuccess}
                      </p>
                    )}
                  </div>

                  {/* PayPal */}
                  <div className="space-y-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Payer avec PayPal
                    </p>

                    {configError && (
                      <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-xs font-medium text-red-300">
                        {configError}
                      </p>
                    )}

                    {!paypalConfig && !configError && (
                      <div className="flex items-center justify-center gap-2.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] py-7">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-400/80 border-t-transparent" />
                        <span className="text-xs font-medium text-slate-400">Initialisation PayPal…</span>
                      </div>
                    )}

                    {paypalConfig && (
                      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#f7f9fc] p-2.5 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.45)]">
                        {paypalConfig.currency !== PLATFORM_CURRENCY_CODE && (
                          <p className="mb-2 px-1 text-[11px] leading-relaxed text-slate-600">
                            Tarif affiché en {PLATFORM_CURRENCY_CODE}. PayPal encaisse en{" "}
                            <span className="font-semibold">{paypalConfig.currency}</span>
                            {typeof orderPreviewAmount === "string" ? ` (~${orderPreviewAmount})` : ""}.
                          </p>
                        )}
                        <PayPalScriptProvider
                          options={{
                            clientId: paypalConfig.clientId,
                            currency: paypalConfig.currency,
                            intent: "capture",
                            components: "buttons",
                          }}
                        >
                          <div className="min-h-[120px] px-0.5">
                            <PayPalButtons
                              style={{
                                layout: "vertical",
                                color: "gold",
                                shape: "rect",
                                label: "paypal",
                                height: 45,
                                tagline: false,
                              }}
                              disabled={isProcessing}
                              createOrder={async () => {
                                setPaymentError("");
                                try {
                                  const appliedPromo = appliedDiscount > 0 ? promoCode.trim().toUpperCase() : undefined;
                                  const token = await getFreshSessionToken();
                                  if (!token) throw new Error("Session expirée. Reconnectez-vous.");
                                  const order = await api.createPayPalOrder(course.id, appliedPromo);
                                  if (order.amount && order.currency) {
                                    setOrderPreviewAmount(`${order.amount} ${order.currency}`);
                                  }
                                  return order.id;
                                } catch (err: any) {
                                  const message = err?.message || "Impossible de créer la commande PayPal.";
                                  setPaymentError(message);
                                  throw err;
                                }
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
                                setPaymentError((current) =>
                                  current || "Erreur PayPal. Veuillez réessayer ou utiliser un autre moyen de paiement.",
                                );
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
                      <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-xs font-medium text-red-300">
                        {paymentError}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="shrink-0 space-y-3 border-t border-white/[0.06] px-5 py-4 sm:px-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-300"
                >
                  Annuler
                </button>
                <p className="flex items-center justify-center gap-1.5 text-[10px] text-slate-600">
                  <Lock className="h-3 w-3" />
                  Paiement chiffré via PayPal Checkout
                </p>
              </div>
            </>
          )}

          {step === "loading" && (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="relative h-14 w-14">
                <div className="absolute inset-0 rounded-full border-2 border-white/10" />
                <div className="absolute inset-0 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-white">Validation en cours</h3>
              <p className="mt-1.5 max-w-[260px] text-sm text-slate-400">
                Capture sécurisée de votre paiement. Ne fermez pas cette fenêtre.
              </p>
            </div>
          )}

          {step === "success" && (
            <div className="flex flex-col items-center px-6 py-12 text-center animate-in zoom-in-95 duration-300">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="mt-5 text-xl font-bold text-white">Paiement confirmé</h3>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-400">
                Votre accès au module{" "}
                <span className="font-semibold text-slate-200">{course.title}</span> est maintenant actif.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-500"
              >
                Accéder au module
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
