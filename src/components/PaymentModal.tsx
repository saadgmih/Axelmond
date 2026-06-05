import React, { useState } from "react";
import { X, CreditCard, Shield, CheckCircle, Ticket } from "lucide-react";
import { Course } from "../types";
import { api } from "../api";

interface PaymentModalProps {
  course: Course | null;
  onClose: () => void;
  onSuccess: (courseId: number, amountPaid: number) => void | Promise<void>;
}

export default function PaymentModal({ course, onClose, onSuccess }: PaymentModalProps) {
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(0); // in percent
  const [promoError, setPromoError] = useState("");
  const [promoSuccess, setPromoSuccess] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<"form" | "loading" | "success">("form");
  const [paymentError, setPaymentError] = useState("");

  if (!course) return null;

  // Code promo "AXELMOND20" -> 20%
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

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      return parts.join(" ");
    } else {
      return v;
    }
  };

  const handleCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCardNumber(formatCardNumber(e.target.value));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^0-9]/g, "");
    if (value.length > 2) {
      value = value.substring(0, 2) + "/" + value.substring(2, 4);
    }
    setExpiry(value.substring(0, 5));
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCvv(e.target.value.replace(/[^0-9]/g, "").substring(0, 3));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cardNumber.length < 19 || expiry.length < 5 || cvv.length < 3 || !cardHolder) {
      alert("Veuillez remplir correctement les détails de carte.");
      return;
    }

    setStep("loading");
    setIsProcessing(true);
    setPaymentError("");

    try {
      const checkout = await api.createCheckoutSession(course.id);
      if (checkout?.url) {
        window.location.assign(checkout.url);
        return;
      }
      setPaymentError("Session Stripe indisponible.");
      setStep("form");
    } catch (err: any) {
      if (err?.status === 503) {
        setTimeout(() => {
          setIsProcessing(false);
          setStep("success");
        }, 1500);
        return;
      }
      setPaymentError(err?.message || "Impossible de démarrer le paiement Stripe.");
      setStep("form");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSuccessClose = async () => {
    setPaymentError("");
    setIsProcessing(true);
    try {
      await onSuccess(course.id, finalPrice);
      onClose();
    } catch (err: any) {
      setPaymentError(err?.message || "Synchronisation de l'inscription impossible.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transition-all transform scale-100 border border-slate-100 animate-in fade-in duration-200">
        
        {/* Step: PAYMENT FORM */}
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
              <p className="text-slate-400 text-sm">Débloquez l'accès complet au module : <span className="text-white font-medium">{course.title}</span>.</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              
              {/* Recapitulation prices */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800 text-base">Abonnement Mensuel</p>
                  <p className="text-xs text-slate-500">Résiliable en 1 clic à tout moment</p>
                </div>
                <div className="text-right">
                  {appliedDiscount > 0 && (
                    <p className="text-sm text-slate-400 line-through font-medium">{originalPrice.toFixed(2)}€</p>
                  )}
                  <p className="text-2xl font-black text-indigo-600">
                    {finalPrice.toFixed(2)}€
                    <span className="text-xs text-slate-400 font-semibold"> / mois</span>
                  </p>
                </div>
              </div>

              {/* Promo code field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Code Promo</label>
                <div className="flex gap-2">
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
                {appliedDiscount === 0 && (
                  <p className="text-[11px] text-indigo-600 font-medium">Astuce académique : utilisez le code <strong>AXELMOND20</strong> pour économiser 20%.</p>
                )}
              </div>

              <div className="border-t border-slate-100 my-4 pt-4 space-y-4">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Informations de carte de crédit</p>
                
                {/* Holder */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-medium">Nom disponible sur la carte</label>
                  <input
                    type="text"
                    required
                    placeholder="Nom complet"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {/* Card Number */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-medium">Numéro de carte</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="4242 4242 4242 4242"
                      value={cardNumber}
                      onChange={handleCardChange}
                      className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <CreditCard className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 font-medium">Date d'Expiration</label>
                    <input
                      type="text"
                      required
                      placeholder="MM/AA"
                      value={expiry}
                      onChange={handleExpiryChange}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 font-medium">CVV (Code secret)</label>
                    <input
                      type="password"
                      required
                      placeholder="•••"
                      value={cvv}
                      onChange={handleCvvChange}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-1/3 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all text-center"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-2/3 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm shadow-md shadow-indigo-100 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
                >
                  <CreditCard className="w-4 h-4" /> S'abonner — {finalPrice.toFixed(2)}€ / mois
                </button>
              </div>

              <p className="text-center text-[10px] text-slate-400 flex items-center justify-center gap-1 mt-2">
                <Shield className="w-3.5 h-3.5" /> Paiement sécurisé via Stripe Checkout. En développement sans Stripe, l'inscription mock reste disponible.
              </p>
            </form>
          </div>
        )}

        {/* Step: LOADING SPLASH */}
        {step === "loading" && (
          <div className="p-12 text-center space-y-6">
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
              <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">Validation de la transaction...</h3>
              <p className="text-slate-500 text-sm mt-1.5 max-w-xs mx-auto">
                Communication sécurisée avec les serveurs d'autorisation Stripe bancaire. Veuillez patienter.
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-100 py-3 px-4 rounded-xl text-slate-400 text-xs font-mono max-w-xs mx-auto">
              POST https://api.stripe.com/v3/subscriptions
            </div>
          </div>
        )}

        {/* Step: SUCCESS STATUS */}
        {step === "success" && (
          <div className="p-10 text-center space-y-6 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 shadow-md border border-emerald-200">
              <CheckCircle className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 leading-tight">Merci pour votre confiance !</h3>
              <p className="text-slate-500 text-sm mt-2">
                Votre abonnement mensuel au module <strong className="text-slate-800 font-semibold">{course.title}</strong> a bien été activé. Les crédits ARL et les vidéos sont maintenant débloqués.
              </p>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 py-4 px-6 rounded-2xl max-w-sm mx-auto space-y-2 text-left">
              <div className="flex justify-between text-xs text-slate-600 font-medium">
                <span>Date de facturation :</span>
                <span className="text-slate-800 font-bold">{new Date().toLocaleDateString("fr-FR")}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-600 font-medium">
                <span>Montant prélevé (Simulé) :</span>
                <span className="text-slate-800 font-bold">{finalPrice.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between text-xs text-slate-600 font-medium border-t border-emerald-200 pt-2">
                <span>État de la transaction :</span>
                <span className="text-semibold text-emerald-700 flex items-center gap-1">🟢 Approuvée</span>
              </div>
            </div>
            <button
              onClick={handleSuccessClose}
              disabled={isProcessing}
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm shadow-lg transition-transform hover:scale-105"
            >
              {isProcessing ? "Synchronisation..." : "Accéder au module immédiatement"}
            </button>
            {paymentError && <p className="text-xs font-semibold text-red-500">{paymentError}</p>}
          </div>
        )}

      </div>
    </div>
  );
}
