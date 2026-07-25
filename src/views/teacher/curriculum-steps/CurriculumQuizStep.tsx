import { CheckCircle2, ChevronDown, ChevronRight, Edit3, HelpCircle, Plus, Trash2, X } from "lucide-react";

import LatexText from "../../../components/LazyLatexText";
import { curriculumUi, getStepTheme } from "../curriculum-theme";
import type { TeacherCurriculumViewProps } from "../curriculum-types";

export default function CurriculumQuizStep(props: TeacherCurriculumViewProps) {
  const {
    domains: _domains,
    activeCurriculumStep: _activeCurriculumStep,
    setActiveCurriculumStep: _setActiveCurriculumStep,
    quizChapterId: _quizChapterId,
    setQuizChapterId: _setQuizChapterId,
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
    newSectionTitle: _newSectionTitle,
    setNewSectionTitle: _setNewSectionTitle,
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
    editingCourse: _editingCourse,
    setEditingCourse: _setEditingCourse,
    editCourseForm: _editCourseForm,
    setEditCourseForm: _setEditCourseForm,
    teacherQuizzes,
    selectedQuizDetail,
    quizCourseId: _quizCourseId,
    newQuizTitle: _newQuizTitle,
    setNewQuizTitle: _setNewQuizTitle,
    selectedQuizId,
    setSelectedQuizId,
    newQuestionText,
    setNewQuestionText,
    newQuestionOptions,
    setNewQuestionOptions,
    newQuestionAnswer,
    setNewQuestionAnswer,
    newQuestionExplanation,
    setNewQuestionExplanation,
    quizManagerMsg,
    quizManagerError,
    editingQuestionId,
    handleDeleteQuiz,
    handleUpdateQuizTitle,
    handleStartEditQuestion,
    handleCancelEditQuestion,
    allDisciplines: _allDisciplines,
    managedCourses: _managedCourses,
    managedCourse: _managedCourse,
    managedSections: _managedSections,
    chapterSections: _chapterSections,
    selectedManagedContents: _selectedManagedContents,
    handleSetUploadSectionId: _handleSetUploadSectionId,
    showCurriculumSuccess: _showCurriculumSuccess,
    showCurriculumError: _showCurriculumError,
    handleCreateCourse: _handleCreateCourse,
    handleCreateChapter: _handleCreateChapter,
    handleUploadLessonAsset: _handleUploadLessonAsset,
    handleSelectManagedCourse: _handleSelectManagedCourse,
    loadTeacherQuizzes: _loadTeacherQuizzes,
    handleCreateQuiz,
    handleAddQuestion,
    handleDeleteQuestion,
    handleUpdateCourseDetails: _handleUpdateCourseDetails,
    handleSaveEditCourse: _handleSaveEditCourse,
    handleToggleCoursePublished: _handleToggleCoursePublished,
    handleDeleteCourse: _handleDeleteCourse,
    handleUpdateSectionTitle: _handleUpdateSectionTitle,
    handleToggleSectionPublished: _handleToggleSectionPublished,
    handleDeleteSection: _handleDeleteSection,
    handleToggleContentPublished: _handleToggleContentPublished,
    handleDeleteLessonContent: _handleDeleteLessonContent,
  } = props;
  const stepTheme = getStepTheme(4);
  const inputFocus = `${curriculumUi.input} ${stepTheme.focus}`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Left Column: List of Quizzes */}
      <div className="lg:col-span-5 space-y-6">
        <div className={`${curriculumUi.panel} ${getStepTheme(4).panel} space-y-5`}>
          <div className={`flex flex-wrap items-center justify-between gap-3 ${curriculumUi.divider} pb-3`}>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                Quiz du module ({teacherQuizzes.length})
              </h3>
              <p className="text-[11px] font-medium text-slate-400">Sélectionnez un quiz pour gérer ses QCMs.</p>
            </div>
            <button
              type="button"
              onClick={() => handleCreateQuiz()}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black shadow-sm transition-all active:scale-95 ${stepTheme.button}`}
            >
              <Plus className="h-4 w-4" />
              Nouveau Quiz (Quiz {teacherQuizzes.length + 1})
            </button>
          </div>

          {(quizManagerMsg || quizManagerError) && (
            <div
              className={`p-3 border text-xs font-semibold rounded-xl animate-in fade-in duration-200 ${
                quizManagerError ? curriculumUi.alertError : curriculumUi.alertSuccess
              }`}
            >
              {quizManagerError || quizManagerMsg}
            </div>
          )}

          <div className="space-y-2.5 max-h-[550px] overflow-y-auto pr-1">
            {teacherQuizzes.length === 0 ? (
              <div className={`${curriculumUi.empty} p-6 space-y-3 text-center`}>
                <p className="text-xs text-slate-400 font-semibold">
                  Aucun quiz n'a encore été créé pour ce module.
                </p>
                <button
                  type="button"
                  onClick={() => handleCreateQuiz()}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-black transition-all active:scale-95 ${stepTheme.button}`}
                >
                  <Plus className="h-4 w-4" />
                  Créer le premier Quiz (Quiz 1)
                </button>
              </div>
            ) : (
              teacherQuizzes.map((quiz, quizIndex) => {
                const isSelected = selectedQuizId === quiz.id;
                const questionCount = quiz.questionCount ?? quiz.questions?.length ?? 0;
                const questions = isSelected ? selectedQuizDetail?.questions || [] : [];
                return (
                  <div
                    key={quiz.id}
                    className={`rounded-2xl border transition-all ${
                      isSelected ? getStepTheme(4).listActive : `${curriculumUi.card} ${curriculumUi.cardHover}`
                    }`}
                  >
                    <div
                      onClick={() => setSelectedQuizId(isSelected ? "" : quiz.id)}
                      className="cursor-pointer p-4 flex items-center justify-between gap-3 select-none"
                    >
                      <div className="flex-1 min-w-0">
                        <span
                          className={`rounded border px-1.5 py-0.5 text-[8px] font-black uppercase ${getStepTheme(4).chip}`}
                        >
                          {questionCount} QCM{questionCount !== 1 ? "s" : ""}
                        </span>
                        <h4 className="text-xs font-black text-white mt-2 truncate">
                          {quiz.title || `Quiz ${quizIndex + 1}`}
                        </h4>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {handleUpdateQuizTitle && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateQuizTitle(quiz);
                            }}
                            className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                            title="Renommer le quiz"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {handleDeleteQuiz && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteQuiz(quiz.id);
                            }}
                            className="rounded p-1.5 text-slate-400 transition-colors hover:bg-red-950/60 hover:text-red-400"
                            title="Supprimer le quiz"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <span className="p-1 text-slate-400 hover:text-white">
                          {isSelected ? (
                            <ChevronDown className="w-4 h-4 text-teal-300" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Sub-tree for QCMs inside selected Quiz */}
                    {isSelected && (
                      <div className="px-4 pb-4 pt-1 border-t border-slate-800/80">
                        <div className="ml-2 pl-3 border-l-2 border-teal-500/40 space-y-2">
                          {questions.length > 0 ? (
                            questions.map((q: any, qIdx: number) => {
                              const isEditingThisQcm = editingQuestionId === q.id;
                              return (
                                <div
                                  key={q.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartEditQuestion?.(q);
                                  }}
                                  className={`group flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all cursor-pointer border ${
                                    isEditingThisQcm
                                      ? "border-teal-500/60 bg-teal-950/80 text-teal-200 shadow-sm"
                                      : "border-slate-800/90 bg-slate-950/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900/80 hover:text-white"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="shrink-0 font-mono text-[9px] font-black uppercase tracking-wider text-teal-400">
                                      QCM {qIdx + 1}
                                    </span>
                                    <span className="truncate text-[11px] font-medium text-slate-300">
                                      {q.question ? q.question.replace(/\$+/g, "").slice(0, 30) : "Sans énoncé"}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
                                    {handleStartEditQuestion && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleStartEditQuestion(q);
                                        }}
                                        className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-teal-300"
                                        title="Modifier ce QCM"
                                      >
                                        <Edit3 className="w-3 h-3" />
                                      </button>
                                    )}
                                    {handleDeleteQuestion && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteQuestion(q.id);
                                        }}
                                        className="rounded p-1 text-slate-400 hover:bg-red-950/60 hover:text-red-400"
                                        title="Supprimer ce QCM"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-[11px] font-medium text-slate-400 italic py-1">
                              Aucun QCM dans ce quiz.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Right Column: QCM Builder Form ONLY */}
      <div className="lg:col-span-7 space-y-6">
        {selectedQuizId ? (
          <div className={`${curriculumUi.panel} ${getStepTheme(4).panel} space-y-5 overflow-hidden`}>
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-teal-300">
                {editingQuestionId ? "Modifier le QCM" : "Ajouter un QCM à ce Quiz"}
              </h4>
              {editingQuestionId && handleCancelEditQuestion && (
                <button
                  type="button"
                  onClick={handleCancelEditQuestion}
                  className="text-[10px] font-bold text-slate-400 hover:text-white underline"
                >
                  Annuler la modification
                </button>
              )}
            </div>

            <form onSubmit={handleAddQuestion} className="space-y-4">
              <label className="block space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Énoncé du QCM
                </span>
                <textarea
                  required
                  rows={4}
                  placeholder={String.raw`Exemple : Calculer le déterminant de $$A=\begin{pmatrix}1&2\\3&4\end{pmatrix}$$`}
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                  className={`${inputFocus} font-mono leading-relaxed`}
                />
              </label>

              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block font-semibold">
                  Options de réponses
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {newQuestionOptions.map((opt, idx) => (
                    <div key={idx} className="rounded-2xl border border-slate-700/80 bg-slate-950/40 p-2.5">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="flex h-6 w-6 select-none items-center justify-center rounded-lg border border-teal-500/30 bg-teal-950/60 text-[10px] font-black text-teal-300">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        {newQuestionAnswer === opt && opt.trim() && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-300">
                            <CheckCircle2 className="h-3 w-3" />
                            Correcte
                          </span>
                        )}
                      </div>
                      <textarea
                        required
                        rows={2}
                        placeholder={String.raw`Option ${String.fromCharCode(65 + idx)} avec LaTeX`}
                        value={opt}
                        onChange={(e) => {
                          const next = [...newQuestionOptions];
                          const previousValue = next[idx];
                          next[idx] = e.target.value;
                          setNewQuestionOptions(next);
                          if (newQuestionAnswer === previousValue) {
                            setNewQuestionAnswer(e.target.value);
                          }
                        }}
                        className={`w-full rounded-xl border border-slate-700 bg-[#031512] px-3 py-2.5 font-mono text-xs font-semibold leading-relaxed text-slate-100 transition-all focus:bg-slate-950 focus:outline-none focus:ring-2 ${stepTheme.focus}`}
                      />
                      {opt.trim() && (
                        <div className="mt-2 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-[11px] font-semibold text-slate-200">
                          <LatexText value={opt} compact />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Bonne réponse
                  </span>
                  <select
                    value={newQuestionAnswer}
                    onChange={(e) => setNewQuestionAnswer(e.target.value)}
                    required
                    className={`${inputFocus} text-slate-700`}
                  >
                    <option value="">-- Choisir la bonne option --</option>
                    {newQuestionOptions
                      .map((option, index) => ({ option, index }))
                      .filter(({ option }) => option.trim())
                      .map(({ option, index }) => (
                        <option key={`${index}-${option}`} value={option}>
                          {`Option ${String.fromCharCode(65 + index)}`}
                        </option>
                      ))}
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Explication didactique
                  </span>
                  <textarea
                    required
                    rows={3}
                    placeholder={String.raw`Exemple : $\det(A)=1\times4-2\times3=-2$`}
                    value={newQuestionExplanation}
                    onChange={(e) => setNewQuestionExplanation(e.target.value)}
                    className={`${inputFocus} font-mono leading-relaxed`}
                  />
                </label>
              </div>

              <button
                type="submit"
                className={`w-full rounded-xl py-3 text-xs font-black shadow-sm transition-colors active:scale-[0.98] ${getStepTheme(4).button}`}
              >
                {editingQuestionId ? "Enregistrer les modifications du QCM" : "Ajouter ce QCM au Quiz"}
              </button>
            </form>
          </div>
        ) : (
          <div
            className={`${curriculumUi.panel} flex h-full flex-col items-center justify-center gap-2 py-16 text-center`}
          >
            <HelpCircle className="h-10 w-10 text-teal-500/50" />
            <h4 className="text-sm font-black text-slate-200">Aucun quiz sélectionné</h4>
            <p className="text-xs text-slate-400 font-medium max-w-xs leading-relaxed">
              Sélectionnez un quiz existant dans la colonne de gauche ou créez-en un nouveau pour commencer à y insérer
              des QCMs.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

