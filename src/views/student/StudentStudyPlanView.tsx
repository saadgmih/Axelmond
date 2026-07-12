import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AxelCalendarShell from "../../components/calendar/AxelCalendarShell";
import ScheduleSessionFormModal from "../../components/schedule/ScheduleSessionFormModal";
import { useStudentObjectives } from "../../hooks/useStudentObjectives";
import { useStudentStudySchedule } from "../../hooks/useStudentStudySchedule";
import { SCHEDULE_DAYS, STUDENT_STUDY_SESSION_TYPES } from "../../student-study-schedule";
import { scheduleUi } from "../teacher/schedule-theme";
import { ObjectiveCard } from "./study-plan/ObjectiveCard";
import { ObjectivesFormModal } from "./study-plan/ObjectivesFormModal";
import { ObjectivesStatsSection } from "./study-plan/ObjectivesStatsSection";
import { StudySessionCard } from "./study-plan/StudySessionCard";
import {
  parseStudyPlanMarkerId,
  parseStudyPlanTabFromSearch,
  STUDY_PLAN_TABS,
  studyPlanTabFromLegacyView,
  toObjectiveCalendarMarkers,
  toStudySessionCalendarMarkers,
  type StudyPlanTab,
} from "./study-plan/study-plan-utils";

export interface StudentStudyPlanViewProps {
  role: string;
  currentView: string;
}

