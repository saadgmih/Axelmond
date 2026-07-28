import { useState } from "react";
import { AlertCircle, CheckCircle2, ChevronDown, ChevronRight, Edit3, HelpCircle, Plus, Trash2, X } from "lucide-react";

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

  const [isCreatingQcm, setIsCreatingQcm] = useState(false);
  const stepTheme = getStepTheme(4);
  const inputFocus = `${curriculumUi.input} ${stepTheme.focus}`;

  // Parse comma-separated list of selected correct options to support multiple correct answers per QCM
  const selectedCorrectOptions = newQuestionAnswer
    ? newQuestionAnswer.split(",").map((a) => a.trim()).filter(Boolean)
    : [];

  const toggleCorrectOption = (opt: string) => {
    const cleanOpt = opt.trim();
    if (!cleanOpt) return;

    let updatedList: string[];
    if (selectedCorrectOptions.includes(cleanOpt)) {
      updatedList = selectedCorrectOptions.filter((item) => item !== cleanOpt);
    } else {
      updatedList = [...selectedCorrectOptions, cleanOpt];
    }
    setNewQuestionAnswer(updatedList.join(", "));
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Top Bar: Permanent Add Quiz button & Header */}
      <div className={`${curriculumUi.panel} ${getStepTheme(4).panel} space-y-4`}>
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-black uppercase tracking-wider text-white flex items-center gap-2">
              Gestion du Contenu - Module Quiz ({teacherQuizzes.length})
            </h3>
            <p className="text-xs font-medium text-slate-400 mt-1">
              Structure hiérarchique à 3 niveaux : Quiz &rarr; Questions QCM &rarr; Choix de réponses.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleCreateQuiz()}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black shadow-md transition-all active:scale-95 ${stepTheme.button}`}
          >
            <Plus className="h-4 w-4" />
            Ajouter un Quiz (Quiz {teacherQuizzes.length + 1})
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

        {/* Level 1: List of Quizzes */}
        <div className="space-y-4 pt-2">
          {teacherQuizzes.length === 0 ? (
            <div className={`${curriculumUi.empty} p-8 text-center space-y-3`}>
              <HelpCircle className="h-10 w-10 text-slate-500 mx-auto" />
              <p className="text-xs text-slate-400 font-semibold">
                Aucun quiz n'a encore été créé dans ce module.
              </p>
              <button
                type="button"
                onClick={() => handleCreateQuiz()}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition-all active:scale-95 ${stepTheme.button}`}
              >
                <Plus className="h-4 w-4" />
                Créer le premier Quiz (Quiz 1)
              </button>
            </div>
          ) : (
            teacherQuizzes.map((quiz, quizIndex) => {
              const isQuizOpen = selectedQuizId === quiz.id;
              const questionCount =
                quiz.questionCount ??
                quiz.questions?.length ??
                (isQuizOpen ? selectedQuizDetail?.questions?.length || 0 : 0);
              const questions = isQuizOpen ? selectedQuizDetail?.questions || [] : [];

              return (
                <div
                  key={quiz.id}
                  className={`rounded-2xl border transition-all overflow-hidden ${
                    isQuizOpen
                      ? "border-teal-500/60 bg-slate-900/90 shadow-lg ring-1 ring-teal-500/30"
                      : `${curriculumUi.card} ${curriculumUi.cardHover}`
                  }`}
                >
                  {/* LEVEL 1: QUIZ HEADER */}
                  <div
                    onClick={() => {
                      if (isQuizOpen) {
                        setSelectedQuizId("");
                        setIsCreatingQcm(false);
                        handleCancelEditQuestion?.();
                      } else {
                        setSelectedQuizId(quiz.id);
                        setIsCreatingQcm(false);
                        handleCancelEditQuestion?.();
                      }
                    }}
                    className="cursor-pointer p-4 flex items-center justify-between gap-4 select-none bg-slate-950/70 hover:bg-slate-900/90 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="p-1 rounded-lg border border-teal-500/30 bg-teal-950/60 text-teal-300 shrink-0">
                        {isQuizOpen ? (
                          <ChevronDown className="w-5 h-5 text-teal-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-slate-400" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${getStepTheme(4).chip}`}
                          >
                            {questionCount} QCM{questionCount !== 1 ? "s" : ""}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Niveau 1 : Quiz
                          </span>
                        </div>
                        <h4 className="text-sm font-black text-white mt-1 truncate">
                          {quiz.title || `Quiz ${quizIndex + 1}`}
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {handleUpdateQuizTitle && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateQuizTitle(quiz);
                          }}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white border border-slate-700/50"
                          title="Renommer le quiz"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                      {handleDeleteQuiz && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteQuiz(quiz.id);
                          }}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-950/60 hover:text-red-400 border border-slate-700/50"
                          title="Supprimer ce quiz et ses QCMs"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* LEVEL 2: EXPANDED QUIZ CONTENT (QCM LIST) */}
                  {isQuizOpen && (
                    <div className="p-5 border-t border-slate-800 bg-slate-950/40 space-y-4">
                      {/* Button to add QCM to this Quiz */}
                      <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                        <span className="text-xs font-black uppercase tracking-wider text-teal-400 flex items-center gap-2">
                          Questions QCM de ce Quiz ({questions.length})
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            handleCancelEditQuestion?.();
                            setIsCreatingQcm(true);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-teal-500/40 bg-teal-950/70 px-3 py-1.5 text-xs font-bold text-teal-300 hover:bg-teal-900/80 hover:text-white transition-all shadow-sm active:scale-95"
                        >
                          <Plus className="h-4 w-4 text-teal-400" />
                          Ajouter une question QCM
                        </button>
                      </div>

                      {/* QCM Form when creating a new QCM or editing an existing one */}
                      {(isCreatingQcm || editingQuestionId) && (
                        <div className="rounded-2xl border border-teal-500/50 bg-slate-900/95 p-5 space-y-5 shadow-xl ring-1 ring-teal-500/20 animate-in fade-in duration-200">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h4 className="text-xs font-black uppercase tracking-wider text-teal-300">
                              {editingQuestionId
                                ? "Modifier la question QCM"
                                : "Nouvelle question QCM (Niveau 2)"}
                            </h4>
                            <button
                              type="button"
                              onClick={() => {
                                setIsCreatingQcm(false);
                                handleCancelEditQuestion?.();
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-white"
                            >
                              <X className="w-3.5 h-3.5" />
                              Fermer
                            </button>
                          </div>

                          <form
                            onSubmit={(e) => {
                              handleAddQuestion(e);
                              setIsCreatingQcm(false);
                            }}
                            className="space-y-5"
                          >
                            {/* Question Énoncé */}
                            <label className="block space-y-1.5">
                              <span className="text-[11px] font-black uppercase tracking-wider text-slate-300 block">
                                Énoncé de la question QCM
                              </span>
                              <textarea
                                required
                                rows={3}
                                placeholder={String.raw`Exemple : Calculer le déterminant de $$A=\begin{pmatrix}1&2\\3&4\end{pmatrix}$$`}
                                value={newQuestionText}
                                onChange={(e) => setNewQuestionText(e.target.value)}
                                className={`${inputFocus} font-mono leading-relaxed text-xs`}
                              />
                            </label>

                            {/* LEVEL 3: CHOICES MANAGEMENT */}
                            <div className="space-y-3 border-t border-slate-800/80 pt-4">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <span className="text-[11px] font-black uppercase tracking-wider text-teal-300 block">
                                    Niveau 3 : Choix de réponses ({newQuestionOptions.length})
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    Minimum 2 choix requis. Vous pouvez cocher <strong>une ou plusieurs bonnes réponses</strong> (ex: Option A et Option C).
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextLetter = String.fromCharCode(65 + newQuestionOptions.length);
                                    setNewQuestionOptions([...newQuestionOptions, `Option ${nextLetter}`]);
                                  }}
                                  className="inline-flex items-center gap-1.5 rounded-xl border border-teal-500/40 bg-teal-950/60 px-3 py-1.5 text-xs font-bold text-teal-300 hover:bg-teal-900/80 hover:text-white transition-all shrink-0"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  Ajouter un choix
                                </button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {newQuestionOptions.map((opt, idx) => {
                                  const isCorrect = selectedCorrectOptions.includes(opt.trim()) && opt.trim().length > 0;
                                  const canDelete = newQuestionOptions.length > 2;

                                  return (
                                    <div
                                      key={idx}
                                      className={`rounded-2xl border p-3 transition-all space-y-2.5 ${
                                        isCorrect
                                          ? "border-emerald-500/60 bg-emerald-950/30 ring-1 ring-emerald-500/30"
                                          : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                                      }`}
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                          <span className="flex h-6 w-6 select-none items-center justify-center rounded-lg border border-teal-500/40 bg-teal-950/80 text-[10px] font-black text-teal-300">
                                            {String.fromCharCode(65 + idx)}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => toggleCorrectOption(opt)}
                                            className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-black uppercase transition-all border ${
                                              isCorrect
                                                ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300 shadow-sm"
                                                : "border-slate-700/80 bg-slate-900 text-slate-400 hover:border-emerald-500/40 hover:text-emerald-300"
                                            }`}
                                          >
                                            <CheckCircle2 className="h-3 w-3" />
                                            {isCorrect ? "Bonne réponse ✓" : "Définir comme bonne réponse"}
                                          </button>
                                        </div>

                                        {/* Delete choice button with minimum 2 choices rule */}
                                        <button
                                          type="button"
                                          disabled={!canDelete}
                                          onClick={() => {
                                            if (!canDelete) return;
                                            const target = newQuestionOptions[idx];
                                            const nextOpts = newQuestionOptions.filter((_, i) => i !== idx);
                                            setNewQuestionOptions(nextOpts);
                                            if (target && selectedCorrectOptions.includes(target.trim())) {
                                              const updatedCorrect = selectedCorrectOptions.filter(
                                                (item) => item !== target.trim(),
                                              );
                                              setNewQuestionAnswer(updatedCorrect.join(", "));
                                            }
                                          }}
                                          className={`rounded-lg p-1.5 transition-all border ${
                                            canDelete
                                              ? "border-slate-800 text-slate-400 hover:bg-red-950/60 hover:text-red-400 hover:border-red-900/50 cursor-pointer"
                                              : "border-slate-800/40 text-slate-600 cursor-not-allowed opacity-40"
                                          }`}
                                          title={canDelete ? "Supprimer ce choix" : "Impossible : 2 choix minimum requis"}
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>

                                      <textarea
                                        required
                                        rows={2}
                                        placeholder={`Contenu du choix ${String.fromCharCode(65 + idx)}`}
                                        value={opt}
                                        onChange={(e) => {
                                          const previousVal = newQuestionOptions[idx];
                                          const newVal = e.target.value;
                                          const next = [...newQuestionOptions];
                                          next[idx] = newVal;
                                          setNewQuestionOptions(next);

                                          if (previousVal && selectedCorrectOptions.includes(previousVal.trim())) {
                                            const updatedCorrect = selectedCorrectOptions.map((item) =>
                                              item === previousVal.trim() ? newVal.trim() : item,
                                            );
                                            setNewQuestionAnswer(updatedCorrect.join(", "));
                                          }
                                        }}
                                        className={`w-full rounded-xl border border-slate-700/80 bg-[#031512] px-3 py-2 font-mono text-xs font-semibold text-slate-100 transition-all focus:bg-slate-950 focus:outline-none focus:ring-2 ${stepTheme.focus}`}
                                      />

                                      {opt.trim() && (
                                        <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-1.5 text-[11px] font-semibold text-slate-200">
                                          <LatexText value={opt} compact />
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              {selectedCorrectOptions.length === 0 && (
                                <p className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5 pt-1">
                                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                  Veuillez cocher au moins une option comme bonne réponse.
                                </p>
                              )}
                            </div>

                            {/* Summary & Explication */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800/80 pt-4">
                              <div className="block space-y-1.5">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                  Bonne(s) réponse(s) définie(s) ({selectedCorrectOptions.length})
                                </span>
                                <div className="flex flex-wrap items-center gap-1.5 p-2.5 rounded-xl border border-slate-700/80 bg-[#031512] min-h-[42px]">
                                  {selectedCorrectOptions.length === 0 ? (
                                    <span className="text-xs text-amber-400 font-semibold italic">
                                      Aucune bonne réponse cochée.
                                    </span>
                                  ) : (
                                    selectedCorrectOptions.map((ans, aIdx) => (
                                      <span
                                        key={aIdx}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/50 bg-emerald-500/20 px-2.5 py-1 text-xs font-black text-emerald-300 shadow-sm"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                        {ans}
                                      </span>
                                    ))
                                  )}
                                </div>
                              </div>

                              <label className="block space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                  Explication didactique
                                </span>
                                <textarea
                                  required
                                  rows={2}
                                  placeholder={String.raw`Exemple : $\det(A)=1\times4-2\times3=-2$`}
                                  value={newQuestionExplanation}
                                  onChange={(e) => setNewQuestionExplanation(e.target.value)}
                                  className={`${inputFocus} font-mono leading-relaxed text-xs`}
                                />
                              </label>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setIsCreatingQcm(false);
                                  handleCancelEditQuestion?.();
                                }}
                                className="rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
                              >
                                Annuler
                              </button>
                              <button
                                type="submit"
                                className={`rounded-xl px-5 py-2.5 text-xs font-black shadow-md transition-all active:scale-95 ${getStepTheme(4).button}`}
                              >
                                {editingQuestionId
                                  ? "Enregistrer les modifications du QCM"
                                  : "Enregistrer ce QCM dans le Quiz"}
                              </button>
                            </div>
                          </form>
                        </div>
                      )}

                      {/* LEVEL 2: QCM LIST INSIDE QUIZ */}
                      <div className="space-y-3 pt-1">
                        {questions.length === 0 ? (
                          <p className="text-xs font-medium text-slate-400 italic text-center py-4 border border-dashed border-slate-800 rounded-xl">
                            Aucune question QCM dans ce quiz pour le moment. Cliquez sur "Ajouter une question QCM" ci-dessus.
                          </p>
                        ) : (
                          questions.map((q: any, qIdx: number) => {
                            const isEditingThisQcm = editingQuestionId === q.id;

                            return (
                              <div
                                key={q.id}
                                className={`rounded-xl border transition-all ${
                                  isEditingThisQcm
                                    ? "border-teal-500/60 bg-teal-950/40 shadow-sm"
                                    : "border-slate-800/90 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/80"
                                }`}
                              >
                                <div
                                  onClick={() => {
                                    if (isEditingThisQcm) {
                                      handleCancelEditQuestion?.();
                                    } else {
                                      setIsCreatingQcm(false);
                                      handleStartEditQuestion?.(q);
                                    }
                                  }}
                                  className="cursor-pointer p-3.5 flex items-center justify-between gap-3 select-none"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <span className="shrink-0 font-mono text-[10px] font-black uppercase tracking-wider text-teal-400 bg-teal-950/80 border border-teal-500/30 px-2 py-0.5 rounded">
                                      QCM {qIdx + 1}
                                    </span>
                                    <span className="truncate text-xs font-semibold text-slate-200">
                                      {q.question ? q.question.replace(/\$+/g, "") : "Sans énoncé"}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-[10px] font-medium text-slate-400">
                                      {Array.isArray(q.options) ? q.options.length : 0} choix
                                    </span>
                                    {handleStartEditQuestion && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setIsCreatingQcm(false);
                                          handleStartEditQuestion(q);
                                        }}
                                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-teal-300 border border-slate-700/40"
                                        title="Modifier ce QCM"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    {handleDeleteQuestion && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteQuestion(q.id);
                                        }}
                                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-950/60 hover:text-red-400 border border-slate-700/40"
                                        title="Supprimer ce QCM"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    <span className="p-1 text-slate-400">
                                      {isEditingThisQcm ? (
                                        <ChevronDown className="w-4 h-4 text-teal-300" />
                                      ) : (
                                        <ChevronRight className="w-4 h-4 text-slate-400" />
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })
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
  );
}
