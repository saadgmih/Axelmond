import { FolderTree, Plus, Trash2, Video } from "lucide-react";
import PremiumVideoPlayer from "../../../components/PremiumVideoPlayer";
import { curriculumUi, getStepTheme, publishedBadge, publishedLabel } from "../curriculum-theme";
import type { TeacherCurriculumViewProps } from "../curriculum-types";

export default function CurriculumOutlineStep(props: TeacherCurriculumViewProps) {
  const { domains, activeCurriculumStep, setActiveCurriculumStep, selectedChapterId, setSelectedChapterId, selectedPartieId, setSelectedPartieId, newSectionMode, setNewSectionMode, uploadChapterId, setUploadChapterId, uploadPartId, setUploadPartId, uploadSubpartId, setUploadSubpartId, quizChapterId, setQuizChapterId, quizPartId, setQuizPartId, quizSubpartId, setQuizSubpartId, curriculumSuccessMsg, curriculumErrorMsg, newCourseTitle, setNewCourseTitle, newCourseDescription, setNewCourseDescription, newCourseDisciplineId, setNewCourseDisciplineId, newCourseCredits, setNewCourseCredits, newCourseDuration, setNewCourseDuration, newCoursePrice, setNewCoursePrice, newCoursePublished, setNewCoursePublished, newSectionCourseId, newSectionTitle, setNewSectionTitle, newSectionParentId, setNewSectionParentId, newSectionPublished, setNewSectionPublished, uploadSectionId, setUploadSectionId, uploadTitle, setUploadTitle, uploadType, setUploadType, uploadFile, setUploadFile, uploadPublished, setUploadPublished, uploadStatusMsg, editingCourse, setEditingCourse, editCourseForm, setEditCourseForm, teacherQuizzes, quizCourseId, newQuizTitle, setNewQuizTitle, selectedQuizId, setSelectedQuizId, newQuestionText, setNewQuestionText, newQuestionOptions, setNewQuestionOptions, newQuestionAnswer, setNewQuestionAnswer, newQuestionExplanation, setNewQuestionExplanation, quizManagerMsg, quizManagerError, allDisciplines, managedCourses, managedCourse, managedSections, chapterSections, uploadPartOptions, selectedManagedContents, handleSetUploadSectionId, showCurriculumSuccess, showCurriculumError, handleCreateCourse, handleCreateSection, handleUploadLessonAsset, handleSelectManagedCourse, loadTeacherQuizzes, handleCreateQuiz, handleAddQuestion, handleDeleteQuestion, handleUpdateCourseDetails, handleSaveEditCourse, handleToggleCoursePublished, handleDeleteCourse, handleUpdateSectionTitle, handleToggleSectionPublished, handleDeleteSection, handleAddChildSection, handleToggleContentPublished, handleDeleteLessonContent } = props;
  const stepTheme = getStepTheme(3);
  const inputFocus = `${curriculumUi.input} ${stepTheme.focus}`;
  return (
<div className="grid grid-cols-1 xl:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
  <div className={`xl:col-span-5 ${curriculumUi.panel} ${getStepTheme(3).panel} space-y-5 self-start`}>
    <div>
      <h3 className={curriculumUi.panelTitle}>
        <FolderTree className="h-5 w-5 text-emerald-400" />
        Ajouter une section
      </h3>
      <p className={curriculumUi.panelSubtitle}>Créez des parties et sous-parties pour organiser votre cours.</p>
    </div>

    <form onSubmit={handleCreateSection} className={`space-y-4 pt-3 ${curriculumUi.divider}`}>
      <label className="block space-y-1">
        <span className={curriculumUi.label}>1. Chapitre parent</span>
        <select
          value={selectedChapterId}
          onChange={(e) => {
            const val = e.target.value;
            setSelectedChapterId(val);
            setSelectedPartieId("");
            setNewSectionParentId(val);
            setNewSectionMode(val ? "part" : "chapter");
          }}
          className={inputFocus}
        >
          <option value="">-- Choisir un chapitre (requis) --</option>
          {chapterSections.map((section) => (
            <option key={section.id} value={section.id}>{section.title}</option>
          ))}
        </select>
      </label>

      <label className="block space-y-1">
        <span className={curriculumUi.label}>2. Partie parent (optionnelle)</span>
        <select
          value={selectedPartieId}
          onChange={(e) => {
            const val = e.target.value;
            setSelectedPartieId(val);
            setNewSectionParentId(val || selectedChapterId);
            setNewSectionMode(val ? "subpart" : "part");
          }}
          disabled={!selectedChapterId}
          className={`w-full rounded-xl border border-slate-700 bg-[#090d16] px-3 py-3 text-xs font-semibold text-slate-100 transition-all focus:bg-slate-950 focus:outline-none focus:ring-4 disabled:bg-slate-900 disabled:text-slate-600 ${stepTheme.focus}`}
        >
          <option value="">-- Sous-section de chapitre (crée une Partie) --</option>
          {managedSections.filter((section) => section.parentId === selectedChapterId).map((section) => (
            <option key={section.id} value={section.id}>{section.title}</option>
          ))}
        </select>
      </label>

      <label className="block space-y-1">
        <span className={curriculumUi.label}>Titre de la nouvelle section</span>
        <input
          type="text"
          required
          placeholder={selectedPartieId ? "ex: Sous-partie B : Modèles avancés" : "ex: Partie 1 : Les bases théoriques"}
          value={newSectionTitle}
          onChange={(e) => setNewSectionTitle(e.target.value)}
          className={inputFocus}
        />
      </label>

      <label className={curriculumUi.checkbox}>
        <input
          type="checkbox"
          checked={newSectionPublished}
          onChange={(e) => setNewSectionPublished(e.target.checked)}
          className={`h-4 w-4 cursor-pointer accent-indigo-600`}
        />
        Publier immédiatement après création
      </label>

      <button
        type="submit"
        disabled={!selectedChapterId}
        className={`w-full rounded-xl py-3 text-xs font-black shadow-sm transition-colors active:scale-[0.98] disabled:scale-100 disabled:opacity-50 ${getStepTheme(3).button}`}
      >
        {selectedPartieId ? "Créer la sous-partie" : "Créer la partie"}
      </button>
    </form>
  </div>

  {/* Right Panel: Outline Hierarchy Tree View */}
  <div className="xl:col-span-7 space-y-4">
    <div className="flex items-center justify-between">
      <h3 className={curriculumUi.sectionTitle}>
        Structure & arborescence du module
      </h3>
      <span className={curriculumUi.countBadge}>
        {managedSections.length} section{managedSections.length !== 1 ? "s" : ""}
      </span>
    </div>

    <div className={curriculumUi.treePanel}>
      {managedSections.length === 0 ? (
        <div className="text-center py-8">
          <FolderTree className="mx-auto mb-2 h-8 w-8 text-emerald-600/60" />
          <p className="text-xs text-slate-400 font-semibold">Le syllabus est vide. Créez un chapitre à l'étape 2.</p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
          {managedSections.map((section) => {
            const depth = section.depth ?? 0;
            const indent = depth * 20;
            const isChapter = !section.parentId;
            const isPart = depth === 1;
            const isSubpart = depth === 2;

            return (
              <div
                key={section.id}
                className={`flex flex-col justify-between gap-3 rounded-2xl border p-3 transition-colors md:flex-row md:items-center ${
                  uploadSectionId === section.id
                    ? getStepTheme(3).listActive
                    : isChapter
                    ? "border-slate-700 bg-slate-800/60"
                    : isPart
                    ? "border-violet-500/20 bg-slate-900/60 shadow-sm"
                    : "border-cyan-500/20 bg-slate-900/40"
                }`}
                style={{ marginLeft: `${Math.min(indent, 80)}px` }}
              >
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  {depth > 0 && (
                    <span className="text-slate-300 font-light select-none pt-0.5">└─</span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleSetUploadSectionId(section.id)}
                    className="text-left flex-1 min-w-0"
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`shrink-0 rounded px-2 py-0.5 text-[8px] font-black uppercase leading-none ${
                        isChapter ? curriculumUi.levelChapter : isPart ? curriculumUi.levelPart : curriculumUi.levelSubpart
                      }`}>
                        {isChapter ? "Chapitre" : isPart ? "Partie" : "Sous-partie"}
                      </span>
                      <span className="text-[9px] text-slate-400 font-bold shrink-0">ID {section.id}</span>
                    </div>
                    <p className={`mt-1.5 truncate text-xs text-slate-200 ${isChapter ? "font-black" : "font-bold"}`}>
                      {section.title}
                    </p>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {!isSubpart && (
                    <button
                      type="button"
                      onClick={() => handleAddChildSection(section)}
                      className={`rounded-xl border p-2 text-[10px] font-bold transition-colors ${getStepTheme(3).chip} hover:opacity-90`}
                      title="Ajouter sous-partie"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      handleSetUploadSectionId(section.id);
                      setActiveCurriculumStep(4);
                    }}
                    className={`rounded-xl border p-2 text-[10px] font-bold transition-colors ${getStepTheme(4).chip} hover:opacity-90`}
                    title="Médias"
                  >
                    <Video className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateSectionTitle(section)}
                    className={curriculumUi.ghostBtn}
                  >
                    Renommer
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleSectionPublished(section)}
                    className={`${curriculumUi.ghostBtn} ${section.published ? "" : "border-emerald-500/30 bg-emerald-950/40 text-emerald-400"}`}
                  >
                    {section.published ? "Masquer" : "Publier"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSection(section)}
                    className={`${curriculumUi.dangerBtn} p-2`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  </div>
</div>
  );
}