export default function StudentStudyPlanView({ role, currentView }: StudentStudyPlanViewProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const hookView = "study-plan";

  const [activeTab, setActiveTab] = useState<StudyPlanTab>(() => {
    return studyPlanTabFromLegacyView(currentView) ?? parseStudyPlanTabFromSearch(location.search) ?? "calendar";
  });

  useEffect(() => {
    const tabFromUrl = parseStudyPlanTabFromSearch(location.search);
    const legacyTab = studyPlanTabFromLegacyView(currentView);
    const nextTab = tabFromUrl ?? legacyTab;
    if (nextTab) setActiveTab(nextTab);
  }, [location.search, currentView]);

  const selectTab = (tab: StudyPlanTab) => {
    setActiveTab(tab);
    navigate(`/student/study-plan?tab=${tab}`, { replace: true });
  };

  const schedule = useStudentStudySchedule({ role, currentView: hookView });
  const objectives = useStudentObjectives({ role, currentView: hookView });

  const calendarMarkers = useMemo(
    () => [...toStudySessionCalendarMarkers(schedule.sessions), ...toObjectiveCalendarMarkers(objectives.objectives)],
    [schedule.sessions, objectives.objectives],
  );

  const statusMsg = schedule.statusMsg || objectives.statusMsg;
  const errorMsg = schedule.errorMsg || objectives.errorMsg;
  const isLoading = schedule.isLoading || objectives.isLoading;

  const handleCalendarSessionClick = (markerId: string) => {
    const parsed = parseStudyPlanMarkerId(markerId);
    if (!parsed) return;
    if (parsed.kind === "session") {
      const session = schedule.sessions.find((item) => item.id === parsed.id);
      if (session) schedule.openEditForm(session);
      return;
    }
    const objective = objectives.objectives.find((item) => item.id === parsed.id);
    if (objective) objectives.openEditForm(objective);
  };

  const handleCreateSessionForDay = (_date: Date, dayOfWeek: number) => {
    schedule.openCreateForm(dayOfWeek);
  };

  const handleCreateObjectiveForDay = (date: Date) => {
    objectives.openCreateFormForDate(date);
  };

  return (
    <div className={scheduleUi.page} data-tv-zone="student-study-plan">
      <section className={scheduleUi.hero}>
        <div className={`pointer-events-none absolute inset-0 ${scheduleUi.heroGradient}`} />
        <div className={scheduleUi.heroInner}>
          <div>
            <h1 className={scheduleUi.heroTitle}>Plan d&apos;étude &amp; Objectifs</h1>
            <p className={scheduleUi.heroSubtitle}>
              Organisez vos séances d&apos;étude, vos objectifs et vos échéances dans un seul espace. Votre planning
              reste privé et visible uniquement par vous.
            </p>
          </div>
          {activeTab === "calendar" && (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-950/30 transition-all hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98]"
                onClick={() => schedule.openCreateForm()}
              >
                <Plus className="h-4 w-4" />
                Ajouter une séance
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-950/30 transition-all hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98]"
                onClick={objectives.openCreateForm}
              >
                <Plus className="h-4 w-4" />
                Ajouter un objectif
              </button>
            </div>
          )}
        </div>
      </section>

      <nav
        className="flex flex-wrap gap-2 rounded-2xl border border-white/[0.08] bg-[#0b241f]/70 p-2"
        aria-label="Sections du plan d'étude"
      >
        {STUDY_PLAN_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => selectTab(tab.id)}
            className={`rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === tab.id
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {statusMsg && <div className={scheduleUi.alertSuccess}>{statusMsg}</div>}
      {errorMsg && <div className={scheduleUi.alertError}>{errorMsg}</div>}

      {activeTab === "calendar" && (
        <>
          {isLoading ? (
            <div className="rounded-2xl border border-white/[0.08] bg-[#0b241f]/70 px-6 py-10 text-center text-sm font-semibold text-slate-400">
              Chargement du calendrier...
            </div>
          ) : (
            <AxelCalendarShell
              sessions={calendarMarkers}
              matchBy="auto"
              accent="indigo"
              labels={{
                emptyDay: "Aucune séance ni objectif ce jour",
                emptyWeekDay: "Rien de planifié",
                addSession: "Ajouter une séance",
                addObjective: "Ajouter un objectif",
              }}
              onCreateSessionForDay={handleCreateSessionForDay}
              onCreateObjectiveForDay={handleCreateObjectiveForDay}
              onSessionClick={handleCalendarSessionClick}
            />
          )}
        </>
      )}

      {activeTab === "sessions" && (
        <>
          {schedule.isLoading ? (
            <div className="rounded-2xl border border-white/[0.08] bg-[#0b241f]/70 px-6 py-10 text-center text-sm font-semibold text-slate-400">
              Chargement de vos séances...
            </div>
          ) : schedule.sessions.length === 0 ? (
            <div className={scheduleUi.emptyDay}>
              Aucune séance planifiée. Utilisez l&apos;onglet Calendrier pour en ajouter, puis modifiez-les ici.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {schedule.sessions.map((session) => (
                <StudySessionCard
                  key={session.id}
                  session={session}
                  onEdit={schedule.openEditForm}
                  onDelete={schedule.handleDeleteSession}
                />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === "objectives" && (
        <>
          {objectives.isLoading ? (
            <div className="rounded-2xl border border-white/[0.08] bg-[#0b241f]/70 px-6 py-10 text-center text-sm font-semibold text-slate-400">
              Chargement de vos objectifs...
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
              <section className="space-y-4">
                <div>
                  <h2 className="text-lg font-black text-white">Objectifs en cours</h2>
                  <p className="text-xs font-semibold text-slate-500">
                    {objectives.inProgressObjectives.length} objectif(s) à suivre
                  </p>
                </div>
                {objectives.inProgressObjectives.length === 0 ? (
                  <div className={scheduleUi.emptyDay}>
                    Aucun objectif en cours. Utilisez l&apos;onglet Calendrier pour en ajouter, puis modifiez-les ici.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {objectives.inProgressObjectives.map((objective) => (
                      <ObjectiveCard
                        key={objective.id}
                        objective={objective}
                        completed={false}
                        onEdit={objectives.openEditForm}
                        onDelete={objectives.handleDeleteObjective}
                        onComplete={objectives.handleCompleteObjective}
                      />
                    ))}
                  </div>
                )}
              </section>

              <section className="space-y-4">
                <div>
                  <h2 className="text-lg font-black text-white">Objectifs terminés</h2>
                  <p className="text-xs font-semibold text-slate-500">
                    {objectives.completedObjectives.length} objectif(s) validé(s)
                  </p>
                </div>
                {objectives.completedObjectives.length === 0 ? (
                  <div className={scheduleUi.emptyDay}>Les objectifs cochés comme terminés apparaîtront ici.</div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {objectives.completedObjectives.map((objective) => (
                      <ObjectiveCard
                        key={objective.id}
                        objective={objective}
                        completed
                        onEdit={objectives.openEditForm}
                        onDelete={objectives.handleDeleteObjective}
                        onComplete={objectives.handleCompleteObjective}
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </>
      )}

      {activeTab === "stats" && (
        <ObjectivesStatsSection
          weeklyProgress={objectives.weeklyProgress}
          stats={objectives.stats}
          streak={objectives.streak}
          dueSoonObjectives={objectives.dueSoonObjectives}
          overdueObjectives={objectives.overdueObjectives}
        />
      )}

      <ScheduleSessionFormModal
        isOpen={schedule.isFormOpen}
        editingSessionId={schedule.editingSessionId}
        form={schedule.form}
        setForm={schedule.setForm}
        isSaving={schedule.isSaving}
        scheduleDays={SCHEDULE_DAYS}
        sessionTypeOptions={STUDENT_STUDY_SESSION_TYPES}
        ui={scheduleUi}
        onClose={schedule.closeForm}
        onSave={schedule.handleSaveSession}
        onDelete={schedule.handleDeleteSession}
      />

      <ObjectivesFormModal
        isOpen={objectives.isFormOpen}
        editingObjectiveId={objectives.editingObjectiveId}
        form={objectives.form}
        setForm={objectives.setForm}
        isSaving={objectives.isSaving}
        onClose={objectives.closeForm}
        onSave={objectives.handleSaveObjective}
      />
    </div>
  );
}
