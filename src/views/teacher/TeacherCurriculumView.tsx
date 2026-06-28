import type { TeacherCurriculumViewProps } from "./curriculum-types";
export type { TeacherCurriculumViewProps } from "./curriculum-types";
import {
  curriculumUi,
  getMediaStep,
  getModuleStep,
  getQuizStep,
  getStructureStep,
  getSyllabusStep,
} from "./curriculum-theme";
import AdminAcademicTaxonomyView from "./AdminAcademicTaxonomyView";
import CurriculumStepper from "./curriculum-steps/CurriculumStepper";
import CurriculumModulesStep from "./curriculum-steps/CurriculumModulesStep";
import CurriculumChaptersStep from "./curriculum-steps/CurriculumChaptersStep";
import CurriculumOutlineStep from "./curriculum-steps/CurriculumOutlineStep";
import CurriculumMediaStep from "./curriculum-steps/CurriculumMediaStep";
import CurriculumQuizStep from "./curriculum-steps/CurriculumQuizStep";

export default function TeacherCurriculumView(props: TeacherCurriculumViewProps) {
  const { activeCurriculumStep, canManageAcademicTaxonomy } = props;
  const moduleStep = getModuleStep(canManageAcademicTaxonomy);
  const syllabusStep = getSyllabusStep(canManageAcademicTaxonomy);
  const structureStep = getStructureStep(canManageAcademicTaxonomy);
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
      {activeCurriculumStep === syllabusStep && <CurriculumChaptersStep {...props} />}
      {activeCurriculumStep === structureStep && <CurriculumOutlineStep {...props} />}
      {activeCurriculumStep === mediaStep && <CurriculumMediaStep {...props} />}
      {activeCurriculumStep === quizStep && <CurriculumQuizStep {...props} />}
    </div>
  );
}
