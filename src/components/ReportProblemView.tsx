import { AlertTriangle, ArrowLeft, ShieldAlert } from "lucide-react";
import SupportTicketForm from "./SupportTicketForm";

interface ReportProblemViewProps {
  navigateTo: (view: string) => void;
}

export default function ReportProblemView({ navigateTo }: ReportProblemViewProps) {
  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-8 animate-in fade-in duration-200">
      <div className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-slate-900 rounded-3xl p-6 md:p-8 text-white border border-amber-900/40 shadow-lg space-y-4">
        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full inline-block">
          Signalement technique
        </span>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight">Signaler un problème</h1>
        <p className="text-slate-300 text-sm leading-relaxed">
          Utilisez ce formulaire pour signaler un bug, une erreur d&apos;affichage ou un dysfonctionnement sur la plateforme.
          Pour consulter les réponses aux questions fréquentes, rendez-vous sur le centre d&apos;aide.
        </p>
        <button
          type="button"
          onClick={() => navigateTo("support")}
          className="inline-flex items-center gap-2 text-xs font-bold text-indigo-300 hover:text-indigo-200"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour au centre d&apos;aide (FAQ)
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-amber-900/30 bg-amber-950/20 p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-amber-200">Problème technique</p>
            <p className="text-[11px] text-slate-400 mt-1">Vidéo, live, quiz, connexion, lenteur...</p>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 flex gap-3">
          <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-slate-200">Sécurité</p>
            <p className="text-[11px] text-slate-400 mt-1">Anomalie de sécurité ou accès suspect</p>
          </div>
        </div>
      </div>

      <SupportTicketForm defaultCategory="Support Technique" submitLabel="Envoyer le signalement" />
    </div>
  );
}
