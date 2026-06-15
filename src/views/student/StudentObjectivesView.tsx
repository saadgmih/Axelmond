import StudentStudyPlanView from "./StudentStudyPlanView";

/** @deprecated Utiliser StudentStudyPlanView — conservé pour compatibilité lazy-load / tests */
export default function StudentObjectivesView(props: { role: string; currentView: string }) {
  return <StudentStudyPlanView {...props} currentView="objectives" />;
}
