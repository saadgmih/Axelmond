import { Clock3, Pencil, Trash2 } from "lucide-react";
import type { StudentStudySessionView } from "../../../hooks/useStudentStudySchedule";
import { scheduleUi } from "../../teacher/schedule-theme";

export function StudySessionCard({
  session,
  onEdit,
  onDelete,
}: {
  session: StudentStudySessionView;
  onEdit: (session: StudentStudySessionView) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <article className={`${scheduleUi.sessionCard} flex flex-col gap-3`} data-tv-focusable>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className={scheduleUi.sessionTitle}>{session.title}</h3>
          {session.sessionTypeLabel && (
            <span className={`${scheduleUi.typeBadge} mt-2 inline-flex`}>{session.sessionTypeLabel}</span>
          )}
        </div>
        <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-200">
          {session.dayLabel}
        </span>
      </div>

      {session.moduleName && <p className={scheduleUi.sessionMeta}>Module : {session.moduleName}</p>}
      {session.description && <p className={`${scheduleUi.sessionMeta} line-clamp-3`}>{session.description}</p>}

      <p className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
        <Clock3 className="h-3.5 w-3.5 text-emerald-300" />
        {session.startTime} – {session.endTime}
      </p>

      {session.roomOrLink && (
        <p className="text-[11px] font-semibold text-slate-500">Lieu / lien : {session.roomOrLink}</p>
      )}

      <div className={scheduleUi.sessionActions}>
        <button type="button" className={scheduleUi.editBtn} onClick={() => onEdit(session)}>
          <Pencil className="mr-1 inline h-3.5 w-3.5" />
          Modifier
        </button>
        <button type="button" className={scheduleUi.deleteBtn} onClick={() => onDelete(session.id)}>
          <Trash2 className="mr-1 inline h-3.5 w-3.5" />
          Supprimer
        </button>
      </div>
    </article>
  );
}
