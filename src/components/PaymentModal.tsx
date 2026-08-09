import { useCallback, useEffect, useRef, useState } from "react";
import { getClientErrorMessage } from "../client-errors";
import {
  ArrowRight,
  BookOpen,
  Building2,
  CheckCircle2,
  Clock,
  CreditCard,
  KeyRound,
  Lock,
  ShieldCheck,
  Sparkles,
  Tag,
  X,
  Zap,
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

  const [centerConfig, setCenterConfig] = useState<CenterPaymentConfig | null>(null);
  const [centerConfigError, setCenterConfigError] = useState("");
  const [centerRequest, setCenterRequest] = useState<CenterPaymentRequestView | null>(null);
  const [studentNote, setStudentNote] = useState("");

  // ── Access Code state ──────────────────────────────────────────────────────
  const [accessCode, setAccessCode] = useState("");
  const [accessCodeError, setAccessCodeError] = useState("");
  const [accessCodeValidated, setAccessCodeValidated] = useState(false);
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [showCodeInFreeMode, setShowCodeInFreeMode] = useState(false);

  const originalPrice = course?.price ?? 0;
  const modulePriceAfterPromo = appliedPromo?.finalAmount ?? originalPrice;
  const isFreeCheckout = modulePriceAfterPromo <= 0;
  const finalPrice = modulePriceAfterPromo;
  const savings = originalPrice - modulePriceAfterPromo;

  useEffect(() => {
    setCenterRequest(null);
    setStudentNote("");
    setPromoCode("");
    setAppliedPromo(null);
    setPromoError("");
    setPromoSuccess("");
    setAccessCode("");
    setAccessCodeError("");
    setAccessCodeValidated(false);
    setShowCodeInFreeMode(false);
  }, [course?.id]);

  useEffect(() => {
    if (!course || isFreeCheckout) {
      setPaypalConfig(null);
      setConfigError("");
      return;
    }
    let active = true;
    setPaypalConfig(null);
    setConfigError("");
    api
      .getPayPalConfig()
      .then((config) => {
        if (active) {
          setPaypalConfig(config);
          setConfigError("");
        }
      })
      .catch((err: any) => {
        if (active) {
          setPaypalConfig(null);
          setConfigError(
            getClientErrorMessage(err, "Paiement en ligne temporairement indisponible. Veuillez utiliser le paiement au centre ou un code d'accès."),
          );
        }
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
      setPromoSuccess("Code validé ! Réduction appliquée sur les tarifs.");
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

  const handleValidateAccessCode = async () => {
    const code = accessCode.trim().toUpperCase();
    if (!code) return;
    setIsValidatingCode(true);
    setAccessCodeError("");
    setAccessCodeValidated(false);
    try {
      await api.validateAccessCode(course.id, code);
      setAccessCode(code);
      setAccessCodeValidated(true);
    } catch (err: unknown) {
      setAccessCodeError(getClientErrorMessage(err, "Code d'accès invalide ou expiré."));
    } finally {
      setIsValidatingCode(false);
    }
  };

  const handleActivateWithCode = async () => {
    if (!accessCodeValidated || isProcessing) return;
    setStep("loading");
    setIsProcessing(true);
    setPaymentError("");
    try {
      const result = await api.freeEnrollCourse(course.id, accessCode.trim().toUpperCase());
      if (!result.user) {
        throw new Error("Inscription non confirmée par le serveur. Contactez le support.");
      }
      await onSuccess(course.id, 0, result.user);
      setStep("success");
    } catch (err: unknown) {
      setPaymentError(getClientErrorMessage(err, "Impossible d'activer votre accès avec ce code."));
      setStep("form");
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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 p-3 sm:p-6 backdrop-blur-xl overflow-y-auto"
      onClick={(event) => {
        if (event.target === event.currentTarget && step === "form" && !isProcessing) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
    >
      <div className={`w-full ${isFreeCheckout ? "max-w-2xl" : "max-w-6xl"} my-auto animate-in fade-in zoom-in-95 duration-300`}>
        <div className="relative flex flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#090d16] shadow-[0_32px_96px_-16px_rgba(0,0,0,0.85)]">
          {step === "form" && (
            <>
              {/* Header section */}
              <div className="relative shrink-0 border-b border-white/[0.08] px-6 py-6 sm:px-8 bg-gradient-to-r from-slate-900/80 via-slate-900/40 to-slate-900/80">
                <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-sky-500 via-emerald-400 to-violet-500" />

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {isFreeCheckout ? "Accès Offert" : "Abonnement & Activation"}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-lg bg-black/40 px-2.5 py-1 text-xs font-semibold text-slate-300">
                        <BookOpen className="h-3.5 w-3.5 text-emerald-400" />
                        {formatCredits(course.credits)}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-lg bg-black/40 px-2.5 py-1 text-xs font-semibold text-slate-300">
                        <Clock className="h-3.5 w-3.5 text-emerald-400" />
                        {course.duration}
                      </span>
                    </div>

                    <h2 id="payment-modal-title" className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                      {isFreeCheckout ? "Activation de votre module gratuit" : "Choisissez votre mode d'activation"}
                    </h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Module : <span className="font-semibold text-slate-200">{course.title}</span>
                    </p>
                  </div>

                  <button
                    id="close-payment-modal"
                    type="button"
                    onClick={onClose}
                    className="kbd-nav-focus group flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-400 transition-all hover:bg-white/15 hover:text-white"
                    aria-label="Fermer la fenêtre (Esc)"
                  >
                    <X className="h-4 w-4 transition-transform group-hover:scale-110" />
                  </button>
                </div>

                {/* Promo Code Strip (Only for paid courses) */}
                {!isFreeCheckout && (
                  <div className="mt-4 pt-4 border-t border-white/[0.06] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span className="text-xs font-semibold text-slate-300">
                        Vous avez un code promo ?
                      </span>
                    </div>

                    <div className="flex items-center gap-2 min-w-0 sm:w-80">
                      <input
                        type="text"
                        placeholder="Ex: PERFORMANCE20"
                        value={promoCode}
                        onChange={(e) => {
                          setPromoCode(e.target.value);
                          setAppliedPromo(null);
                          setPromoSuccess("");
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void handleApplyPromo();
                        }}
                        className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs uppercase text-white placeholder:text-slate-600 focus:border-emerald-400/50 focus:outline-none"
                      />
                      {appliedPromo ? (
                        <button
                          type="button"
                          onClick={handleRemovePromo}
                          className="shrink-0 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-500/20"
                        >
                          Retirer
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void handleApplyPromo()}
                          disabled={isApplyingPromo || !promoCode.trim()}
                          className="shrink-0 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
                        >
                          {isApplyingPromo ? "..." : "Appliquer"}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {promoError && <p className="mt-2 text-xs font-medium text-red-400">{promoError}</p>}
                {promoSuccess && (
                  <p className="mt-2 text-xs font-semibold text-emerald-300 flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5" /> {promoSuccess}
                    {appliedPromo && (
                      <span className="ml-1 text-slate-400">
                        (Réduction : -{formatMad(savings)})
                      </span>
                    )}
                  </p>
                )}
              </div>

              {/* ─────────────────────────────────────────────────────────────
                  BODY AREA: FREE COURSE vs PAID 3-COLUMN GRID
                 ───────────────────────────────────────────────────────────── */}
              {isFreeCheckout ? (
                /* SINGLE FREE ENROLLMENT CARD FOR 0 DH COURSES */
                <div className="p-6 sm:p-10 flex flex-col items-center justify-center text-center">
                  <div className="w-full rounded-3xl border border-emerald-400/30 bg-gradient-to-b from-emerald-500/10 via-slate-900/80 to-slate-950/90 p-8 shadow-2xl space-y-6">
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-300">
                      <Sparkles className="h-4 w-4 text-emerald-400" /> Module Gratuit (0 DH)
                    </div>

                    <div>
                      <h3 className="text-2xl font-black text-white sm:text-3xl">Accès Offert au Module</h3>
                      <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                        Ce module est mis à votre disposition gratuitement. Aucun paiement ni carte bancaire n&apos;est requis.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-3 text-left text-xs text-slate-300">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span>Accès immédiat à l&apos;ensemble des leçons et ressources</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span>Suivi de progression et quiz d&apos;évaluation inclus</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span>Inscription simple en un clic</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleFreeEnroll()}
                      disabled={isProcessing}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-4 text-base font-black text-white shadow-xl shadow-emerald-950/40 transition-all hover:bg-emerald-500 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
                    >
                      {isProcessing ? (
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      ) : (
                        <Sparkles className="h-5 w-5" />
                      )}
                      {isProcessing ? "Activation en cours…" : "S'inscrire gratuitement"}
                      {!isProcessing && <ArrowRight className="h-5 w-5 ml-auto" />}
                    </button>

                    <div className="pt-2 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => setShowCodeInFreeMode(!showCodeInFreeMode)}
                        className="text-xs text-slate-400 hover:text-white underline"
                      >
                        {showCodeInFreeMode ? "Masquer la saisie de code" : "Vous avez un code d'accès administrateur ?"}
                      </button>
                    </div>

                    {showCodeInFreeMode && (
                      <div className="pt-3 text-left space-y-3">
                        <div className="relative">
                          <KeyRound className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-violet-400" />
                          <input
                            type="text"
                            placeholder="EX: ACCES-ABCD-1234"
                            value={accessCode}
                            onChange={(e) => {
                              setAccessCode(e.target.value.toUpperCase());
                              setAccessCodeError("");
                              setAccessCodeValidated(false);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void handleValidateAccessCode();
                            }}
                            className="w-full rounded-xl border border-white/10 bg-black/60 pl-10 pr-24 py-2.5 font-mono text-xs uppercase text-white outline-none focus:border-violet-400/50"
                          />
                          <button
                            type="button"
                            onClick={() => void handleValidateAccessCode()}
                            disabled={isValidatingCode || !accessCode.trim()}
                            className="absolute right-1 top-1 bottom-1 rounded-lg bg-violet-600 px-3 text-xs font-bold text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
                          >
                            {isValidatingCode ? "..." : "Valider"}
                          </button>
                        </div>
                        {accessCodeError && <p className="text-xs text-red-400 font-medium">{accessCodeError}</p>}
                        {accessCodeValidated && (
                          <button
                            type="button"
                            onClick={() => void handleActivateWithCode()}
                            disabled={isProcessing}
                            className="w-full rounded-xl bg-violet-600 py-3 text-xs font-bold text-white hover:bg-violet-500"
                          >
                            Activer avec le code {accessCode}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* 3 COLUMNS PRICING GRID LAYOUT FOR PAID COURSES */
                <div className="p-6 sm:p-8 overflow-y-auto max-h-[calc(90vh-180px)]">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                    
                    {/* ───────────────────────────────────────────────────────────
                        CARD 1: Paiement par Carte / PayPal (Instant en ligne)
                       ─────────────────────────────────────────────────────────── */}
                    <div className="relative flex flex-col justify-between rounded-2xl border border-sky-400/30 bg-gradient-to-b from-sky-500/[0.08] via-slate-900/60 to-slate-950/80 p-6 shadow-xl transition-all duration-300 hover:border-sky-400/50">
                      <div>
                        {/* Top Badge */}
                        <div className="flex items-center justify-between mb-4">
                          <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/30 bg-sky-500/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-300">
                            <Zap className="h-3 w-3 text-sky-400" /> Activation Immédiate
                          </span>
                        </div>

                        {/* Title & Subtitle */}
                        <h3 className="text-xl font-bold text-white">Carte / PayPal</h3>
                        <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                          Paiement sécurisé en ligne. Votre accès est débloqué automatiquement dès la validation.
                        </p>

                        {/* Pricing */}
                        <div className="mt-5 pb-5 border-b border-white/[0.08]">
                          {appliedPromo && (
                            <p className="text-xs font-medium text-slate-500 line-through">{formatMad(originalPrice)}</p>
                          )}
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black tracking-tight text-white">
                              {formatMad(finalPrice)}
                            </span>
                            <span className="text-xs font-bold uppercase text-slate-500">/mois</span>
                          </div>
                          {appliedPromo && (
                            <span className="mt-1 inline-flex rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                              Économie {formatMad(savings)}
                            </span>
                          )}
                        </div>

                        {/* Features Bullet List */}
                        <ul className="mt-5 space-y-3 text-xs text-slate-300">
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-sky-400 mt-0.5" />
                            <span>Accès instantané à tous les contenus du module</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-sky-400 mt-0.5" />
                            <span>Paiement chiffré et sécurisé par PayPal Checkout</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-sky-400 mt-0.5" />
                            <span>Facture numérique téléchargeable</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-sky-400 mt-0.5" />
                            <span>Sans engagement &bull; Résiliable en 1 clic</span>
                          </li>
                        </ul>
                      </div>

                      {/* Bottom Action Area */}
                      <div className="mt-6 pt-4 border-t border-white/[0.06]">
                        {configError ? (
                          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 space-y-1">
                            <p className="font-bold text-amber-300">Paiement en ligne indisponible</p>
                            <p className="text-[11px] leading-relaxed text-amber-200/80">
                              Utilisez le paiement au centre ou un code d&apos;accès administrateur.
                            </p>
                          </div>
                        ) : !paypalConfig ? (
                          <div className="flex items-center justify-center gap-2 py-3">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
                            <span className="text-xs text-slate-400">Chargement PayPal…</span>
                          </div>
                        ) : (
                          <div>
                            {paypalConfig.currency !== PLATFORM_CURRENCY_CODE && (
                              <p className="mb-2 text-[10px] text-slate-400">
                                Conversion : {displayedCheckoutAmount ?? `${finalPrice} MAD`}
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={() => void handleHostedPayPalCheckout()}
                              disabled={isProcessing}
                              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0070ba] px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-sky-950/30 transition-all hover:bg-[#005ea6] disabled:opacity-60"
                            >
                              {isProcessing ? (
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                              ) : (
                                <CreditCard className="h-4 w-4" />
                              )}
                              Payer par carte ou PayPal
                              <ArrowRight className="h-4 w-4 ml-auto" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>


                    {/* ───────────────────────────────────────────────────────────
                        CARD 2: Paiement au Centre de Formation (Physique)
                       ─────────────────────────────────────────────────────────── */}
                    <div className="relative flex flex-col justify-between rounded-2xl border border-emerald-400/30 bg-gradient-to-b from-emerald-500/[0.08] via-slate-900/60 to-slate-950/80 p-6 shadow-xl transition-all duration-300 hover:border-emerald-400/50">
                      <div>
                        {/* Top Badge */}
                        <div className="flex items-center justify-between mb-4">
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                            <Building2 className="h-3 w-3 text-emerald-400" /> Règlement sur Place
                          </span>
                        </div>

                        {/* Title & Subtitle */}
                        <h3 className="text-xl font-bold text-white">Paiement au Centre</h3>
                        <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                          Réservez en ligne, payez sur place au centre de formation. Accès validé à la réception.
                        </p>

                        {/* Pricing */}
                        <div className="mt-5 pb-5 border-b border-white/[0.08]">
                          {appliedPromo && (
                            <p className="text-xs font-medium text-slate-500 line-through">{formatMad(originalPrice)}</p>
                          )}
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black tracking-tight text-white">
                              {formatMad(finalPrice)}
                            </span>
                            <span className="text-xs font-bold uppercase text-slate-500">/mois</span>
                          </div>
                          {appliedPromo && (
                            <span className="mt-1 inline-flex rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                              Économie {formatMad(savings)}
                            </span>
                          )}
                        </div>

                        {/* Features Bullet List */}
                        <ul className="mt-5 space-y-3 text-xs text-slate-300">
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                            <span>Réservation en ligne instantanée sans frais</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                            <span>Règlement par Espèces, Carte ou Virement</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                            <span>Référence de paiement unique générée</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                            <span>Accès activé dès validation par l&apos;administration</span>
                          </li>
                        </ul>
                      </div>

                      {/* Bottom Action Area */}
                      <div className="mt-6 pt-4 border-t border-white/[0.06]">
                        {centerConfigError ? (
                          <p className="text-xs text-red-400">{centerConfigError}</p>
                        ) : centerRequest ? (
                          <div className="text-center space-y-2">
                            <span className="text-xs text-emerald-300 font-bold">✓ Demande créée</span>
                            <div className="rounded-xl bg-black/60 p-2 font-mono text-base font-black text-emerald-200">
                              {centerRequest.reference}
                            </div>
                            <p className="text-[10px] text-slate-400">Présentez ce code au centre</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <input
                              type="text"
                              placeholder="Note ou remarque (Optionnel)"
                              value={studentNote}
                              onChange={(e) => setStudentNote(e.target.value)}
                              maxLength={300}
                              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white placeholder:text-slate-600 outline-none focus:border-emerald-400/50"
                            />
                            <button
                              type="button"
                              onClick={() => void handleCenterPaymentRequest()}
                              disabled={isProcessing}
                              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-bold text-white transition-all hover:bg-emerald-500 disabled:opacity-60"
                            >
                              {isProcessing ? (
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                              ) : (
                                <Building2 className="h-4 w-4" />
                              )}
                              Confirmer ma demande au centre
                              <ArrowRight className="h-4 w-4 ml-auto" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>


                    {/* ───────────────────────────────────────────────────────────
                        CARD 3: Code d'Accès Administrateur (Code fourni par le centre)
                       ─────────────────────────────────────────────────────────── */}
                    <div className="relative flex flex-col justify-between rounded-2xl border border-violet-400/30 bg-gradient-to-b from-violet-500/[0.08] via-slate-900/60 to-slate-950/80 p-6 shadow-xl transition-all duration-300 hover:border-violet-400/50">
                      <div>
                        {/* Top Badge */}
                        <div className="flex items-center justify-between mb-4">
                          <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/30 bg-violet-500/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-300">
                            <KeyRound className="h-3 w-3 text-violet-400" /> Code d&apos;Accès
                          </span>
                        </div>

                        {/* Title & Subtitle */}
                        <h3 className="text-xl font-bold text-white">Code Administrateur</h3>
                        <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                          Code d&apos;accès fourni par l&apos;administration. Débloque le module sur sa période attribuée.
                        </p>

                        {/* Pricing */}
                        <div className="mt-5 pb-5 border-b border-white/[0.08]">
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black tracking-tight text-violet-200">
                              Accès Offert
                            </span>
                          </div>
                          <span className="mt-1 inline-flex rounded-md bg-violet-500/15 px-2 py-0.5 text-[10px] font-bold text-violet-300">
                            Sans frais en ligne
                          </span>
                        </div>

                        {/* Features Bullet List */}
                        <ul className="mt-5 space-y-3 text-xs text-slate-300">
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-violet-400 mt-0.5" />
                            <span>Code à usage unique attribué par le centre</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-violet-400 mt-0.5" />
                            <span>Dates de début et de fin fixées par l&apos;administration</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-violet-400 mt-0.5" />
                            <span>Activation instantanée dès la saisie</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-violet-400 mt-0.5" />
                            <span>Accès complet pendant toute la période définie</span>
                          </li>
                        </ul>
                      </div>

                      {/* Bottom Action Area */}
                      <div className="mt-6 pt-4 border-t border-white/[0.06]">
                        {accessCodeValidated ? (
                          <div className="space-y-3 text-center">
                            <div className="flex items-center justify-center gap-1.5 text-xs text-violet-300 font-bold">
                              <CheckCircle2 className="h-4 w-4" /> Code validé ✓
                            </div>
                            <div className="rounded-xl bg-black/60 p-2 font-mono text-sm font-black text-violet-200 tracking-wider">
                              {accessCode}
                            </div>
                            <button
                              type="button"
                              onClick={() => void handleActivateWithCode()}
                              disabled={isProcessing}
                              className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3.5 text-sm font-bold text-white transition-all hover:bg-violet-500 disabled:opacity-60"
                            >
                              {isProcessing ? (
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                              ) : (
                                <KeyRound className="h-4 w-4" />
                              )}
                              Activer mon accès
                              <ArrowRight className="h-4 w-4 ml-auto" />
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="relative">
                              <KeyRound className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-violet-400" />
                              <input
                                type="text"
                                placeholder="EX: ACCES-ABCD-1234"
                                value={accessCode}
                                onChange={(e) => {
                                  setAccessCode(e.target.value.toUpperCase());
                                  setAccessCodeError("");
                                  setAccessCodeValidated(false);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") void handleValidateAccessCode();
                                }}
                                className="w-full rounded-xl border border-white/10 bg-black/40 pl-9 pr-20 py-2.5 font-mono text-xs uppercase text-white placeholder:text-slate-600 outline-none focus:border-violet-400/50"
                              />
                              <button
                                type="button"
                                onClick={() => void handleValidateAccessCode()}
                                disabled={isValidatingCode || !accessCode.trim()}
                                className="absolute right-1 top-1 bottom-1 rounded-lg bg-violet-600 px-3 text-[11px] font-bold text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
                              >
                                {isValidatingCode ? "..." : "Valider"}
                              </button>
                            </div>

                            {accessCodeError && (
                              <p className="text-xs font-medium text-red-400">{accessCodeError}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* General Payment Error display */}
              {paymentError && (
                <div className="mx-6 mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                  {paymentError}
                </div>
              )}

              {/* Footer strip */}
              <div className="shrink-0 border-t border-white/[0.08] px-6 py-4 bg-black/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                <p className="flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-emerald-400" />
                  Transaction &amp; activation sécurisées sur la plateforme Performance Académique.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-slate-400 hover:text-white font-medium"
                >
                  Fermer
                </button>
              </div>
            </>
          )}

          {step === "loading" && (
            <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
              <div className="relative h-16 w-16">
                <div className="absolute inset-0 rounded-full border-2 border-white/10" />
                <div className="absolute inset-0 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
              </div>
              <h3 className="mt-6 text-xl font-bold text-white">Validation de votre accès</h3>
              <p className="mt-2 max-w-sm text-sm text-slate-400">
                Activation sécurisée de votre module. Veuillez patienter sans fermer la page.
              </p>
            </div>
          )}

          {step === "success" && (
            <div className="flex flex-col items-center px-6 py-16 text-center animate-in zoom-in-95 duration-300">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h3 className="mt-6 text-2xl font-bold text-white">Félicitations ! Accès Activé</h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-300">
                Votre accès au module <span className="font-semibold text-emerald-300">{course.title}</span> est maintenant débloqué. Vous pouvez démarrer vos cours immédiatement.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/25 transition-all hover:bg-emerald-500"
              >
                Accéder à mes cours
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
