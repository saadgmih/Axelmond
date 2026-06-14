import { X } from "lucide-react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { ScheduleDayOption, ScheduleSessionFormPayload } from "../../hooks/useScheduleSessions";

interface ScheduleSessionFormModalProps<TForm extends ScheduleSessionFormPayload> {
  isOpen: boolean;
  editingSessionId: string | null;
  form: TForm;
  setForm: Dispatch<SetStateAction<TForm>>;
  isSaving: boolean;
  scheduleDays: ReadonlyArray<ScheduleDayOption>;
  sessionTypeOptions: ReadonlyArray<{ value: string; label: string }>;
  ui: {
    modalOverlay: string;
    modalPanel: string;
    modalHeader: string;
    modalTitle: string;
    modalBody: string;
    modalActions: string;
    label: string;
    input: string;
    textarea: string;
    editBtn: string;
    deleteBtn: string;
    cancelBtn: string;
    saveBtn: string;
  };
  onClose: () => void;
  onSave: () => void;
  onDelete: (sessionId: string) => void;
  extraFields?: ReactNode;
}

export default function ScheduleSessionFormModal<TForm extends ScheduleSessionFormPayload>({
  isOpen,
  editingSessionId,
  form,
  setForm,
  isSaving,
  scheduleDays,
  sessionTypeOptions,
  ui,
  onClose,
  onSave,
  onDelete,
  extraFields,
}: ScheduleSessionFormModalProps<TForm>) {
  if (!isOpen) return null;

  return (
    <div className={ui.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="schedule-form-title">
      <div className={ui.modalPanel}>
        <div className={ui.modalHeader}>
          <div className="flex items-center justify-between gap-3">
            <h2 id="schedule-form-title" className={ui.modalTitle}>
              {editingSessionId ? "Modifier la séance" : "Ajouter une séance"}
            </h2>
            <button type="button" className={ui.editBtn} onClick={onClose} aria-label="Fermer">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className={ui.modalBody}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="space-y-2">
              <span className={ui.label}>Jour</span>
              <select
                className={ui.input}
                value={form.dayOfWeek}
                onChange={(e) => setForm((current) => ({ ...current, dayOfWeek: Number(e.target.value) }))}
              >
                {scheduleDays.map((day) => (
                  <option key={day.value} value={day.value}>{day.label}</option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className={ui.label}>Type de séance</span>
              <select
                className={ui.input}
                value={form.sessionType}
                onChange={(e) => setForm((current) => ({ ...current, sessionType: e.target.value }))}
              >
                {sessionTypeOptions.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="space-y-2 block">
            <span className={ui.label}>Titre de la séance</span>
            <input
              className={ui.input}
              value={form.title}
              onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
              placeholder="Introduction à l'algorithmique"
            />
          </label>

          <label className="space-y-2 block">
            <span className={ui.label}>Module</span>
            <input
              className={ui.input}
              value={form.moduleName}
              onChange={(e) => setForm((current) => ({ ...current, moduleName: e.target.value }))}
              placeholder="Informatique fondamentale"
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="space-y-2">
              <span className={ui.label}>Heure de début</span>
              <input
                type="time"
                className={ui.input}
                value={form.startTime}
                onChange={(e) => setForm((current) => ({ ...current, startTime: e.target.value }))}
              />
            </label>
            <label className="space-y-2">
              <span className={ui.label}>Heure de fin</span>
              <input
                type="time"
                className={ui.input}
                value={form.endTime}
                onChange={(e) => setForm((current) => ({ ...current, endTime: e.target.value }))}
              />
            </label>
          </div>

          <label className="space-y-2 block">
            <span className={ui.label}>Salle ou lien live</span>
            <input
              className={ui.input}
              value={form.roomOrLink || ""}
              onChange={(e) => setForm((current) => ({ ...current, roomOrLink: e.target.value }))}
              placeholder="Amphi B12 ou https://..."
            />
          </label>

          <label className="space-y-2 block">
            <span className={ui.label}>Description (optionnelle)</span>
            <textarea
              className={ui.textarea}
              value={form.description || ""}
              onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
              placeholder="Consignes, objectifs ou notes pour cette séance"
            />
          </label>

          {extraFields}
        </div>

        <div className={ui.modalActions}>
          {editingSessionId && (
            <button
              type="button"
              className={`${ui.deleteBtn} w-full sm:mr-auto sm:w-auto`}
              onClick={() => onDelete(editingSessionId)}
              disabled={isSaving}
            >
              Supprimer
            </button>
          )}
          <button type="button" className={ui.cancelBtn} onClick={onClose} disabled={isSaving}>
            Annuler
          </button>
          <button type="button" className={ui.saveBtn} onClick={onSave} disabled={isSaving}>
            {isSaving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
