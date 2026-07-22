import { useCallback, useEffect, useRef, useState } from "react";
import { getClientErrorMessage } from "../client-errors";
import {
  ArrowRight,
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
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
import {
  buildPayPalHostedCheckoutUrl,
  clearPayPalReturnQuery,
  clearPendingPayPalCheckout,
  readPendingPayPalCheckout,
  storePendingPayPalCheckout,
} from "../utils/paypal-hosted-checkout";
import type { CenterPaymentConfig, CenterPaymentRequestView } from "../center-payment-types";
import type { PromoQuote } from "../promo-code-types";

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

const PAYPAL_MAD_TO_USD_RATE = 0.1;

const scrollAreaClass = "payment-modal-scroll-area min-h-0 overflow-y-auto overscroll-contain";

export default function PaymentModal({ course, onClose, onSuccess }: PaymentModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const hostedReturnHandledRef = useRef(false);
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<PromoQuote | null>(null);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [promoSuccess, setPromoSuccess] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<"form" | "loading" | "success">("form");
  const [paypalConfig, setPaypalConfig] = useState<PayPalConfig | null>(null);
  const [configError, setConfigError] = useState("");
  const [orderPreviewAmount, setOrderPreviewAmount] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState<"PAYPAL" | "CENTER">("PAYPAL");
  const [centerConfig, setCenterConfig] = useState<CenterPaymentConfig | null>(null);
  const [centerConfigError, setCenterConfigError] = useState("");
  const [centerRequest, setCenterRequest] = useState<CenterPaymentRequestView | null>(null);
  const [studentNote, setStudentNote] = useState("");

  const originalPrice = course?.price ?? 0;
  const modulePriceAfterPromo = appliedPromo?.finalAmount ?? originalPrice;
  const isFreeCheckout = modulePriceAfterPromo <= 0;
  const finalPrice = modulePriceAfterPromo;
  const savings = originalPrice - modulePriceAfterPromo;

  useEffect(() => {
    setPaymentMode("PAYPAL");
    setCenterRequest(null);
    setStudentNote("");
    setPromoCode("");
    setAppliedPromo(null);
    setPromoError("");
    setPromoSuccess("");
  }, [course?.id]);

  useEffect(() => {
    if (!course || isFreeCheckout) {
      setPaypalConfig(null);
      setConfigError("");
      return;
    }
    let active = true;
    api
      .getPayPalConfig()
      .then((config) => {
        if (active) setPaypalConfig(config);
      })
      .catch((err: any) => {
        if (active) setConfigError(getClientErrorMessage(err, "PayPal indisponible pour le moment."));
      });
    return () => {
      active = false;
    };
  }, [course?.id, isFreeCheckout]);

  useEffect(() => {
    if (!course || isFreeCheckout) return;
    let active = true;
    setCenterConfig(null);
    setCenterConfigError("");
    api
      .getCenterPaymentConfig()
      .then((config) => {
        if (active) {
          setCenterConfig(config);
          setCenterConfigError("");
        }
      })
      .catch((error: unknown) => {
        if (active) setCenterConfigError(getClientErrorMessage(error, "Paiement au centre indisponible."));
      });
    return () => {
      active = false;
    };
  }, [course?.id, isFreeCheckout]);

  useEffect(() => {
    if (!course) return;
    const focusTimer = window.setTimeout(() => {
      document.getElementById("close-payment-modal")?.focus();
    }, 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && step === "form" && !isProcessing) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [course, onClose, step, isProcessing]);

  useFocusTrap(dialogRef, Boolean(course));

  const handlePayPalApprove = useCallback(
    async (orderId: string) => {
      if (!course) return;
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
      } catch (err: unknown) {
        setPaymentError(getClientErrorMessage(err, "Impossible de finaliser le paiement PayPal."));
        setStep("form");
      } finally {
        setIsProcessing(false);
      }
    },
    [course, finalPrice, onSuccess],
  );

  useEffect(() => {
    if (!course || hostedReturnHandledRef.current || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get("payment");
    if (paymentStatus !== "success" && paymentStatus !== "cancel") return;

    const pending = readPendingPayPalCheckout();
    if (!pending || pending.courseId !== course.id) {
      clearPendingPayPalCheckout();
      clearPayPalReturnQuery();
      return;
    }

    hostedReturnHandledRef.current = true;
    if (paymentStatus === "cancel") {
      setPaymentError("Paiement par carte annulé. Vous pouvez réessayer.");
      void api.cancelPayPalOrder(pending.orderId).catch(() => undefined);
      clearPendingPayPalCheckout();
      clearPayPalReturnQuery();
      return;
    }

    const orderId = String(params.get("token") || "").trim();
    if (!orderId || orderId !== pending.orderId) {
      setPaymentError("Le retour PayPal est invalide ou a expiré. Veuillez recommencer le paiement.");
      clearPendingPayPalCheckout();
      clearPayPalReturnQuery();
      return;
    }

    void handlePayPalApprove(orderId).finally(() => {
      clearPendingPayPalCheckout();
      clearPayPalReturnQuery();
    });
  }, [course, handlePayPalApprove]);

  if (!course) return null;

  const handleApplyPromo = async () => {
    setPromoError("");
    setPromoSuccess("");
    const code = promoCode.trim().toUpperCase();
    if (!code) return;
    setIsApplyingPromo(true);
    try {
      const quote = await api.validatePromoCode(course.id, code);
      setAppliedPromo(quote);
      setPromoCode(quote.code);
      setPromoSuccess("Code validé par le serveur. Il sera revérifié lors du paiement.");
    } catch (error: unknown) {
      setAppliedPromo(null);
      setPromoError(getClientErrorMessage(error, "Ce code promotionnel n’est pas valide."));
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCode("");
    setPromoError("");
    setPromoSuccess("");
    void api.removePromoCode(course.id).catch(() => undefined);
  };

  const handleFreeEnroll = async () => {
    setStep("loading");
    setIsProcessing(true);
    setPaymentError("");

    try {
      const result = await api.freeEnrollCourse(course.id, appliedPromo?.code);
      if (!result.user) {
        throw new Error("Inscription non confirmée par le serveur. Contactez le support.");
      }
      await onSuccess(course.id, 0, result.user);
      setStep("success");
    } catch (err: unknown) {
      setPaymentError(getClientErrorMessage(err, "Impossible de finaliser l'inscription gratuite."));
      setStep("form");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreatePayPalOrder = async () => {
    setPaymentError("");
    const token = await getFreshSessionToken();
    if (!token) throw new Error("Session expirée. Reconnectez-vous.");
    const order = await api.createPayPalOrder(course.id, appliedPromo?.code);
    if (order.amount && order.currency) {
      setOrderPreviewAmount(`${order.amount} ${order.currency}`);
    }
    return order.id;
  };

  const handleHostedPayPalCheckout = async () => {
    if (!paypalConfig || isProcessing) return;
    setIsProcessing(true);
    setPaymentError("");

    try {
      const orderId = await handleCreatePayPalOrder();
      storePendingPayPalCheckout({
        orderId,
        courseId: course.id,
        amountMad: finalPrice,
        createdAt: Date.now(),
      });
      window.location.assign(buildPayPalHostedCheckoutUrl(orderId, paypalConfig.env));
    } catch (err: unknown) {
      setPaymentError(getClientErrorMessage(err, "Impossible d'ouvrir le paiement sécurisé par carte."));
      setIsProcessing(false);
    }
  };

  const handleCenterPaymentRequest = async () => {
    if (!centerConfig || isProcessing) return;
    setIsProcessing(true);
    setPaymentError("");
    try {
      const result = await api.createCenterPaymentRequest(course.id, {
        promoCode: appliedPromo?.code,
        studentNote: studentNote.trim() || undefined,
      });
      setCenterRequest(result.request);
    } catch (error: unknown) {
      setPaymentError(getClientErrorMessage(error, "Impossible de créer la demande de paiement au centre."));
    } finally {
      setIsProcessing(false);
    }
  };

  const checkoutEquivalent =
    paypalConfig && paypalConfig.currency !== PLATFORM_CURRENCY_CODE
      ? `${(finalPrice * PAYPAL_MAD_TO_USD_RATE).toFixed(2)} ${paypalConfig.currency}`
      : null;
  const displayedCheckoutAmount = orderPreviewAmount ?? checkoutEquivalent;

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
      <div className="w-full max-w-[520px] animate-in fade-in slide-in-from-bottom-4 duration-300 sm:zoom-in-95 sm:slide-in-from-bottom-0">
        <div className="flex max-h-[min(820px,96dvh)] flex-col overflow-hidden rounded-t-[24px] border border-white/10 bg-[#0b1220] shadow-[0_24px_80px_-12px_rgba(0,0,0,0.65)] sm:rounded-[24px]">
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
                  Module <span className="font-semibold text-slate-200">{course.title}</span>
                </p>
              </div>

              {/* Body */}
              <div className={`flex-1 px-5 py-4 sm:px-6 ${scrollAreaClass}`}>
                <div className="space-y-4">
                  {/* Price card */}
                  <div className="relative overflow-hidden rounded-2xl border border-emerald-400/15 bg-gradient-to-br from-emerald-500/[0.12] via-slate-900/40 to-teal-500/[0.08] p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
                    <div className="flex items-end justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-300/80">
                          Abonnement mensuel
                        </p>
                        <p className="text-xs text-slate-400">Résiliable en 1 clic</p>
                      </div>
                      <div className="shrink-0 text-right">
                        {appliedPromo && (
                          <p className="text-xs font-medium text-slate-500 line-through">{formatMad(originalPrice)}</p>
                        )}
                        <div className="flex items-baseline justify-end gap-1">
                          <span className="text-[2rem] font-black leading-none tracking-tight text-white">
                            {formatMad(finalPrice)}
                          </span>
                          <span className="text-[10px] font-bold uppercase text-slate-500">/mois</span>
                        </div>
                        {appliedPromo && (
                          <span className="mt-1 inline-flex rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                            Économie {formatMad(savings)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 border-t border-white/[0.06] pt-3">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-black/20 px-2 py-1 text-[10px] font-semibold text-slate-300">
                        <BookOpen className="h-3 w-3 text-emerald-300" />
                        {formatCredits(course.credits)}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-lg bg-black/20 px-2 py-1 text-[10px] font-semibold text-slate-300">
                        <Clock className="h-3 w-3 text-emerald-300" />
                        {course.duration}
                      </span>
                    </div>
                  </div>

                  {/* Promo */}
                  <div className="space-y-2">
                    <label
                      htmlFor="promo-code"
                      className="text-[10px] font-bold uppercase tracking-widest text-slate-500"
                    >
                      Code promo
                    </label>
                    <div className="relative">
                      <Tag className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                      <input
                        id="promo-code"
                        type="text"
                        placeholder="PERFORMANCE20"
                        value={promoCode}
                        onChange={(e) => {
                          setPromoCode(e.target.value);
                          setAppliedPromo(null);
                          setPromoSuccess("");
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void handleApplyPromo();
                        }}
                        className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-[5.5rem] font-mono text-sm uppercase text-white placeholder:text-slate-600 focus:border-emerald-400/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                      <button
                        type="button"
                        onClick={() => void handleApplyPromo()}
                        disabled={isApplyingPromo || !promoCode.trim()}
                        className="absolute right-1 top-1 bottom-1 rounded-lg bg-emerald-600 px-3 text-[11px] font-bold text-white transition-colors hover:bg-emerald-500"
                      >
                        {isApplyingPromo ? "Vérification…" : "Appliquer"}
                      </button>
                    </div>
                    {promoError && <p className="text-xs font-medium text-red-400">{promoError}</p>}
                    {promoSuccess && (
                      <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-xs text-emerald-100">
                        <p className="inline-flex items-center gap-1 font-semibold text-emerald-300">
                          <Sparkles className="h-3.5 w-3.5" /> {promoSuccess}
                        </p>
                        {appliedPromo && (
                          <dl className="mt-2 grid grid-cols-2 gap-1">
                            <dt>Code</dt>
                            <dd className="text-right font-mono font-bold">{appliedPromo.code}</dd>
                            <dt>Prix initial</dt>
                            <dd className="text-right">{formatMad(appliedPromo.originalAmount)}</dd>
                            <dt>Réduction</dt>
                            <dd className="text-right text-emerald-300">−{formatMad(appliedPromo.discountAmount)}</dd>
                            <dt>Prix final</dt>
                            <dd className="text-right font-bold">{formatMad(appliedPromo.finalAmount)}</dd>
                          </dl>
                        )}
                        <button
                          type="button"
                          onClick={handleRemovePromo}
                          className="mt-2 font-bold text-white underline"
                        >
                          Retirer le code
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Paiement ou inscription gratuite */}
                  <div className="space-y-2.5">
                    {isFreeCheckout ? (
                      <>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Accès gratuit</p>
                        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4">
                          <p className="text-sm leading-relaxed text-emerald-100/90">
                            Ce module est gratuit. Confirmez votre inscription pour y accéder immédiatement.
                          </p>
                          <button
                            type="button"
                            onClick={() => void handleFreeEnroll()}
                            disabled={isProcessing}
                            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-500 disabled:opacity-60"
                          >
                            {originalPrice <= 0 ? "S'inscrire gratuitement" : "Activer gratuitement"}
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                          Choisir le mode de paiement
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Mode de paiement">
                          <button
                            type="button"
                            role="radio"
                            aria-checked={paymentMode === "PAYPAL"}
                            onClick={() => setPaymentMode("PAYPAL")}
                            className={`rounded-xl border p-3 text-left transition ${
                              paymentMode === "PAYPAL"
                                ? "border-sky-400/50 bg-sky-500/10"
                                : "border-white/10 bg-white/[0.03] hover:border-white/20"
                            }`}
                          >
                            <span className="flex items-center gap-2 text-sm font-bold text-white">
                              <CreditCard className="h-4 w-4 text-sky-300" /> Payer avec PayPal
                            </span>
                            <span className="mt-1 block text-[10px] leading-relaxed text-slate-400">
                              Paiement en ligne et activation automatique.
                            </span>
                          </button>
                          <button
                            type="button"
                            role="radio"
                            aria-checked={paymentMode === "CENTER"}
                            onClick={() => setPaymentMode("CENTER")}
                            className={`rounded-xl border p-3 text-left transition ${
                              paymentMode === "CENTER"
                                ? "border-emerald-400/50 bg-emerald-500/10"
                                : "border-white/10 bg-white/[0.03] hover:border-white/20"
                            }`}
                          >
                            <span className="flex items-center gap-2 text-sm font-bold text-white">
                              <Building2 className="h-4 w-4 text-emerald-300" /> Payer au centre
                            </span>
                            <span className="mt-1 block text-[10px] leading-relaxed text-slate-400">
                              Réservez en ligne, payez au centre, accès après validation.
                            </span>
                          </button>
                        </div>

                        {paymentMode === "PAYPAL" && (
                          <>
                            {configError && (
                              <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-xs font-medium text-red-300">
                                {configError}
                              </p>
                            )}

                            {!paypalConfig && !configError && (
                              <div className="flex items-center justify-center gap-2.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] py-7">
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400/80 border-t-transparent" />
                                <span className="text-xs font-medium text-slate-400">Initialisation PayPal…</span>
                              </div>
                            )}

                            {paypalConfig && (
                              <div className="axelmond-paypal-shell relative w-full min-w-0 overflow-visible rounded-2xl border border-emerald-400/15 bg-gradient-to-br from-emerald-500/[0.1] via-slate-900/50 to-teal-500/[0.08] p-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
                                {paypalConfig.currency !== PLATFORM_CURRENCY_CODE && (
                                  <div className="mb-3 flex items-start gap-2.5 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2.5">
                                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
                                    <p className="text-[11px] leading-relaxed text-emerald-100/90">
                                      Tarif affiché en{" "}
                                      <span className="font-semibold text-white">{PLATFORM_CURRENCY_CODE}</span>.
                                      Encaissement sécurisé en{" "}
                                      <span className="font-semibold text-emerald-200">{paypalConfig.currency}</span>
                                      {displayedCheckoutAmount ? ` (~${displayedCheckoutAmount})` : ""}.
                                    </p>
                                  </div>
                                )}

                                <button
                                  type="button"
                                  data-testid="paypal-hosted-card-checkout"
                                  onClick={() => void handleHostedPayPalCheckout()}
                                  disabled={isProcessing}
                                  className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#0070ba] px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-sky-950/20 transition-colors hover:bg-[#005ea6] disabled:cursor-wait disabled:opacity-60"
                                >
                                  {isProcessing ? (
                                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                  ) : (
                                    <CreditCard className="h-5 w-5 shrink-0" />
                                  )}
                                  <span className="text-left">
                                    <span className="block">Payer par carte bancaire ou PayPal</span>
                                    <span className="block text-[10px] font-medium text-white/75">
                                      Ouverture du formulaire sécurisé PayPal
                                    </span>
                                  </span>
                                  <ArrowRight className="h-4 w-4 shrink-0" />
                                </button>

                                <p className="mt-3 flex items-center justify-center gap-1.5 text-[10px] font-medium text-slate-500">
                                  <CreditCard className="h-3 w-3 text-emerald-400/80" />
                                  Carte ou compte PayPal — traitement chiffré sur PayPal
                                </p>
                              </div>
                            )}
                          </>
                        )}

                        {paymentMode === "CENTER" && (
                          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.07] p-4">
                            {centerConfigError ? (
                              <p className="text-sm font-medium text-red-300">{centerConfigError}</p>
                            ) : !centerConfig ? (
                              <p className="text-sm text-slate-400" role="status">
                                Chargement des informations du centre…
                              </p>
                            ) : centerRequest ? (
                              <div className="text-center">
                                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-300" />
                                <h3 className="mt-3 text-lg font-black text-white">Demande créée</h3>
                                <p className="mt-2 text-xs text-slate-400">Présentez cette référence au centre :</p>
                                <p className="mt-2 rounded-xl bg-slate-950/60 px-4 py-3 font-mono text-xl font-black tracking-wider text-emerald-200">
                                  {centerRequest.reference}
                                </p>
                                <p className="mt-3 text-xs leading-relaxed text-amber-100/80">
                                  Le module reste verrouillé jusqu’à la validation réelle du paiement par
                                  l’administration.
                                </p>
                                <p className="mt-2 text-xs text-slate-400">
                                  À payer avant le {new Date(centerRequest.expiresAt).toLocaleString("fr-MA")}.
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <div className="space-y-2 text-xs text-slate-300">
                                  <p className="font-bold text-white">{course.title}</p>
                                  <p className="line-clamp-2 text-slate-400">{course.description}</p>
                                  <div className="grid gap-2 sm:grid-cols-2">
                                    <span className="rounded-lg bg-black/20 p-2 font-bold text-emerald-200">
                                      {formatMad(finalPrice)} · {centerConfig.currency}
                                    </span>
                                    <span className="flex items-center gap-1 rounded-lg bg-black/20 p-2">
                                      <CalendarDays className="h-3.5 w-3.5 text-emerald-300" />
                                      {centerConfig.accessDurationDays} jours après validation
                                    </span>
                                  </div>
                                  <p>
                                    <strong className="text-white">Adresse :</strong> {centerConfig.address}
                                  </p>
                                  <p>
                                    <strong className="text-white">Horaires :</strong> {centerConfig.openingHours}
                                  </p>
                                  <p>
                                    <strong className="text-white">Délai :</strong> {centerConfig.expirationDays} jours
                                  </p>
                                </div>
                                <label className="block text-xs font-bold text-slate-300">
                                  Note facultative
                                  <textarea
                                    value={studentNote}
                                    onChange={(event) => setStudentNote(event.target.value)}
                                    maxLength={500}
                                    rows={2}
                                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm font-normal text-white outline-none focus:border-emerald-400/50"
                                  />
                                </label>
                                <p className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-100">
                                  Cette demande n’active pas immédiatement le module. L’accès commence uniquement à la
                                  date de validation du paiement.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => void handleCenterPaymentRequest()}
                                  disabled={isProcessing}
                                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-60"
                                >
                                  {isProcessing ? "Création de la demande…" : "Confirmer ma demande"}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </>
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
                  {isFreeCheckout
                    ? "Inscription sécurisée sur la plateforme"
                    : paymentMode === "CENTER"
                      ? "Activation uniquement après validation par l’administration"
                      : "Paiement chiffré via PayPal Checkout"}
                </p>
              </div>
            </>
          )}

          {step === "loading" && (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="relative h-14 w-14">
                <div className="absolute inset-0 rounded-full border-2 border-white/10" />
                <div className="absolute inset-0 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-white">Validation en cours</h3>
              <p className="mt-1.5 max-w-[260px] text-sm text-slate-400">
                {isFreeCheckout
                  ? "Activation de votre accès gratuit. Ne fermez pas cette fenêtre."
                  : "Capture sécurisée de votre paiement. Ne fermez pas cette fenêtre."}
              </p>
            </div>
          )}

          {step === "success" && (
            <div className="flex flex-col items-center px-6 py-12 text-center animate-in zoom-in-95 duration-300">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="mt-5 text-xl font-bold text-white">
                {isFreeCheckout ? "Inscription confirmée" : "Paiement confirmé"}
              </h3>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-400">
                {isFreeCheckout ? (
                  <>
                    Votre accès gratuit au module <span className="font-semibold text-slate-200">{course.title}</span>{" "}
                    est maintenant actif.
                  </>
                ) : (
                  <>
                    Votre accès au module <span className="font-semibold text-slate-200">{course.title}</span> est
                    maintenant actif.
                  </>
                )}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-500"
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
