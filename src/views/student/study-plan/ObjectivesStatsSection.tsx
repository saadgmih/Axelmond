import { AlertTriangle, CheckCircle2, Clock3, Flame, Headphones, Target } from "lucide-react";
import type { ReactNode } from "react";
import type { StudentObjectiveView } from "../../../hooks/useStudentObjectives";
import { formatDateTime } from "./study-plan-utils";

function ProductivityStatCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-white/[0.08] bg-[#0f172a]/80 p-4 shadow-xl shadow-black/20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-black text-white">{value}</p>
          <p className="mt-1 text-[11px] font-semibold text-slate-400">{detail}</p>
        </div>
        <div className="rounded-xl border border-cyan-400/10 bg-cyan-500/10 p-2 text-cyan-200">{icon}</div>
      </div>
    </article>
  );
}

export function ObjectivesStatsSection({
  weeklyProgress,
  stats,
  streak,
  dueSoonObjectives,
  overdueObjectives,
}: {
  weeklyProgress: { percent: number; completed: number; created: number };
  stats: { totalCreated: number; totalCompleted: number; overdue: number; successRate: number };
  streak: { days: number };
  dueSoonObjectives: StudentObjectiveView[];
  overdueObjectives: StudentObjectiveView[];
}) {
  return (
    <>
      <section className="rounded-2xl border border-white/[0.08] bg-[#020617] p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-cyan-300">Progression hebdomadaire</p>
            <h2 className="mt-1 text-xl font-black text-white">
              {weeklyProgress.percent}% des objectifs terminés cette semaine
            </h2>
            <p className="mt-1 text-xs font-semibold text-slate-400">
              {weeklyProgress.completed} terminé(s) sur {weeklyProgress.created} créé(s) cette semaine.
            </p>
          </div>
          <div className="min-w-0 flex-1 lg:max-w-md">
            <div className="h-3 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-500"
                style={{ width: `${weeklyProgress.percent}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ProductivityStatCard
          label="Créés"
          value={stats.totalCreated}
          detail="Objectifs au total"
          icon={<Target className="h-5 w-5" />}
        />
        <ProductivityStatCard
          label="Terminés"
          value={stats.totalCompleted}
          detail="Objectifs validés"
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <ProductivityStatCard
          label="En retard"
          value={stats.overdue}
          detail="À rattraper maintenant"
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <ProductivityStatCard
          label="Réussite"
          value={`${stats.successRate}%`}
          detail={`Streak ${streak.days} jour(s)`}
          icon={<Flame className="h-5 w-5" />}
        />
      </section>

      {(dueSoonObjectives.length > 0 || overdueObjectives.length > 0) && (
        <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {overdueObjectives.length > 0 && (
            <div className="rounded-2xl border border-red-500/20 bg-red-950/20 p-4">
              <h2 className="inline-flex items-center gap-2 text-sm font-black text-red-200">
                <AlertTriangle className="h-4 w-4" />
                Objectifs en retard
              </h2>
              <div className="mt-3 space-y-2">
                {overdueObjectives.slice(0, 3).map((objective) => (
                  <p key={objective.id} className="text-xs font-semibold text-red-100/90">
                    {objective.title} · {formatDateTime(objective.endAt)}
                  </p>
                ))}
              </div>
            </div>
          )}
          {dueSoonObjectives.length > 0 && (
            <div className="rounded-2xl border border-amber-400/20 bg-amber-950/20 p-4">
              <h2 className="inline-flex items-center gap-2 text-sm font-black text-amber-200">
                <Clock3 className="h-4 w-4" />
                Proches de la date limite
              </h2>
              <div className="mt-3 space-y-2">
                {dueSoonObjectives.slice(0, 3).map((objective) => (
                  <p key={objective.id} className="text-xs font-semibold text-amber-100/90">
                    {objective.title} · {formatDateTime(objective.endAt)}
                  </p>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-cyan-400/10 bg-[#0f172a]/70 p-4 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-black text-white">Écoute / concentration</h2>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-400">
              Ajoutez, pour chaque objectif, un podcast, une vidéo éducative, un rappel audio ou toute ressource utile.
              Le choix du contenu appartient à l'étudiant.
            </p>
          </div>
          <Headphones className="hidden h-8 w-8 text-cyan-300 sm:block" />
        </div>
      </section>
    </>
  );
}
