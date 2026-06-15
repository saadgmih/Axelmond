import { X } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import type { StudentObjectiveFormState } from "../../../hooks/useStudentObjectives";
import { FOCUS_CONTENT_TYPES, STUDENT_OBJECTIVE_RECURRENCES, STUDENT_OBJECTIVE_TYPES } from "../../../student-objectives";
import { scheduleUi } from "../../teacher/schedule-theme";

export function ObjectivesFormModal({
  isOpen,
  editingObjectiveId,
  form,
  setForm,
  isSaving,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  editingObjectiveId: string | null;
  form: StudentObjectiveFormState;
  setForm: Dispatch<SetStateAction<StudentObjectiveFormState>>;
  isSaving: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  if (!isOpen) return null;

  return (
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
            <button type="button" className={scheduleUi.editBtn} onClick={onClose} aria-label="Fermer">
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
          <button type="button" className={scheduleUi.cancelBtn} onClick={onClose} disabled={isSaving}>
            Annuler
          </button>
          <button type="button" className={scheduleUi.saveBtn} onClick={onSave} disabled={isSaving}>
            {isSaving ? "Enregistrement..." : editingObjectiveId ? "Modifier" : "Ajouter"}
          </button>
        </div>
      </div>
    </div>
  );
}
