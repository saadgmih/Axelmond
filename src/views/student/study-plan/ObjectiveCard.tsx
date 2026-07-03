import { CheckCircle2, Clock3, ExternalLink, Headphones, Pencil, RotateCcw, Target, Trash2 } from "lucide-react";
import type { StudentObjectiveView } from "../../../hooks/useStudentObjectives";
import { scheduleUi } from "../../teacher/schedule-theme";
import { formatDateTime } from "./study-plan-utils";

export function ObjectiveCard({
  objective,
  completed,
  onEdit,
  onDelete,
  onComplete,
}: {
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
              : "border border-lime-400/20 bg-lime-500/10 text-lime-200"
          }`}
        >
          {objective.statusLabel}
        </span>
      </div>

      {objective.description && <p className={`${scheduleUi.sessionMeta} line-clamp-3`}>{objective.description}</p>}

      {objective.recurrence && objective.recurrence !== "NONE" && (
        <p className="inline-flex w-fit items-center gap-1 rounded-full border border-teal-400/20 bg-teal-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-teal-200">
          <RotateCcw className="h-3 w-3" />
          {objective.recurrenceLabel}
        </p>
      )}

      <div className="grid grid-cols-1 gap-2 text-[11px] font-semibold text-slate-400 sm:grid-cols-2">
        <p className="inline-flex items-center gap-1">
          <Clock3 className="h-3.5 w-3.5 text-emerald-300" />
          Début : {formatDateTime(objective.startAt)}
        </p>
        <p className="inline-flex items-center gap-1">
          <Target className="h-3.5 w-3.5 text-teal-300" />
          Fin : {formatDateTime(objective.endAt)}
        </p>
      </div>

      {(objective.focusContentTitle || objective.focusContentUrl) && (
        <div className="rounded-xl border border-teal-400/10 bg-teal-500/5 p-3">
          <p className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-teal-200">
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
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-teal-200 hover:text-teal-100"
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
