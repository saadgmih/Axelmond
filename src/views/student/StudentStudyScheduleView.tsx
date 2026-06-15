import StudentStudyPlanView from "./StudentStudyPlanView";

/** @deprecated Utiliser StudentStudyPlanView — conservé pour compatibilité lazy-load / tests */
export default function StudentStudyScheduleView(props: { role: string; currentView: string }) {
  return <StudentStudyPlanView {...props} currentView="study-schedule" />;
}
