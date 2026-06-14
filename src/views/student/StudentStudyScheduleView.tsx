import { Plus } from "lucide-react";
import { useMemo } from "react";
import AxelCalendarShell from "../../components/calendar/AxelCalendarShell";
import ScheduleSessionFormModal from "../../components/schedule/ScheduleSessionFormModal";
import type { UseStudentStudyScheduleOptions } from "../../hooks/useStudentStudySchedule";
import { useStudentStudySchedule } from "../../hooks/useStudentStudySchedule";
import { SCHEDULE_DAYS, STUDENT_STUDY_SESSION_TYPES } from "../../student-study-schedule";
import { scheduleUi } from "../teacher/schedule-theme";

type StudentStudyScheduleViewProps = UseStudentStudyScheduleOptions;

export default function StudentStudyScheduleView(props: StudentStudyScheduleViewProps) {
  const {
    sessions,
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

  const calendarSessions = useMemo(
    () =>
      sessions.map((session) => ({
        id: session.id,
        title: session.title,
        startTime: session.startTime,
        endTime: session.endTime,
        dayOfWeek: session.dayOfWeek,
        moduleName: session.moduleName,
        sessionTypeLabel: session.sessionTypeLabel,
      })),
    [sessions],
  );

  return (
    <div className={scheduleUi.page}>
      <section className={scheduleUi.hero}>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-600/25 via-violet-600/15 to-transparent" />
        <div className={scheduleUi.heroInner}>
          <div>
            <h1 className={scheduleUi.heroTitle}>Mon emploi du temps d&apos;étude</h1>
            <p className={scheduleUi.heroSubtitle}>
              Organisez vos révisions, cours, devoirs et lives personnels. Votre planning reste privé et visible
              uniquement par vous.
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
        <AxelCalendarShell
          sessions={calendarSessions}
          accent="indigo"
          onAddSession={() => openCreateForm()}
          onDayAction={(_date, dayOfWeek) => openCreateForm(dayOfWeek)}
          onSessionClick={(sessionId) => {
            const session = sessions.find((item) => item.id === sessionId);
            if (session) openEditForm(session);
          }}
        />
      )}

      <ScheduleSessionFormModal
        isOpen={isFormOpen}
        editingSessionId={editingSessionId}
        form={form}
        setForm={setForm}
        isSaving={isSaving}
        scheduleDays={SCHEDULE_DAYS}
        sessionTypeOptions={STUDENT_STUDY_SESSION_TYPES}
        ui={scheduleUi}
        onClose={closeForm}
        onSave={handleSaveSession}
        onDelete={handleDeleteSession}
      />
    </div>
  );
}
