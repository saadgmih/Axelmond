import {
  BookOpen,
  Plus,
  Trash2,
  Edit3,
  Save,
  FilePlus,
  Eye,
  EyeOff,
  DollarSign,
  Clock,
  Award,
  ChevronRight,
} from "lucide-react";
import { formatCredits, formatMad } from "../../../utils/morocco-locale";

import { curriculumUi, getStepTheme, publishedBadge, publishedLabel } from "../curriculum-theme";
import type { TeacherCurriculumViewProps } from "../curriculum-types";

export default function CurriculumModulesStep(props: TeacherCurriculumViewProps) {
  const {
    domains,
    activeCurriculumStep,
    setActiveCurriculumStep,
    selectedChapterId: _selectedChapterId,
    setSelectedChapterId: _setSelectedChapterId,
    selectedPartieId: _selectedPartieId,
    setSelectedPartieId: _setSelectedPartieId,
    newSectionMode: _newSectionMode,
    setNewSectionMode: _setNewSectionMode,
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
    newCourseTitle,
    setNewCourseTitle,
    newCourseDescription,
    setNewCourseDescription,
    newCourseDisciplineId,
    setNewCourseDisciplineId,
    newCourseCredits,
    setNewCourseCredits,
    newCourseDuration,
    setNewCourseDuration,
    newCoursePrice,
    setNewCoursePrice,
    newCoursePublished,
    setNewCoursePublished,
    newSectionCourseId,
    newSectionTitle: _newSectionTitle,
    setNewSectionTitle: _setNewSectionTitle,
    newSectionParentId: _newSectionParentId,
    setNewSectionParentId: _setNewSectionParentId,
    newSectionPublished: _newSectionPublished,
    setNewSectionPublished: _setNewSectionPublished,
    uploadSectionId: _uploadSectionId,
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
    editingCourse,
    setEditingCourse,
    editCourseForm,
    setEditCourseForm,
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
    allDisciplines,
    managedCourses,
    managedCourse: _managedCourse,
    managedSections: _managedSections,
    chapterSections: _chapterSections,
    uploadPartOptions: _uploadPartOptions,
    selectedManagedContents: _selectedManagedContents,
    handleSetUploadSectionId: _handleSetUploadSectionId,
    showCurriculumSuccess: _showCurriculumSuccess,
    showCurriculumError: _showCurriculumError,
    handleCreateCourse,
    handleCreateSection: _handleCreateSection,
    handleUploadLessonAsset: _handleUploadLessonAsset,
    handleSelectManagedCourse,
    loadTeacherQuizzes: _loadTeacherQuizzes,
    handleCreateQuiz: _handleCreateQuiz,
    handleAddQuestion: _handleAddQuestion,
    handleDeleteQuestion: _handleDeleteQuestion,
    handleUpdateCourseDetails,
    handleSaveEditCourse,
    handleToggleCoursePublished,
    handleDeleteCourse,
    handleUpdateSectionTitle: _handleUpdateSectionTitle,
    handleToggleSectionPublished: _handleToggleSectionPublished,
    handleDeleteSection: _handleDeleteSection,
    handleAddChildSection: _handleAddChildSection,
    handleToggleContentPublished: _handleToggleContentPublished,
    handleDeleteLessonContent: _handleDeleteLessonContent,
  } = props;
  const stepTheme = getStepTheme(activeCurriculumStep);
  const inputFocus = `${curriculumUi.input} ${stepTheme.focus}`;
  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className={`xl:col-span-5 ${curriculumUi.panel} ${getStepTheme(1).panel} space-y-5 self-start`}>
        <div>
          <h3 className={curriculumUi.panelTitle}>
            <FilePlus className="h-5 w-5 text-violet-400" />
            Créer un module
          </h3>
        </div>

        <form onSubmit={handleCreateCourse} className={`space-y-4 ${curriculumUi.divider} pt-4`}>
          <label className="block space-y-1.5">
            <span className={curriculumUi.label}>Titre du module</span>
            <div className="relative">
              <BookOpen className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                required
                placeholder="ex: Programmation Python avancée"
                value={newCourseTitle}
                onChange={(e) => setNewCourseTitle(e.target.value)}
                className={`${curriculumUi.inputIcon} ${getStepTheme(1).focus}`}
              />
            </div>
          </label>

          <label className="block space-y-1.5">
            <span className={curriculumUi.label}>Description pédagogique</span>
            <textarea
              rows={3}
              required
              placeholder="Objectifs, compétences visées et compétences acquises..."
              value={newCourseDescription}
              onChange={(e) => setNewCourseDescription(e.target.value)}
              className={`${inputFocus} resize-none`}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className={curriculumUi.label}>Discipline</span>
              <select
                value={newCourseDisciplineId}
                onChange={(e) => setNewCourseDisciplineId(parseInt(e.target.value))}
                className={`${inputFocus} text-slate-700`}
              >
                {domains.map((domain) => (
                  <optgroup key={domain.id} label={domain.name} className="text-slate-800 font-bold">
                    {domain.disciplines.map((discipline) => (
                      <option key={discipline.id} value={discipline.id} className="text-slate-700 font-medium">
                        {discipline.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className={curriculumUi.label}>Crédits</span>
              <input
                type="number"
                min="0"
                placeholder="ex: 3"
                value={newCourseCredits}
                onChange={(e) => setNewCourseCredits(parseInt(e.target.value) || 0)}
                className={inputFocus}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className={curriculumUi.label}>Durée estimée</span>
              <div className="relative">
                <Clock className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  placeholder="ex: 20 heures"
                  value={newCourseDuration}
                  onChange={(e) => setNewCourseDuration(e.target.value)}
                  className={`${curriculumUi.inputIcon} ${getStepTheme(1).focus}`}
                />
              </div>
            </label>

            <label className="block space-y-1.5">
              <span className={curriculumUi.label}>Tarif (DH)</span>
              <div className="relative">
                <span className="absolute left-3 top-3 text-xs font-bold text-slate-400">DH</span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="ex: 0 ou 160"
                  value={newCoursePrice}
                  onChange={(e) => setNewCoursePrice(parseFloat(e.target.value) || 0)}
                  className={`${curriculumUi.inputIcon} pl-8 ${getStepTheme(1).focus}`}
                />
              </div>
            </label>
          </div>

          <label className={curriculumUi.checkbox}>
            <input
              type="checkbox"
              checked={newCoursePublished}
              onChange={(e) => setNewCoursePublished(e.target.checked)}
              className="h-4 w-4 cursor-pointer rounded accent-indigo-600"
            />
            Publier immédiatement le module
          </label>

          <button type="submit" className={curriculumUi.createBtn}>
            <Plus className="h-4 w-4" />
            Créer le module
          </button>
        </form>
      </div>

      <div className="xl:col-span-7 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className={curriculumUi.sectionTitle}>Vos modules ({managedCourses.length})</h3>
          <span className={curriculumUi.countBadge}>
            {managedCourses.length} module{managedCourses.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="max-h-[650px] space-y-4 overflow-y-auto pr-1">
          {managedCourses.length === 0 && (
            <div className={curriculumUi.empty}>
              <BookOpen className="mx-auto mb-2 h-8 w-8 text-slate-600" />
              <p className="text-xs font-semibold text-slate-500">
                Aucun module lié à ce profil. Créez un module à gauche.
              </p>
            </div>
          )}
          {managedCourses.map((course) => (
            <div
              key={course.id}
              className={`${curriculumUi.moduleCard} ${
                newSectionCourseId === course.id ? curriculumUi.moduleCardActive : ""
              }`}
            >
              {editingCourse?.id === course.id ? (
                <form onSubmit={handleSaveEditCourse} className="space-y-4">
                  <div className={`flex items-center justify-between ${curriculumUi.divider} pb-2`}>
                    <p className="text-[10px] font-black uppercase tracking-wider text-indigo-400">
                      Modifier le module #{course.id}
                    </p>
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-[9px] font-black text-slate-400">
                      ID {course.id}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="md:col-span-2 space-y-1 block">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Titre</span>
                      <input
                        required
                        placeholder="Titre du module"
                        value={editCourseForm.title}
                        onChange={(e) => setEditCourseForm((prev) => ({ ...prev, title: e.target.value }))}
                        className={`${curriculumUi.input} ${getStepTheme(1).focus}`}
                      />
                    </label>
                    <label className="md:col-span-2 space-y-1 block">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Description</span>
                      <textarea
                        rows={2}
                        placeholder="Description"
                        value={editCourseForm.description}
                        onChange={(e) => setEditCourseForm((prev) => ({ ...prev, description: e.target.value }))}
                        className={`${curriculumUi.input} ${getStepTheme(1).focus} resize-none`}
                      />
                    </label>
                    <label className="space-y-1 block">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Niveau</span>
                      <input
                        placeholder="Niveau"
                        value={editCourseForm.level}
                        onChange={(e) => setEditCourseForm((prev) => ({ ...prev, level: e.target.value }))}
                        className={`${curriculumUi.input} ${getStepTheme(1).focus}`}
                      />
                    </label>
                    <label className="space-y-1 block">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Durée (ex: 20 heures)</span>
                      <input
                        placeholder="Durée"
                        value={editCourseForm.duration}
                        onChange={(e) => setEditCourseForm((prev) => ({ ...prev, duration: e.target.value }))}
                        className={`${curriculumUi.input} ${getStepTheme(1).focus}`}
                      />
                    </label>
                    <label className="space-y-1 block">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Crédits</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="Crédits"
                        value={editCourseForm.credits}
                        onChange={(e) =>
                          setEditCourseForm((prev) => ({ ...prev, credits: parseInt(e.target.value) || 0 }))
                        }
                        className={`${curriculumUi.input} ${getStepTheme(1).focus}`}
                      />
                    </label>
                    <label className="space-y-1 block">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Prix (DH)</span>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        placeholder="Prix"
                        value={editCourseForm.price}
                        onChange={(e) =>
                          setEditCourseForm((prev) => ({ ...prev, price: parseFloat(e.target.value) || 0 }))
                        }
                        className={`${curriculumUi.input} ${getStepTheme(1).focus}`}
                      />
                    </label>
                    <label className="md:col-span-2 space-y-1 block">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Discipline</span>
                      <select
                        value={editCourseForm.disciplineId}
                        onChange={(e) =>
                          setEditCourseForm((prev) => ({ ...prev, disciplineId: parseInt(e.target.value) }))
                        }
                        className={`${curriculumUi.input} ${getStepTheme(1).focus} text-slate-700`}
                      >
                        {allDisciplines.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-black transition-colors ${getStepTheme(1).button}`}
                    >
                      <Save className="h-4 w-4" /> Enregistrer
                    </button>
                    <button type="button" onClick={() => setEditingCourse(null)} className={curriculumUi.ghostBtn}>
                      Annuler
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 min-w-0 flex-1">
                      <h4 className="text-base font-black text-white leading-snug">{course.title}</h4>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded border px-2.5 py-0.5 text-[9px] font-black uppercase ${getStepTheme(1).chip}`}
                        >
                          {course.discipline?.name || course.category}
                        </span>
                        <span className="text-[9px] font-bold text-slate-500">ID {course.id}</span>
                      </div>
                      <p className="line-clamp-2 text-xs leading-relaxed text-slate-400">{course.description}</p>
                    </div>

                    <span className={publishedBadge(course.published ?? false)}>
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${course.published ? "bg-emerald-400" : "bg-amber-400"}`}
                      />
                      {publishedLabel(course.published ?? false)}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className={curriculumUi.statPill}>
                      <Award className="w-3.5 h-3.5 text-slate-500" />
                      {formatCredits(course.credits)}
                    </span>
                    <span className={curriculumUi.statPill}>
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      {course.duration}
                    </span>
                    <span className={course.price > 0 ? curriculumUi.statPrice : curriculumUi.statPill}>
                      <DollarSign className="w-3.5 h-3.5" />
                      {course.price > 0 ? formatMad(course.price) : "Accès gratuit"}
                    </span>
                  </div>

                  <div className={`flex flex-wrap items-center justify-between gap-3 pt-4 ${curriculumUi.divider}`}>
                    <div className="flex gap-2">
                      <button onClick={() => handleUpdateCourseDetails(course)} className={curriculumUi.ghostBtn}>
                        <Edit3 className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Modifier</span>
                      </button>
                      <button
                        onClick={() => handleToggleCoursePublished(course)}
                        className={course.published ? curriculumUi.unpublishBtn : curriculumUi.ghostBtn}
                      >
                        {course.published ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Dépublier</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Publier</span>
                          </>
                        )}
                      </button>
                      <button onClick={() => handleDeleteCourse(course)} className={curriculumUi.dangerBtn}>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Supprimer</span>
                      </button>
                    </div>

                    <button
                      onClick={() => handleSelectManagedCourse(course.id).then(() => setActiveCurriculumStep(2))}
                      className={curriculumUi.manageBtn}
                    >
                      Gérer le programme
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
