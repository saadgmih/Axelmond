import type { TeacherCurriculumViewProps } from "./curriculum-types";
export type { TeacherCurriculumViewProps } from "./curriculum-types";
import { curriculumUi, getChaptersStep, getMediaStep, getModuleStep, getQuizStep } from "./curriculum-theme";
import AdminAcademicTaxonomyView from "./AdminAcademicTaxonomyView";
import CurriculumStepper from "./curriculum-steps/CurriculumStepper";
import CurriculumModulesStep from "./curriculum-steps/CurriculumModulesStep";
import CurriculumChaptersStep from "./curriculum-steps/CurriculumChaptersStep";
import CurriculumMediaStep from "./curriculum-steps/CurriculumMediaStep";
import CurriculumQuizStep from "./curriculum-steps/CurriculumQuizStep";

export default function TeacherCurriculumView(props: TeacherCurriculumViewProps) {
  const { activeCurriculumStep, canManageAcademicTaxonomy } = props;
  const moduleStep = getModuleStep(canManageAcademicTaxonomy);
  const chaptersStep = getChaptersStep(canManageAcademicTaxonomy);
  const mediaStep = getMediaStep(canManageAcademicTaxonomy);
  const quizStep = getQuizStep(canManageAcademicTaxonomy);

  return (
    <div className={curriculumUi.page}>
      <CurriculumStepper {...props} />

      {canManageAcademicTaxonomy && activeCurriculumStep === 1 && (
        <AdminAcademicTaxonomyView {...props} mode="domains" />
      )}
      {canManageAcademicTaxonomy && activeCurriculumStep === 2 && (
        <AdminAcademicTaxonomyView {...props} mode="disciplines" />
      )}
      {activeCurriculumStep === moduleStep && <CurriculumModulesStep {...props} />}
      {activeCurriculumStep === chaptersStep && <CurriculumChaptersStep {...props} />}
      {activeCurriculumStep === mediaStep && <CurriculumMediaStep {...props} />}
      {activeCurriculumStep === quizStep && <CurriculumQuizStep {...props} />}
    </div>
  );
}
