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
  Gift,
} from "lucide-react";
import { formatCredits, formatMad, creditsLabel } from "../../../utils/morocco-locale";
import {
  COURSE_PRICE_STEP,
  FREE_COURSE_PRICE,
  MIN_PAID_COURSE_PRICE,
  formatFreeAccessDurationLabel,
} from "../../../utils/course-pricing";
import FreeAccessWindowFields from "../../../components/FreeAccessWindowFields";
import {
  normalizeNumericInputValue,
  numberFromNumericInput,
  numericInputFromNumber,
} from "../../../utils/numeric-input";

import { curriculumUi, getStepTheme, getSyllabusStep, publishedBadge, publishedLabel } from "../curriculum-theme";
import type { TeacherCurriculumViewProps } from "../curriculum-types";

export default function CurriculumModulesStep(props: TeacherCurriculumViewProps) {
  const {
    domains,
    canManageAcademicTaxonomy,
    activeCurriculumStep: _activeCurriculumStep,
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
    newCourseIsFree,
    setNewCourseIsFree,
    newCourseFreeAccessStartsAt,
    setNewCourseFreeAccessStartsAt,
    newCourseFreeAccessEndsAt,
    setNewCourseFreeAccessEndsAt,
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
  const stepTheme = getStepTheme(1);
  const syllabusStep = getSyllabusStep(canManageAcademicTaxonomy);
  const inputFocus = `${curriculumUi.input} ${stepTheme.focus}`;
  const paidCoursePriceInputValue = (value: string) =>
    numberFromNumericInput(value, FREE_COURSE_PRICE) >= MIN_PAID_COURSE_PRICE
      ? value
      : numericInputFromNumber(MIN_PAID_COURSE_PRICE);
  const priceModeButtonClass = (active: boolean) =>
    `inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-black transition-colors ${
      active
        ? "border-green-600 bg-green-700/30 text-white"
        : "border-slate-700 bg-slate-950/70 text-slate-400 hover:border-slate-500 hover:text-white"
    }`;
  const priceInputClass = (isDisabled: boolean, className: string) =>
    `${className} ${isDisabled ? "cursor-not-allowed opacity-60" : ""}`;
  const hasDisciplineOptions = allDisciplines.length > 0;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 xl:items-stretch animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className={`xl:col-span-5 ${curriculumUi.panel} ${getStepTheme(1).panel} space-y-5 self-start`}>
        <div>
          <h3 className={curriculumUi.panelTitle}>
            <FilePlus className="h-5 w-5 text-green-500" />
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
                value={hasDisciplineOptions ? newCourseDisciplineId : 0}
                required
                disabled={!hasDisciplineOptions}
                onChange={(e) => setNewCourseDisciplineId(parseInt(e.target.value))}
                className={`${inputFocus} text-slate-700 ${hasDisciplineOptions ? "" : "cursor-not-allowed opacity-60"}`}
              >
                {!hasDisciplineOptions && <option value={0}>Aucun sous-domaine disponible</option>}
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
              <span className={curriculumUi.label}>{creditsLabel()}</span>
              <input
                type="number"
                min="0"
                placeholder="ex: 3"
                value={newCourseCredits}
                onChange={(e) => setNewCourseCredits(normalizeNumericInputValue(e.target.value))}
                className={inputFocus}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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

            <div className="block space-y-2">
              <span className={curriculumUi.label}>Tarif du module</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setNewCourseIsFree(true);
                    setNewCoursePrice(numericInputFromNumber(FREE_COURSE_PRICE));
                  }}
                  className={priceModeButtonClass(newCourseIsFree)}
                >
                  <Gift className="h-3.5 w-3.5" />
                  Gratuit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewCourseIsFree(false);
                    setNewCoursePrice(paidCoursePriceInputValue(newCoursePrice));
                  }}
                  className={priceModeButtonClass(!newCourseIsFree)}
                >
                  <DollarSign className="h-3.5 w-3.5" />
                  Payant
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-3 text-xs font-bold text-slate-400">DH</span>
                <input
                  type="number"
                  min={MIN_PAID_COURSE_PRICE}
                  step={COURSE_PRICE_STEP}
                  placeholder={`min. ${formatMad(MIN_PAID_COURSE_PRICE)}`}
                  value={newCourseIsFree ? numericInputFromNumber(FREE_COURSE_PRICE) : newCoursePrice}
                  disabled={newCourseIsFree}
                  onChange={(e) => setNewCoursePrice(normalizeNumericInputValue(e.target.value))}
                  onBlur={() => {
                    if (!newCourseIsFree) setNewCoursePrice(paidCoursePriceInputValue(newCoursePrice));
                  }}
                  className={priceInputClass(
                    newCourseIsFree,
                    `${curriculumUi.inputIcon} pl-8 ${getStepTheme(1).focus}`,
                  )}
                />
              </div>
              <p className="text-[10px] font-semibold leading-relaxed text-slate-500">
                Payant : minimum {formatMad(MIN_PAID_COURSE_PRICE)}. Gratuit : période fixe au calendrier.
              </p>
            </div>
          </div>

          {newCourseIsFree && (
            <FreeAccessWindowFields
              startsAt={newCourseFreeAccessStartsAt}
              endsAt={newCourseFreeAccessEndsAt}
              onStartsAtChange={setNewCourseFreeAccessStartsAt}
              onEndsAtChange={setNewCourseFreeAccessEndsAt}
              inputClassName={`${curriculumUi.input} ${getStepTheme(1).focus}`}
            />
          )}

          <label className={curriculumUi.checkbox}>
            <input
              type="checkbox"
              checked={newCoursePublished}
              onChange={(e) => setNewCoursePublished(e.target.checked)}
              className="h-4 w-4 cursor-pointer rounded accent-emerald-600"
            />
            Publier immédiatement le module
          </label>

          <button
            type="submit"
            disabled={!hasDisciplineOptions}
            className={`${curriculumUi.createBtn} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <Plus className="h-4 w-4" />
            Créer le module
          </button>
        </form>
      </div>

      <div className="flex min-h-0 flex-col gap-4 xl:col-span-7 xl:min-h-[calc(100dvh-18rem)]">
        <div className="flex shrink-0 items-center justify-between">
          <h3 className={curriculumUi.sectionTitle}>Vos modules ({managedCourses.length})</h3>
          <span className={curriculumUi.countBadge}>
            {managedCourses.length} module{managedCourses.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto rounded-3xl border border-slate-800 bg-slate-900/40 p-4 pr-2">
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
                    <p className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                      Modifier le module
                    </p>
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
                      <span className="text-[9px] font-bold text-slate-400 uppercase">{creditsLabel()}</span>
                      <input
                        type="number"
                        min="0"
                        placeholder={creditsLabel()}
                        value={editCourseForm.credits}
                        onChange={(e) =>
                          setEditCourseForm((prev) => ({
                            ...prev,
                            credits: normalizeNumericInputValue(e.target.value),
                          }))
                        }
                        className={`${curriculumUi.input} ${getStepTheme(1).focus}`}
                      />
                    </label>
                    <div className="space-y-2 block">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Tarif du module</span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setEditCourseForm((prev) => ({
                              ...prev,
                              isFree: true,
                              price: numericInputFromNumber(FREE_COURSE_PRICE),
                              freeAccessStartsAt: prev.freeAccessStartsAt || newCourseFreeAccessStartsAt,
                              freeAccessEndsAt: prev.freeAccessEndsAt || newCourseFreeAccessEndsAt,
                            }))
                          }
                          className={priceModeButtonClass(editCourseForm.isFree)}
                        >
                          <Gift className="h-3.5 w-3.5" />
                          Gratuit
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setEditCourseForm((prev) => ({
                              ...prev,
                              isFree: false,
                              price: paidCoursePriceInputValue(prev.price),
                            }))
                          }
                          className={priceModeButtonClass(!editCourseForm.isFree)}
                        >
                          <DollarSign className="h-3.5 w-3.5" />
                          Payant
                        </button>
                      </div>
                      <input
                        type="number"
                        min={MIN_PAID_COURSE_PRICE}
                        step={COURSE_PRICE_STEP}
                        placeholder={`min. ${formatMad(MIN_PAID_COURSE_PRICE)}`}
                        value={editCourseForm.isFree ? numericInputFromNumber(FREE_COURSE_PRICE) : editCourseForm.price}
                        disabled={editCourseForm.isFree}
                        onChange={(e) =>
                          setEditCourseForm((prev) => ({
                            ...prev,
                            price: normalizeNumericInputValue(e.target.value),
                          }))
                        }
                        onBlur={() =>
                          setEditCourseForm((prev) =>
                            prev.isFree ? prev : { ...prev, price: paidCoursePriceInputValue(prev.price) },
                          )
                        }
                        className={priceInputClass(
                          editCourseForm.isFree,
                          `${curriculumUi.input} ${getStepTheme(1).focus}`,
                        )}
                      />
                      <p className="text-[10px] font-semibold leading-relaxed text-slate-500">
                        Payant : minimum {formatMad(MIN_PAID_COURSE_PRICE)}. Gratuit : période fixe au calendrier.
                      </p>
                    </div>
                    {editCourseForm.isFree && (
                      <div className="md:col-span-2">
                        <FreeAccessWindowFields
                          startsAt={editCourseForm.freeAccessStartsAt}
                          endsAt={editCourseForm.freeAccessEndsAt}
                          onStartsAtChange={(value) =>
                            setEditCourseForm((prev) => ({ ...prev, freeAccessStartsAt: value }))
                          }
                          onEndsAtChange={(value) =>
                            setEditCourseForm((prev) => ({ ...prev, freeAccessEndsAt: value }))
                          }
                          inputClassName={`${curriculumUi.input} ${getStepTheme(1).focus}`}
                        />
                      </div>
                    )}
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
                      </div>
                      <p className="line-clamp-2 text-xs leading-relaxed text-slate-400">{course.description}</p>
                    </div>

                    <span className={publishedBadge(course.published ?? false)}>
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${course.published ? "bg-emerald-400" : "bg-lime-400"}`}
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
                      {course.price > 0
                        ? formatMad(course.price)
                        : formatFreeAccessDurationLabel(
                            course.freeAccessDurationDays,
                            course.freeAccessStartsAt,
                            course.freeAccessEndsAt,
                          )}
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
                      onClick={() =>
                        handleSelectManagedCourse(course.id).then(() => setActiveCurriculumStep(syllabusStep))
                      }
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
