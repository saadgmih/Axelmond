import React from "react";
import { Check, Crown, Download, Eye, Sparkles, ShieldCheck, Smartphone, X, Zap } from "lucide-react";

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
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200"
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
            Libérez toute la puissance de la suite de lecture académique
          </p>
        </div>

        {/* Key Features List */}
        <div className="mt-6 space-y-3">
          <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 sm:p-3.5">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300">
              <Eye className="h-3.5 w-3.5" />
            </div>
            <div className="text-left text-xs sm:text-sm">
              <strong className="block font-bold text-amber-200">
                Suppression du Filigrane & du Logo
              </strong>
              <span className="text-slate-400 text-xs">
                Lecture cristalline sans filigrane ni badge superposé sur les documents.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-[#0e1523] p-3 sm:p-3.5">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div className="text-left text-xs sm:text-sm">
              <strong className="block font-bold text-slate-200">
                Suite d’Annotations Avancées & Stylet
              </strong>
              <span className="text-slate-400 text-xs">
                Surlignage multicouleur, tracé fluide manuscrit, sauvegarde permanente de vos révisions.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-[#0e1523] p-3 sm:p-3.5">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400">
              <Download className="h-3.5 w-3.5" />
            </div>
            <div className="text-left text-xs sm:text-sm">
              <strong className="block font-bold text-slate-200">
                Exportation PDF Haute Définition
              </strong>
              <span className="text-slate-400 text-xs">
                Exportez vos documents annotés pour impression ou révision hors-connexion.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-[#0e1523] p-3 sm:p-3.5">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400">
              <Smartphone className="h-3.5 w-3.5" />
            </div>
            <div className="text-left text-xs sm:text-sm">
              <strong className="block font-bold text-slate-200">
                Synchronisation Android, iPhone & PC
              </strong>
              <span className="text-slate-400 text-xs">
                Retrouvez automatiquement vos annotations sur votre smartphone et tablette.
              </span>
            </div>
          </div>
        </div>

        {/* Pricing / Status Cards */}
        <div className="mt-6 grid grid-cols-2 gap-3 text-left">
          <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent p-3 relative">
            <span className="absolute -top-2.5 right-3 rounded-full bg-amber-500 px-2 py-0.5 text-[9px] font-black text-slate-950 uppercase tracking-wide">
              Recommandé
            </span>
            <div className="text-[11px] font-semibold text-slate-400">Abonnement Annuel</div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-lg sm:text-xl font-black text-amber-300">199 MAD</span>
              <span className="text-[10px] text-slate-500">/ an</span>
            </div>
            <div className="mt-1 text-[10px] text-emerald-400 font-bold">Économisez 40%</div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
            <div className="text-[11px] font-semibold text-slate-400">Pass Mensuel</div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-lg sm:text-xl font-black text-slate-200">29 MAD</span>
              <span className="text-[10px] text-slate-500">/ mois</span>
            </div>
            <div className="mt-1 text-[10px] text-slate-400">Sans engagement</div>
          </div>
        </div>

        {/* Action Button & Toggle */}
        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => {
              onTogglePro();
              onClose();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 py-3.5 text-xs sm:text-sm font-black text-slate-950 shadow-[0_10px_25px_rgba(245,158,11,0.35)] transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {isPro ? (
              <>
                <Check className="h-4 w-4 stroke-[3]" />
                Désactiver le statut Pro (Actuellement VIP)
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 fill-slate-950" />
                Activer UniOffice Pro (Supprimer filigrane)
              </>
            )}
          </button>

          <p className="text-center text-[10px] text-slate-400">
            Activation instantanée • Paiement sécurisé CMI / Carte Bancaire ou WhatsApp
          </p>
        </div>
      </div>
    </div>
  );
};

export default UniOfficeProModal;
