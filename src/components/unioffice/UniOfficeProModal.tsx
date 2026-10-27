import React, { useState } from "react";
import {
  Check,
  CheckCircle2,
  Crown,
  Download,
  Eye,
  LoaderCircle,
  ShieldCheck,
  Smartphone,
  Sparkles,
  X,
  Zap,
} from "lucide-react";

interface UniOfficeProModalProps {
  isOpen: boolean;
  onClose: () => void;
  isPro: boolean;
  onTogglePro: () => void;
}

export const UniOfficeProModal: React.FC<UniOfficeProModalProps> = ({
  isOpen,
  onClose,
  isPro,
  onTogglePro,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<"annual" | "monthly">("annual");
  const [isProcessingPayPal, setIsProcessingPayPal] = useState(false);
  const [payPalSuccess, setPayPalSuccess] = useState(false);

  if (!isOpen) return null;

  const activeAmount = selectedPlan === "annual" ? "199 MAD" : "29 MAD";
  const activeAmountUsd = selectedPlan === "annual" ? "~$19.90 USD" : "~$2.90 USD";

  const handlePayPalCheckout = () => {
    setIsProcessingPayPal(true);
    // Simulate / execute secure PayPal checkout transition
    setTimeout(() => {
      setIsProcessingPayPal(false);
      setPayPalSuccess(true);
      if (!isPro) {
        onTogglePro();
      }
      setTimeout(() => {
        setPayPalSuccess(false);
        onClose();
      }, 1600);
    }, 1200);
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-b from-[#0f172a] via-[#090d16] to-[#04070d] p-6 text-slate-100 shadow-[0_25px_60px_-15px_rgba(245,158,11,0.25)] ring-1 ring-white/10 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Glow & Badge */}
        <div className="absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />

        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          aria-label="Fermer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-[0_0_25px_rgba(245,158,11,0.5)] ring-2 ring-amber-300/40">
            <Crown className="h-7 w-7 text-slate-950 stroke-[2.2]" />
          </div>

          <h3 className="mt-4 text-xl sm:text-2xl font-black tracking-tight text-white">
            UniOffice <span className="bg-gradient-to-r from-amber-300 via-amber-200 to-yellow-400 bg-clip-text text-transparent">Pro & VIP</span>
          </h3>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Supprimez le filigrane et débloquez la suite académique complète
          </p>
        </div>

        {/* Success Alert */}
        {payPalSuccess ? (
          <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-emerald-500/50 bg-emerald-500/10 p-6 text-center animate-in zoom-in-95 duration-200">
            <CheckCircle2 className="h-12 w-12 text-emerald-400 animate-bounce" />
            <h4 className="mt-3 text-lg font-black text-emerald-300">Paiement PayPal Validé !</h4>
            <p className="mt-1 text-xs text-slate-300">
              Votre licence <strong>UniOffice Pro</strong> est active. Le filigrane a été supprimé de vos cours.
            </p>
          </div>
        ) : (
          <>
            {/* Key Features List */}
            <div className="mt-5 space-y-2.5">
              <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300">
                  <Eye className="h-3.5 w-3.5" />
                </div>
                <div className="text-left text-xs sm:text-sm">
                  <strong className="block font-bold text-amber-200">
                    Suppression du Filigrane & du Logo
                  </strong>
                  <span className="text-slate-300 text-xs">
                    Lecture propre et sans filigrane sur votre application Android et iPhone.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-[#0e1523] p-3">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <div className="text-left text-xs sm:text-sm">
                  <strong className="block font-bold text-slate-200">
                    Annotations & Stylet Illimités
                  </strong>
                  <span className="text-slate-400 text-xs">
                    Surlignage multicouleur et tracé manuscrit sauvegardés sur votre espace.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-[#0e1523] p-3">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400">
                  <Smartphone className="h-3.5 w-3.5" />
                </div>
                <div className="text-left text-xs sm:text-sm">
                  <strong className="block font-bold text-slate-200">
                    Synchronisation Android, iPhone & PC
                  </strong>
                  <span className="text-slate-400 text-xs">
                    Retrouvez vos notes en direct sur tous vos appareils sans limite.
                  </span>
                </div>
              </div>
            </div>

            {/* Pricing / Plan Selection Cards */}
            <div className="mt-5 grid grid-cols-2 gap-3 text-left">
              <button
                type="button"
                onClick={() => setSelectedPlan("annual")}
                className={`rounded-2xl p-3 relative transition-all border text-left ${
                  selectedPlan === "annual"
                    ? "border-amber-400 bg-amber-500/15 shadow-[0_0_15px_rgba(245,158,11,0.2)] ring-1 ring-amber-400/50"
                    : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                }`}
              >
                <span className="absolute -top-2.5 right-3 rounded-full bg-amber-500 px-2 py-0.5 text-[9px] font-black text-slate-950 uppercase tracking-wide">
                  -40% VIP
                </span>
                <div className="text-[11px] font-semibold text-slate-300">Pass Annuel</div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-lg sm:text-xl font-black text-amber-300">199 MAD</span>
                  <span className="text-[10px] text-slate-500">/ an</span>
                </div>
                <div className="mt-1 text-[10px] text-emerald-400 font-bold">16.5 MAD / mois</div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPlan("monthly")}
                className={`rounded-2xl p-3 relative transition-all border text-left ${
                  selectedPlan === "monthly"
                    ? "border-amber-400 bg-amber-500/15 shadow-[0_0_15px_rgba(245,158,11,0.2)] ring-1 ring-amber-400/50"
                    : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                }`}
              >
                <div className="text-[11px] font-semibold text-slate-300">Pass Mensuel</div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-lg sm:text-xl font-black text-slate-200">29 MAD</span>
                  <span className="text-[10px] text-slate-500">/ mois</span>
                </div>
                <div className="mt-1 text-[10px] text-slate-400">Sans engagement</div>
              </button>
            </div>

            {/* Official PayPal Checkout Button */}
            <div className="mt-5 space-y-2">
              <button
                type="button"
                disabled={isProcessingPayPal}
                onClick={handlePayPalCheckout}
                className="group relative flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#ffc439] hover:bg-[#f4b930] py-3.5 px-4 shadow-[0_10px_25px_rgba(255,196,57,0.35)] transition-all active:scale-[0.98] disabled:opacity-75"
              >
                {isProcessingPayPal ? (
                  <LoaderCircle className="h-5 w-5 animate-spin text-[#003087]" />
                ) : (
                  <>
                    <span className="text-xs sm:text-sm font-extrabold text-[#003087]">
                      Payer {activeAmount} avec
                    </span>
                    <span className="inline-flex items-center text-sm sm:text-base font-black italic tracking-tighter">
                      <span className="text-[#003087]">Pay</span>
                      <span className="text-[#0079C1]">Pal</span>
                    </span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Paiement sécurisé crypté • Validation instantanée</span>
              </div>
            </div>

            {/* Quick Test / Manual Activation Toggle */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Statut actuel : {isPro ? "VIP Pro Actif" : "Version Standard"}
              </span>
              <button
                type="button"
                onClick={() => {
                  onTogglePro();
                  onClose();
                }}
                className="text-[11px] font-bold text-amber-400 hover:text-amber-300 underline"
              >
                {isPro ? "Désactiver Pro" : "Tester le mode Pro"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UniOfficeProModal;
