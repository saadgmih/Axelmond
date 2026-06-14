import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Flame,
  Headphones,
  Pencil,
  Plus,
  RotateCcw,
  Target,
  TrendingUp,
  Trash2,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import type { UseStudentObjectivesOptions } from "../../hooks/useStudentObjectives";
import { type StudentObjectiveView, useStudentObjectives } from "../../hooks/useStudentObjectives";
import { FOCUS_CONTENT_TYPES, STUDENT_OBJECTIVE_RECURRENCES, STUDENT_OBJECTIVE_TYPES } from "../../student-objectives";
import { scheduleUi } from "../teacher/schedule-theme";

type StudentObjectivesViewProps = UseStudentObjectivesOptions;

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatMonthLabel(value: string) {
  if (!value) return "Mois courant";
  return new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(new Date(`${value}-01T00:00:00`));
}

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

function ObjectiveCard({
  objective,
  completed,
  onEdit,
  onDelete,
  onComplete,
}: {
  key?: string;
  objective: StudentObjectiveView;
  completed: boolean;
  onEdit: (objective: StudentObjectiveView) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
}) {
  return (
    <article className={`${scheduleUi.sessionCard} flex flex-col gap-3`} data-tv-focusable>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className={scheduleUi.sessionTitle}>{objective.title}</h3>
          {objective.objectiveTypeLabel && (
            <span className={`${scheduleUi.typeBadge} mt-2 inline-flex`}>{objective.objectiveTypeLabel}</span>
          )}
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${
            completed
              ? "border border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
              : "border border-amber-400/20 bg-amber-500/10 text-amber-200"
          }`}
        >
          {objective.statusLabel}
        </span>
      </div>

      {objective.description && <p className={`${scheduleUi.sessionMeta} line-clamp-3`}>{objective.description}</p>}

      {objective.recurrence && objective.recurrence !== "NONE" && (
        <p className="inline-flex w-fit items-center gap-1 rounded-full border border-violet-400/20 bg-violet-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-violet-200">
          <RotateCcw className="h-3 w-3" />
          {objective.recurrenceLabel}
        </p>
      )}

      <div className="grid grid-cols-1 gap-2 text-[11px] font-semibold text-slate-400 sm:grid-cols-2">
        <p className="inline-flex items-center gap-1">
          <Clock3 className="h-3.5 w-3.5 text-indigo-300" />
          Début : {formatDateTime(objective.startAt)}
        </p>
        <p className="inline-flex items-center gap-1">
          <Target className="h-3.5 w-3.5 text-violet-300" />
          Fin : {formatDateTime(objective.endAt)}
        </p>
      </div>

      {(objective.focusContentTitle || objective.focusContentUrl) && (
        <div className="rounded-xl border border-cyan-400/10 bg-cyan-500/5 p-3">
          <p className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-cyan-200">
            <Headphones className="h-3.5 w-3.5" />
            Écoute / concentration
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-300">
            {objective.focusContentTitle || "Contenu choisi par l'étudiant"}
          </p>
          {objective.focusContentTypeLabel && (
            <p className="mt-1 text-[11px] text-slate-500">{objective.focusContentTypeLabel}</p>
          )}
          {objective.focusContentUrl && (
            <a
              href={objective.focusContentUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-cyan-200 hover:text-cyan-100"
            >
              Ouvrir le contenu
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}

      <div className={scheduleUi.sessionActions}>
        {!completed && (
          <button type="button" className={scheduleUi.editBtn} onClick={() => onComplete(objective.id)}>
            <CheckCircle2 className="mr-1 inline h-3.5 w-3.5 text-emerald-300" />
            Terminer
          </button>
        )}
        <button type="button" className={scheduleUi.editBtn} onClick={() => onEdit(objective)}>
          <Pencil className="mr-1 inline h-3.5 w-3.5" />
          Modifier
        </button>
        <button type="button" className={scheduleUi.deleteBtn} onClick={() => onDelete(objective.id)}>
          <Trash2 className="mr-1 inline h-3.5 w-3.5" />
          Supprimer
        </button>
      </div>
    </article>
  );
}

export default function StudentObjectivesView(props: StudentObjectivesViewProps) {
  const {
    inProgressObjectives,
    completedObjectives,
    isLoading,
    statusMsg,
    errorMsg,
    isFormOpen,
    editingObjectiveId,
    form,
    setForm,
    isSaving,
    weeklyProgress,
    stats,
    calendarDays,
    streak,
    dueSoonObjectives,
    overdueObjectives,
    openCreateForm,
    openEditForm,
    closeForm,
    handleSaveObjective,
    handleCompleteObjective,
    handleDeleteObjective,
  } = useStudentObjectives(props);

  return (
    <div className={scheduleUi.page} data-tv-zone="student-objectives">
      <section className={scheduleUi.hero}>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-600/20 via-indigo-600/15 to-transparent" />
        <div className={scheduleUi.heroInner}>
          <div>
            <h1 className={scheduleUi.heroTitle}>Objectifs</h1>
            <p className={scheduleUi.heroSubtitle}>
              Organisez vos objectifs d'étude, suivez vos priorités et choisissez librement les contenus qui vous aident
              à rester concentré.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-cyan-950/30 transition-all hover:from-cyan-500 hover:to-indigo-500 active:scale-[0.98]"
            onClick={openCreateForm}
          >
            <Plus className="h-4 w-4" />
            Ajouter un objectif
          </button>
        </div>
      </section>

      {statusMsg && <div className={scheduleUi.alertSuccess}>{statusMsg}</div>}
      {errorMsg && <div className={scheduleUi.alertError}>{errorMsg}</div>}

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

      <section className="rounded-2xl border border-white/[0.08] bg-[#0f172a]/70 p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="inline-flex items-center gap-2 text-base font-black text-white">
              <CalendarDays className="h-4 w-4 text-cyan-300" />
              Calendrier des objectifs
            </h2>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {formatMonthLabel(calendarDays[0]?.date?.slice(0, 7) || "")}
            </p>
          </div>
          <p className="inline-flex items-center gap-1 text-xs font-bold text-slate-400">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-300" />
            Série productive : {streak.days} jour(s)
          </p>
        </div>
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {calendarDays.map((day) => (
            <div
              key={day.date}
              className={`min-h-[56px] rounded-xl border p-2 text-[10px] ${
                day.overdueCount > 0
                  ? "border-red-500/20 bg-red-950/20 text-red-100"
                  : day.dueSoonCount > 0
                    ? "border-amber-400/20 bg-amber-950/20 text-amber-100"
                    : day.objectiveCount > 0
                      ? "border-cyan-400/20 bg-cyan-950/20 text-cyan-100"
                      : "border-white/[0.06] bg-[#020617]/60 text-slate-500"
              }`}
              title={`${day.objectiveCount} objectif(s)`}
            >
              <span className="font-black">{day.dayOfMonth}</span>
              {day.objectiveCount > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  <span className="rounded-full bg-white/10 px-1.5 py-0.5 font-bold">{day.objectiveCount}</span>
                  {day.completedCount > 0 && (
                    <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 font-bold">
                      {day.completedCount} OK
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {isLoading ? (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0f172a]/70 px-6 py-10 text-center text-sm font-semibold text-slate-400">
          Chargement de vos objectifs...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-black text-white">Objectifs en cours</h2>
              <p className="text-xs font-semibold text-slate-500">{inProgressObjectives.length} objectif(s) à suivre</p>
            </div>
            {inProgressObjectives.length === 0 ? (
              <div className={scheduleUi.emptyDay}>
                Aucun objectif en cours. Ajoutez votre prochain objectif d'étude.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {inProgressObjectives.map((objective) => (
                  <ObjectiveCard
                    key={objective.id}
                    objective={objective}
                    completed={false}
                    onEdit={openEditForm}
                    onDelete={handleDeleteObjective}
                    onComplete={handleCompleteObjective}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-black text-white">Objectifs terminés</h2>
              <p className="text-xs font-semibold text-slate-500">{completedObjectives.length} objectif(s) validé(s)</p>
            </div>
            {completedObjectives.length === 0 ? (
              <div className={scheduleUi.emptyDay}>Les objectifs cochés comme terminés apparaîtront ici.</div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {completedObjectives.map((objective) => (
                  <ObjectiveCard
                    key={objective.id}
                    objective={objective}
                    completed
                    onEdit={openEditForm}
                    onDelete={handleDeleteObjective}
                    onComplete={handleCompleteObjective}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {isFormOpen && (
        <div
          className={scheduleUi.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="student-objective-form-title"
        >
          <div className={scheduleUi.modalPanel}>
            <div className={scheduleUi.modalHeader}>
              <div className="flex items-center justify-between gap-3">
                <h2 id="student-objective-form-title" className={scheduleUi.modalTitle}>
                  {editingObjectiveId ? "Modifier l'objectif" : "Ajouter un objectif"}
                </h2>
                <button type="button" className={scheduleUi.editBtn} onClick={closeForm} aria-label="Fermer">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className={scheduleUi.modalBody}>
              <label className="space-y-2">
                <span className={scheduleUi.label}>Titre de l'objectif</span>
                <input
                  className={scheduleUi.input}
                  value={form.title}
                  onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
                  placeholder="Cette semaine je veux terminer le chapitre 1"
                />
              </label>

              <label className="space-y-2">
                <span className={scheduleUi.label}>Description optionnelle</span>
                <textarea
                  className={scheduleUi.textarea}
                  value={form.description}
                  onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
                  placeholder="Ajoutez des détails, ressources ou consignes personnelles..."
                />
              </label>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className={scheduleUi.label}>Début</span>
                  <input
                    type="datetime-local"
                    className={scheduleUi.input}
                    value={form.startAt}
                    onChange={(e) => setForm((current) => ({ ...current, startAt: e.target.value }))}
                  />
                </label>
                <label className="space-y-2">
                  <span className={scheduleUi.label}>Fin</span>
                  <input
                    type="datetime-local"
                    className={scheduleUi.input}
                    value={form.endAt}
                    onChange={(e) => setForm((current) => ({ ...current, endAt: e.target.value }))}
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className={scheduleUi.label}>Type optionnel</span>
                  <select
                    className={scheduleUi.input}
                    value={form.objectiveType}
                    onChange={(e) =>
                      setForm((current) => ({ ...current, objectiveType: e.target.value as typeof form.objectiveType }))
                    }
                  >
                    <option value="">Non précisé</option>
                    {STUDENT_OBJECTIVE_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className={scheduleUi.label}>Statut</span>
                  <select
                    className={scheduleUi.input}
                    value={form.status}
                    onChange={(e) =>
                      setForm((current) => ({ ...current, status: e.target.value as typeof form.status }))
                    }
                  >
                    <option value="IN_PROGRESS">En cours</option>
                    <option value="COMPLETED">Terminé</option>
                  </select>
                </label>
              </div>

              <label className="space-y-2">
                <span className={scheduleUi.label}>Récurrence</span>
                <select
                  className={scheduleUi.input}
                  value={form.recurrence}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, recurrence: e.target.value as typeof form.recurrence }))
                  }
                >
                  {STUDENT_OBJECTIVE_RECURRENCES.map((recurrence) => (
                    <option key={recurrence.value} value={recurrence.value}>
                      {recurrence.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="rounded-2xl border border-cyan-400/10 bg-cyan-500/5 p-4">
                <div className="mb-4">
                  <h3 className="text-sm font-black text-cyan-100">Écoute / concentration</h3>
                  <p className="mt-1 text-[11px] font-semibold text-slate-400">
                    Vous pouvez ajouter un lien ou un contenu à écouter pendant le travail. Podcast, vidéo éducative,
                    rappel audio ou autre: le choix vous appartient.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <label className="space-y-2">
                    <span className={scheduleUi.label}>Titre du contenu</span>
                    <input
                      className={scheduleUi.input}
                      value={form.focusContentTitle}
                      onChange={(e) => setForm((current) => ({ ...current, focusContentTitle: e.target.value }))}
                      placeholder="Podcast de révision, vidéo explicative, rappel audio..."
                    />
                  </label>
                  <label className="space-y-2">
                    <span className={scheduleUi.label}>Lien optionnel</span>
                    <input
                      className={scheduleUi.input}
                      value={form.focusContentUrl}
                      onChange={(e) => setForm((current) => ({ ...current, focusContentUrl: e.target.value }))}
                      placeholder="https://..."
                    />
                  </label>
                  <label className="space-y-2">
                    <span className={scheduleUi.label}>Nature du contenu</span>
                    <select
                      className={scheduleUi.input}
                      value={form.focusContentType}
                      onChange={(e) =>
                        setForm((current) => ({
                          ...current,
                          focusContentType: e.target.value as typeof form.focusContentType,
                        }))
                      }
                    >
                      <option value="">Non précisé</option>
                      {FOCUS_CONTENT_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            </div>

            <div className={scheduleUi.modalActions}>
              <button type="button" className={scheduleUi.cancelBtn} onClick={closeForm} disabled={isSaving}>
                Annuler
              </button>
              <button type="button" className={scheduleUi.saveBtn} onClick={handleSaveObjective} disabled={isSaving}>
                {isSaving ? "Enregistrement..." : editingObjectiveId ? "Modifier" : "Ajouter"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
