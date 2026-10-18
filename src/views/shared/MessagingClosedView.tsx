import { MessageSquareOff, ArrowLeft, ShieldAlert } from "lucide-react";

interface MessagingClosedViewProps {
  onBackToDashboard: () => void;
  role?: "student" | "teacher";
}

export function MessagingClosedView({ onBackToDashboard }: MessagingClosedViewProps) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4 md:p-8">
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 p-8 text-center shadow-2xl backdrop-blur-xl sm:p-12">
        {/* Ambient glow effect */}
        <div className="pointer-events-none absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-teal-500/10 blur-3xl" />

        {/* Icon */}
        <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 text-emerald-400 shadow-inner">
          <MessageSquareOff className="h-10 w-10" />
        </div>

        {/* Badge */}
        <div className="relative mb-4 inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-300">
          <ShieldAlert className="h-3.5 w-3.5" />
          <span>Section temporairement fermée</span>
        </div>

        {/* Title */}
        <h2 className="relative text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          Messagerie momentanément indisponible
        </h2>

        {/* Description */}
        <p className="relative mx-auto mt-4 max-w-md text-sm leading-relaxed text-slate-300 sm:text-base">
          L&apos;espace de messagerie instantanée est actuellement suspendu pour des raisons de maintenance et d&apos;optimisation technique.
          Vos cours, vidéos et ressources pédagogiques restent pleinement accessibles.
        </p>

        {/* Return Button */}
        <div className="relative mt-8">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="kbd-nav-focus inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 font-semibold text-white shadow-lg shadow-emerald-950/40 transition-all hover:from-emerald-500 hover:to-teal-500 hover:shadow-emerald-900/50 active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Retour à l&apos;accueil</span>
          </button>
        </div>
      </div>
    </div>
  );
}
