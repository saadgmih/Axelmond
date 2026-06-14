import type { TeacherCurriculumViewProps } from "./curriculum-types";
export type { TeacherCurriculumViewProps } from "./curriculum-types";
import { curriculumUi } from "./curriculum-theme";
import CurriculumStepper from "./curriculum-steps/CurriculumStepper";
import CurriculumModulesStep from "./curriculum-steps/CurriculumModulesStep";
import CurriculumChaptersStep from "./curriculum-steps/CurriculumChaptersStep";
import CurriculumOutlineStep from "./curriculum-steps/CurriculumOutlineStep";
import CurriculumMediaStep from "./curriculum-steps/CurriculumMediaStep";
import CurriculumQuizStep from "./curriculum-steps/CurriculumQuizStep";

export default function TeacherCurriculumView(props: TeacherCurriculumViewProps) {
  const { activeCurriculumStep } = props;

  return (
    <div className={curriculumUi.page}>
      <CurriculumStepper {...props} />

      {activeCurriculumStep === 1 && <CurriculumModulesStep {...props} />}
      {activeCurriculumStep === 2 && <CurriculumChaptersStep {...props} />}
      {activeCurriculumStep === 3 && <CurriculumOutlineStep {...props} />}
      {activeCurriculumStep === 4 && <CurriculumMediaStep {...props} />}
      {activeCurriculumStep === 5 && <CurriculumQuizStep {...props} />}
    </div>
  );
}
