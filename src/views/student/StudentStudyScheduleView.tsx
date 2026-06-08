import {
  CalendarDays,
  Clock3,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import type { UseStudentStudyScheduleOptions } from "../../hooks/useStudentStudySchedule";
import { useStudentStudySchedule } from "../../hooks/useStudentStudySchedule";
import { SCHEDULE_DAYS, STUDENT_STUDY_SESSION_TYPES } from "../../student-study-schedule";
import { scheduleUi } from "../teacher/schedule-theme";

type StudentStudyScheduleViewProps = UseStudentStudyScheduleOptions;

export default function StudentStudyScheduleView(props: StudentStudyScheduleViewProps) {
  const {
    sessions,
    sessionsByDay,
    isLoading,
    statusMsg,
    errorMsg,
    isFormOpen,
    editingSessionId,
    form,
    setForm,
    isSaving,
    openCreateForm,
    openEditForm,
    closeForm,
    handleSaveSession,
    handleDeleteSession,
  } = useStudentStudySchedule(props);

  return (
    <div className={scheduleUi.page}>
      <section className={scheduleUi.hero}>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-600/25 via-violet-600/15 to-transparent" />
        <div className={scheduleUi.heroInner}>
          <div>
            <h1 className={scheduleUi.heroTitle}>Mon emploi du temps d&apos;étude</h1>
            <p className={scheduleUi.heroSubtitle}>
              Organisez vos révisions, cours, devoirs et lives personnels. Votre planning reste privé et visible uniquement par vous.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-950/30 transition-all hover:from-indigo-500 hover:to-violet-500 active:scale-[0.98]"
            onClick={() => openCreateForm()}
          >
            <Plus className="h-4 w-4" />
            Ajouter une séance
          </button>
        </div>
      </section>

      {statusMsg && <div className={scheduleUi.alertSuccess}>{statusMsg}</div>}
      {errorMsg && <div className={scheduleUi.alertError}>{errorMsg}</div>}

      {isLoading ? (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0f172a]/70 px-6 py-10 text-center text-sm font-semibold text-slate-400">
          Chargement de votre emploi du temps...
        </div>
      ) : (
        <section className={scheduleUi.weekGrid}>
          {SCHEDULE_DAYS.map((day) => {
            const daySessions = sessionsByDay.get(day.value) || [];
            return (
              <article key={day.value} className={scheduleUi.dayCard}>
                <header className={scheduleUi.dayHeader}>
                  <div>
                    <h2 className={scheduleUi.dayTitle}>{day.label}</h2>
                    <p className={scheduleUi.dayCount}>{daySessions.length} séance(s)</p>
                  </div>
                  <button
                    type="button"
                    className={scheduleUi.editBtn}
                    onClick={() => openCreateForm(day.value)}
                    aria-label={`Ajouter une séance le ${day.label}`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </header>
                <div className={scheduleUi.dayBody}>
                  {daySessions.length === 0 ? (
                    <div className={scheduleUi.emptyDay}>Aucune séance planifiée</div>
                  ) : (
                    daySessions.map((session) => (
                      <div key={session.id} className={scheduleUi.sessionCard}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className={scheduleUi.sessionTitle}>{session.title}</h3>
                            <p className={scheduleUi.sessionMeta}>{session.moduleName}</p>
                          </div>
                          <span className={scheduleUi.typeBadge}>{session.sessionTypeLabel}</span>
                        </div>
                        <p className={`${scheduleUi.sessionTime} mt-2 text-indigo-300`}>
                          <Clock3 className="h-3.5 w-3.5" />
                          {session.startTime} - {session.endTime}
                        </p>
                        {session.roomOrLink && (
                          <p className={`${scheduleUi.sessionMeta} mt-2 flex items-center gap-1`}>
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{session.roomOrLink}</span>
                          </p>
                        )}
                        {session.description && (
                          <p className={`${scheduleUi.sessionMeta} mt-2 line-clamp-3`}>{session.description}</p>
                        )}
                        <div className={scheduleUi.sessionActions}>
                          <button type="button" className={scheduleUi.editBtn} onClick={() => openEditForm(session)}>
                            <Pencil className="mr-1 inline h-3.5 w-3.5" />
                            Modifier
                          </button>
                          <button type="button" className={scheduleUi.deleteBtn} onClick={() => handleDeleteSession(session.id)}>
                            <Trash2 className="mr-1 inline h-3.5 w-3.5" />
                            Supprimer
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}

      {!isLoading && sessions.length > 0 && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0f172a]/60 px-4 py-3 text-xs text-slate-400">
          <CalendarDays className="mr-2 inline h-4 w-4 text-indigo-400" />
          {sessions.length} séance(s) planifiée(s) cette semaine.
        </div>
      )}

      {isFormOpen && (
        <div className={scheduleUi.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="student-study-form-title">
          <div className={scheduleUi.modalPanel}>
            <div className={scheduleUi.modalHeader}>
              <div className="flex items-center justify-between gap-3">
                <h2 id="student-study-form-title" className={scheduleUi.modalTitle}>
                  {editingSessionId ? "Modifier la séance" : "Ajouter une séance"}
                </h2>
                <button type="button" className={scheduleUi.editBtn} onClick={closeForm} aria-label="Fermer">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className={scheduleUi.modalBody}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="space-y-2">
                  <span className={scheduleUi.label}>Jour</span>
                  <select
                    className={scheduleUi.input}
                    value={form.dayOfWeek}
                    onChange={(e) => setForm((current) => ({ ...current, dayOfWeek: Number(e.target.value) }))}
                  >
                    {SCHEDULE_DAYS.map((day) => (
                      <option key={day.value} value={day.value}>{day.label}</option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className={scheduleUi.label}>Type</span>
                  <select
                    className={scheduleUi.input}
                    value={form.sessionType}
                    onChange={(e) => setForm((current) => ({ ...current, sessionType: e.target.value as typeof form.sessionType }))}
                  >
                    {STUDENT_STUDY_SESSION_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="space-y-2 block">
                <span className={scheduleUi.label}>Titre de la séance</span>
                <input
                  className={scheduleUi.input}
                  value={form.title}
                  onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
                  placeholder="Révision chapitre 3"
                />
              </label>

              <label className="space-y-2 block">
                <span className={scheduleUi.label}>Module</span>
                <input
                  className={scheduleUi.input}
                  value={form.moduleName}
                  onChange={(e) => setForm((current) => ({ ...current, moduleName: e.target.value }))}
                  placeholder="Mathématiques appliquées"
                />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="space-y-2">
                  <span className={scheduleUi.label}>Heure de début</span>
                  <input
                    type="time"
                    className={scheduleUi.input}
                    value={form.startTime}
                    onChange={(e) => setForm((current) => ({ ...current, startTime: e.target.value }))}
                  />
                </label>
                <label className="space-y-2">
                  <span className={scheduleUi.label}>Heure de fin</span>
                  <input
                    type="time"
                    className={scheduleUi.input}
                    value={form.endTime}
                    onChange={(e) => setForm((current) => ({ ...current, endTime: e.target.value }))}
                  />
                </label>
              </div>

              <label className="space-y-2 block">
                <span className={scheduleUi.label}>Lieu ou lien live</span>
                <input
                  className={scheduleUi.input}
                  value={form.roomOrLink || ""}
                  onChange={(e) => setForm((current) => ({ ...current, roomOrLink: e.target.value }))}
                  placeholder="Bibliothèque, salle B04 ou https://..."
                />
              </label>

              <label className="space-y-2 block">
                <span className={scheduleUi.label}>Description (optionnelle)</span>
                <textarea
                  className={scheduleUi.textarea}
                  value={form.description || ""}
                  onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
                  placeholder="Objectifs, chapitres à revoir, notes personnelles"
                />
              </label>
            </div>

            <div className={scheduleUi.modalActions}>
              <button type="button" className={scheduleUi.cancelBtn} onClick={closeForm} disabled={isSaving}>
                Annuler
              </button>
              <button type="button" className={scheduleUi.saveBtn} onClick={handleSaveSession} disabled={isSaving}>
                {isSaving ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
