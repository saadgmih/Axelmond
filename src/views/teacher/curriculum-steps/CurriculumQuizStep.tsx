import { HelpCircle, X, ChevronRight } from "lucide-react";

import { curriculumUi, getStepTheme } from "../curriculum-theme";
import type { TeacherCurriculumViewProps } from "../curriculum-types";

export default function CurriculumQuizStep(props: TeacherCurriculumViewProps) {
  const {
    domains: _domains,
    activeCurriculumStep,
    setActiveCurriculumStep: _setActiveCurriculumStep,
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
    quizChapterId,
    setQuizChapterId,
    quizPartId,
    setQuizPartId,
    quizSubpartId,
    setQuizSubpartId,
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
    editingCourse: _editingCourse,
    setEditingCourse: _setEditingCourse,
    editCourseForm: _editCourseForm,
    setEditCourseForm: _setEditCourseForm,
    teacherQuizzes,
    selectedQuizDetail,
    quizCourseId,
    newQuizTitle,
    setNewQuizTitle,
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
    allDisciplines: _allDisciplines,
    managedCourses: _managedCourses,
    managedCourse: _managedCourse,
    managedSections,
    chapterSections: _chapterSections,
    uploadPartOptions: _uploadPartOptions,
    selectedManagedContents: _selectedManagedContents,
    handleSetUploadSectionId: _handleSetUploadSectionId,
    showCurriculumSuccess: _showCurriculumSuccess,
    showCurriculumError: _showCurriculumError,
    handleCreateCourse: _handleCreateCourse,
    handleCreateSection: _handleCreateSection,
    handleUploadLessonAsset: _handleUploadLessonAsset,
    handleSelectManagedCourse: _handleSelectManagedCourse,
    loadTeacherQuizzes,
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
    handleAddChildSection: _handleAddChildSection,
    handleToggleContentPublished: _handleToggleContentPublished,
    handleDeleteLessonContent: _handleDeleteLessonContent,
  } = props;
  const stepTheme = getStepTheme(activeCurriculumStep);
  const inputFocus = `${curriculumUi.input} ${stepTheme.focus}`;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="lg:col-span-5 space-y-6">
        <div className={`${curriculumUi.panel} ${getStepTheme(5).panel} space-y-5`}>
          <div className={`flex items-center justify-between ${curriculumUi.divider} pb-2`}>
            <h3 className="text-sm font-black uppercase tracking-wider text-white">
              {selectedQuizId ? "Quiz sélectionné" : "Créer un quiz"}
            </h3>
            {selectedQuizId && (
              <button
                type="button"
                onClick={() => {
                  setSelectedQuizId("");
                  setNewQuizTitle("");
                  setQuizChapterId("");
                  setQuizPartId("");
                  setQuizSubpartId("");
                }}
                className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-[10px] font-black uppercase transition-colors ${getStepTheme(5).chip} hover:bg-violet-950/80`}
              >
                Nouveau quiz
              </button>
            )}
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

          <form onSubmit={handleCreateQuiz} className="space-y-4">
            {/* Target Section Selector */}
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Section de rattachement
              </span>
              <select
                value={quizSubpartId || quizPartId || quizChapterId || ""}
                onChange={(e) => {
                  const value = e.target.value;
                  if (!value) {
                    setQuizChapterId("");
                    setQuizPartId("");
                    setQuizSubpartId("");
                  } else {
                    const section = managedSections.find((s) => s.id === value);
                    if (section) {
                      if (!section.parentId) {
                        setQuizChapterId(section.id);
                        setQuizPartId("");
                        setQuizSubpartId("");
                      } else {
                        const parent = managedSections.find((s) => s.id === section.parentId);
                        if (parent && !parent.parentId) {
                          setQuizChapterId(parent.id);
                          setQuizPartId(section.id);
                          setQuizSubpartId("");
                        } else if (parent && parent.parentId) {
                          const grandparent = managedSections.find((s) => s.id === parent.parentId);
                          if (grandparent) {
                            setQuizChapterId(grandparent.id);
                            setQuizPartId(parent.id);
                            setQuizSubpartId(section.id);
                          }
                        }
                      }
                    }
                  }
                }}
                className={`${inputFocus} text-slate-700`}
              >
                <option value="">-- Directement dans le module (racine) --</option>
                {managedSections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {`— ${"— ".repeat(section.depth ?? 0)}${section.title}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Titre du Quiz
              </span>
              <input
                required
                placeholder="ex: QCM 1 - Bases algorithmiques"
                value={newQuizTitle}
                onChange={(e) => setNewQuizTitle(e.target.value)}
                className={inputFocus}
              />
            </div>

            <button
              type="submit"
              className={`w-full rounded-xl py-3 text-xs font-black shadow-sm transition-colors active:scale-[0.98] ${stepTheme.button}`}
            >
              Créer et lier ce Quiz
            </button>
          </form>
        </div>

        {/* Quiz List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className={curriculumUi.sectionTitle}>Quiz du module ({teacherQuizzes.length})</h3>
            <button
              type="button"
              onClick={() => loadTeacherQuizzes(quizCourseId)}
              className="text-[10px] font-bold text-emerald-700 hover:underline"
            >
              Actualiser la liste
            </button>
          </div>

          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
            {teacherQuizzes.length === 0 ? (
              <div className={`${curriculumUi.empty} p-6`}>
                <p className="text-xs text-slate-400 font-semibold">
                  Aucun quiz créé. Utilisez le formulaire ci-dessus.
                </p>
              </div>
            ) : (
              teacherQuizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  onClick={() => setSelectedQuizId(quiz.id)}
                  className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                    selectedQuizId === quiz.id
                      ? getStepTheme(5).listActive
                      : `${curriculumUi.card} ${curriculumUi.cardHover}`
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span
                        className={`rounded border px-1.5 py-0.5 text-[8px] font-black uppercase ${getStepTheme(5).chip}`}
                      >
                        {quiz.questionCount ?? quiz.questions?.length ?? 0} question(s)
                      </span>
                      <h4 className="text-xs font-black text-white mt-2">{quiz.title}</h4>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 mt-0.5" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Question Builder & Current Questions */}
      <div className="lg:col-span-7 space-y-6">
        {selectedQuizId ? (
          <>
            {/* Question Form */}
            <div className={`${curriculumUi.panel} ${getStepTheme(5).panel} space-y-5`}>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white">Ajouter une question</h3>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  Quiz :{" "}
                  <span className="font-bold text-violet-400">
                    {teacherQuizzes.find((q) => q.id === selectedQuizId)?.title}
                  </span>
                </p>
              </div>

              <form onSubmit={handleAddQuestion} className={`space-y-4 pt-3 ${curriculumUi.divider}`}>
                <label className="block space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Énoncé de la question
                  </span>
                  <textarea
                    required
                    rows={2}
                    placeholder="Saisissez la question..."
                    value={newQuestionText}
                    onChange={(e) => setNewQuestionText(e.target.value)}
                    className={inputFocus}
                  />
                </label>

                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block font-semibold">
                    Options de réponses
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {newQuestionOptions.map((opt, idx) => (
                      <div key={idx} className="relative flex items-center">
                        <span className="absolute left-2 flex h-6 w-6 select-none items-center justify-center rounded-lg border border-violet-500/30 bg-violet-950/60 text-[10px] font-black text-violet-300">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <input
                          required
                          placeholder={`Option ${idx + 1}`}
                          value={opt}
                          onChange={(e) => {
                            const next = [...newQuestionOptions];
                            next[idx] = e.target.value;
                            setNewQuestionOptions(next);
                          }}
                          className={`w-full rounded-xl border border-slate-700 bg-[#090d16] pl-10 pr-3 py-2.5 text-xs font-semibold text-slate-100 transition-all focus:bg-slate-950 focus:outline-none focus:ring-2 ${stepTheme.focus}`}
                        />
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
                        .filter((o) => o.trim())
                        .map((o, idx) => (
                          <option key={idx} value={o}>{`Option ${String.fromCharCode(65 + idx)}: ${o}`}</option>
                        ))}
                    </select>
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Explication didactique
                    </span>
                    <input
                      required
                      placeholder="Explication affichée après réponse..."
                      value={newQuestionExplanation}
                      onChange={(e) => setNewQuestionExplanation(e.target.value)}
                      className={inputFocus}
                    />
                  </label>
                </div>

                <button
                  type="submit"
                  className={`w-full rounded-xl py-3 text-xs font-black shadow-sm transition-colors active:scale-[0.98] ${getStepTheme(5).button}`}
                >
                  Ajouter cette question au Quiz
                </button>
              </form>
            </div>

            {/* Current Question List */}
            <div className="space-y-4">
              <h3 className={curriculumUi.sectionTitle}>
                Questions du Quiz ({(selectedQuizDetail?.questions || []).length})
              </h3>

              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {(selectedQuizDetail?.questions || []).map((q: any, idx: number) => (
                  <div key={q.id} className={`${curriculumUi.card} space-y-3 relative`}>
                    <div className="flex items-start justify-between gap-4">
                      <p className="flex-1 text-xs font-black text-slate-100">
                        {idx + 1}. {q.question}
                      </p>
                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="shrink-0 rounded p-1 text-slate-500 transition-colors hover:bg-red-950/50 hover:text-red-400"
                        title="Supprimer la question"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-400">
                      {(q.options || []).map((opt: string, optIdx: number) => {
                        const isCorrect = opt === q.answer;
                        return (
                          <div
                            key={optIdx}
                            className={`p-2 rounded-xl flex items-center gap-1.5 border ${
                              isCorrect
                                ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-300"
                                : "border-slate-700 bg-slate-900/60 text-slate-500"
                            }`}
                          >
                            <span
                              className={`w-4 h-4 rounded text-[9px] font-black flex items-center justify-center shrink-0 ${
                                isCorrect ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400"
                              }`}
                            >
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span className="truncate">{opt}</span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-[10px] font-medium text-slate-400">
                      <span className="font-black text-slate-300 uppercase text-[9px] block mb-1">Explication :</span>
                      {q.explanation}
                    </div>
                  </div>
                ))}

                {(selectedQuizDetail?.questions?.length ?? 0) === 0 && (
                  <div className={`${curriculumUi.empty} p-6`}>
                    <p className="text-xs text-slate-400 font-semibold">
                      Aucune question dans ce quiz. Ajoutez-en avec le formulaire.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div
            className={`${curriculumUi.panel} flex h-full flex-col items-center justify-center gap-2 py-16 text-center`}
          >
            <HelpCircle className="h-10 w-10 text-violet-500/50" />
            <h4 className="text-sm font-black text-slate-200">Aucun quiz sélectionné</h4>
            <p className="text-xs text-slate-400 font-medium max-w-xs leading-relaxed">
              Sélectionnez un quiz existant dans la colonne de gauche ou créez-en un nouveau pour commencer à y insérer
              des questions.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
