import { Layers, Video, Plus } from "lucide-react";

import { curriculumUi, getMediaStep, getStepTheme, publishedBadge, publishedLabel } from "../curriculum-theme";
import type { TeacherCurriculumViewProps } from "../curriculum-types";

export default function CurriculumChaptersStep(props: TeacherCurriculumViewProps) {
  const {
    domains: _domains,
    canManageAcademicTaxonomy,
    activeCurriculumStep: _activeCurriculumStep,
    setActiveCurriculumStep,
    selectedChapterId: _selectedChapterId,
    setSelectedChapterId: _setSelectedChapterId,
    selectedPartieId: _selectedPartieId,
    setSelectedPartieId: _setSelectedPartieId,
    newSectionMode: _newSectionMode,
    setNewSectionMode,
    uploadChapterId: _uploadChapterId,
    setUploadChapterId: _setUploadChapterId,
    uploadPartId: _uploadPartId,
    setUploadPartId: _setUploadPartId,
    uploadSubpartId: _uploadSubpartId,
    setUploadSubpartId: _setUploadSubpartId,
    quizChapterId: _quizChapterId,
    setQuizChapterId: _setQuizChapterId,
    quizPartId: _quizPartId,
    setQuizPartId: _setQuizPartId,
    quizSubpartId: _quizSubpartId,
    setQuizSubpartId: _setQuizSubpartId,
    curriculumSuccessMsg: _curriculumSuccessMsg,
    curriculumErrorMsg: _curriculumErrorMsg,
    newCourseTitle: _newCourseTitle,
    setNewCourseTitle: _setNewCourseTitle,
    newCourseDescription: _newCourseDescription,
    setNewCourseDescription: _setNewCourseDescription,
    newCourseDisciplineId: _newCourseDisciplineId,
    setNewCourseDisciplineId: _setNewCourseDisciplineId,
    newCourseCredits: _newCourseCredits,
    setNewCourseCredits: _setNewCourseCredits,
    newCourseDuration: _newCourseDuration,
    setNewCourseDuration: _setNewCourseDuration,
    newCoursePrice: _newCoursePrice,
    setNewCoursePrice: _setNewCoursePrice,
    newCoursePublished: _newCoursePublished,
    setNewCoursePublished: _setNewCoursePublished,
    newSectionCourseId: _newSectionCourseId,
    newSectionTitle,
    setNewSectionTitle,
    newSectionParentId,
    setNewSectionParentId,
    newSectionPublished,
    setNewSectionPublished,
    uploadSectionId,
    setUploadSectionId: _setUploadSectionId,
    uploadTitle: _uploadTitle,
    setUploadTitle: _setUploadTitle,
    uploadType: _uploadType,
    setUploadType: _setUploadType,
    uploadFile: _uploadFile,
    setUploadFile: _setUploadFile,
    uploadPublished: _uploadPublished,
    setUploadPublished: _setUploadPublished,
    uploadStatusMsg: _uploadStatusMsg,
    editingCourse: _editingCourse,
    setEditingCourse: _setEditingCourse,
    editCourseForm: _editCourseForm,
    setEditCourseForm: _setEditCourseForm,
    teacherQuizzes: _teacherQuizzes,
    quizCourseId: _quizCourseId,
    newQuizTitle: _newQuizTitle,
    setNewQuizTitle: _setNewQuizTitle,
    selectedQuizId: _selectedQuizId,
    setSelectedQuizId: _setSelectedQuizId,
    newQuestionText: _newQuestionText,
    setNewQuestionText: _setNewQuestionText,
    newQuestionOptions: _newQuestionOptions,
    setNewQuestionOptions: _setNewQuestionOptions,
    newQuestionAnswer: _newQuestionAnswer,
    setNewQuestionAnswer: _setNewQuestionAnswer,
    newQuestionExplanation: _newQuestionExplanation,
    setNewQuestionExplanation: _setNewQuestionExplanation,
    quizManagerMsg: _quizManagerMsg,
    quizManagerError: _quizManagerError,
    allDisciplines: _allDisciplines,
    managedCourses: _managedCourses,
    managedCourse: _managedCourse,
    managedSections: _managedSections,
    chapterSections,
    uploadPartOptions: _uploadPartOptions,
    selectedManagedContents: _selectedManagedContents,
    handleSetUploadSectionId,
    showCurriculumSuccess: _showCurriculumSuccess,
    showCurriculumError: _showCurriculumError,
    handleCreateCourse: _handleCreateCourse,
    handleCreateSection,
    handleUploadLessonAsset: _handleUploadLessonAsset,
    handleSelectManagedCourse: _handleSelectManagedCourse,
    loadTeacherQuizzes: _loadTeacherQuizzes,
    handleCreateQuiz: _handleCreateQuiz,
    handleAddQuestion: _handleAddQuestion,
    handleDeleteQuestion: _handleDeleteQuestion,
    handleUpdateCourseDetails: _handleUpdateCourseDetails,
    handleSaveEditCourse: _handleSaveEditCourse,
    handleToggleCoursePublished: _handleToggleCoursePublished,
    handleDeleteCourse: _handleDeleteCourse,
    handleUpdateSectionTitle,
    handleToggleSectionPublished,
    handleDeleteSection,
    handleAddChildSection,
    handleToggleContentPublished: _handleToggleContentPublished,
    handleDeleteLessonContent: _handleDeleteLessonContent,
  } = props;
  const stepTheme = getStepTheme(2);
  const mediaStep = getMediaStep(canManageAcademicTaxonomy);
  const inputFocus = `${curriculumUi.input} ${stepTheme.focus}`;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className={`lg:col-span-5 ${curriculumUi.panel} ${getStepTheme(2).panel} space-y-5 self-start`}>
        <div>
          <h3 className={curriculumUi.panelTitle}>
            <Plus className="h-5 w-5 text-teal-400" />
            Ajouter un chapitre
          </h3>
          <p className={curriculumUi.panelSubtitle}>Créez un chapitre de premier niveau pour structurer ce module.</p>
        </div>

        <form onSubmit={handleCreateSection} className={`space-y-4 pt-3 ${curriculumUi.divider}`}>
          <label className="block space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Titre du chapitre</span>
            <input
              type="text"
              required
              placeholder="ex: Chapitre 1 : Introduction générale"
              value={!newSectionParentId ? newSectionTitle : ""}
              onChange={(e) => {
                setNewSectionMode("chapter");
                setNewSectionParentId("");
                setNewSectionTitle(e.target.value);
              }}
              className={inputFocus}
            />
          </label>

          <label className={curriculumUi.checkbox}>
            <input
              type="checkbox"
              checked={newSectionPublished}
              onChange={(e) => setNewSectionPublished(e.target.checked)}
              className={`h-4 w-4 cursor-pointer accent-emerald-600`}
            />
            Publier immédiatement le chapitre
          </label>

          <button
            type="submit"
            className={`w-full rounded-xl py-3 text-xs font-black shadow-sm transition-colors active:scale-[0.98] ${getStepTheme(2).button}`}
          >
            Créer le chapitre
          </button>
        </form>
      </div>

      {/* Right Panel: Chapters List */}
      <div className="lg:col-span-7 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className={curriculumUi.sectionTitle}>Chapitres du module ({chapterSections.length})</h3>
          <span className={curriculumUi.countBadge}>
            {chapterSections.length} chapitre{chapterSections.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
          {chapterSections.length === 0 ? (
            <div className={curriculumUi.empty}>
              <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-400 font-semibold">
                Aucun chapitre créé. Utilisez le formulaire à gauche pour commencer.
              </p>
            </div>
          ) : (
            chapterSections.map((section) => (
              <div
                key={section.id}
                className={`${curriculumUi.card} ${
                  uploadSectionId === section.id ? getStepTheme(2).listActive : curriculumUi.cardHover
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Chapitre</span>
                    <h4 className="text-sm font-black text-white">{section.title}</h4>
                  </div>
                  <span className={publishedBadge(section.published)}>
                    {publishedLabel(section.published ?? false)}
                  </span>
                </div>

                <div className={`flex flex-wrap items-center justify-between gap-3 pt-4 ${curriculumUi.divider} mt-4`}>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => handleUpdateSectionTitle(section)} className={curriculumUi.ghostBtn}>
                      Renommer
                    </button>
                    <button
                      onClick={() => handleToggleSectionPublished(section)}
                      className={
                        section.published
                          ? curriculumUi.unpublishBtn
                          : `${curriculumUi.ghostBtn} border-teal-500/30 text-teal-300`
                      }
                    >
                      {section.published ? "Dépublier" : "Publier"}
                    </button>
                    <button onClick={() => handleDeleteSection(section)} className={curriculumUi.dangerBtn}>
                      Supprimer
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        handleAddChildSection(section);
                        window.requestAnimationFrame(() => {
                          document
                            .getElementById("curriculum-chapter-structure")
                            ?.scrollIntoView({ behavior: "smooth", block: "start" });
                        });
                      }}
                      className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-[10px] font-black transition-colors ${getStepTheme(2).chip} hover:opacity-90`}
                    >
                      <Plus className="w-3 h-3" />
                      Ajouter partie
                    </button>
                    <button
                      onClick={() => {
                        handleSetUploadSectionId(section.id);
                        setActiveCurriculumStep(mediaStep);
                      }}
                      className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-[10px] font-black text-white transition-colors ${getStepTheme(3).button}`}
                    >
                      <Video className="w-3 h-3" />
                      Médias
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
