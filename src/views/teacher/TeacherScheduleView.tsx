import { Plus } from "lucide-react";
import { useMemo } from "react";
import AxelCalendarShell from "../../components/calendar/AxelCalendarShell";
import ScheduleSessionFormModal from "../../components/schedule/ScheduleSessionFormModal";
import type { UseTeacherScheduleOptions } from "../../hooks/useTeacherSchedule";
import { useTeacherSchedule } from "../../hooks/useTeacherSchedule";
import { SCHEDULE_DAYS, SCHEDULE_SESSION_TYPES } from "../../schedule";
import { scheduleUi } from "./schedule-theme";

type TeacherScheduleViewProps = UseTeacherScheduleOptions;

export default function TeacherScheduleView(props: TeacherScheduleViewProps) {
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
  } = useTeacherSchedule(props);

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
        <div className={scheduleUi.heroGradient} />
        <div className={scheduleUi.heroInner}>
          <div>
            <h1 className={scheduleUi.heroTitle}>Gestion de l&apos;emploi du temps</h1>
            <p className={scheduleUi.heroSubtitle}>
              Planifiez vos séances hebdomadaires par jour, module et créneau horaire. Chaque professeur gère uniquement son propre emploi du temps.
            </p>
          </div>
          <button type="button" className={scheduleUi.addBtn} onClick={() => openCreateForm()}>
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
          accent="pink"
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
        sessionTypeOptions={SCHEDULE_SESSION_TYPES}
        ui={scheduleUi}
        onClose={closeForm}
        onSave={handleSaveSession}
        onDelete={handleDeleteSession}
      />
    </div>
  );
}
