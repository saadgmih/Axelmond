import { useState, useMemo } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Edit3,
  ExternalLink,
  HelpCircle,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import LatexText from "../../../components/LazyLatexText";
import { curriculumUi, getStepTheme } from "../curriculum-theme";
import type { TeacherCurriculumViewProps } from "../curriculum-types";

export default function CurriculumQuizStep(props: TeacherCurriculumViewProps) {
  const {
    teacherQuizzes,
    selectedQuizDetail,
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
    handleCreateQuiz,
    handleAddQuestion,
    handleDeleteQuestion,
    loadSelectedQuizDetail,
    quizCourseId,
    managedCourse,
  } = props;

  const [isCreatingQcm, setIsCreatingQcm] = useState(false);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const stepTheme = getStepTheme(4);
  const inputFocus = `${curriculumUi.input} ${stepTheme.focus}`;

  // Parse comma-separated list of selected correct options
  const selectedCorrectOptions = useMemo(() => {
    return newQuestionAnswer
      ? newQuestionAnswer
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean)
      : [];
  }, [newQuestionAnswer]);

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

  const handleOpenQuiz = (quizId: string) => {
    if (selectedQuizId === quizId) {
      setSelectedQuizId("");
      setIsCreatingQcm(false);
      handleCancelEditQuestion?.();
    } else {
      setSelectedQuizId(quizId);
      setIsCreatingQcm(false);
      handleCancelEditQuestion?.();
      loadSelectedQuizDetail?.(quizId);
    }
  };

  const activeCourseId = quizCourseId || managedCourse?.id || 19;

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
              Quiz &rarr; Questions QCM &rarr; Choix de réponses &rarr; Correction automatique.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <a
              href={`/student/course?courseId=${activeCourseId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-950/60 px-3.5 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-900/60 hover:text-white transition-all shadow-sm"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Aperçu étudiant
            </a>
            <button
              type="button"
              onClick={() => handleCreateQuiz()}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black shadow-md transition-all active:scale-95 ${stepTheme.button}`}
            >
              <Plus className="h-4 w-4" />
              Ajouter un Quiz (Quiz {teacherQuizzes.length + 1})
            </button>
          </div>
        </div>

        {(quizManagerMsg || quizManagerError) && (
          <div
            className={`p-3.5 border text-xs font-semibold rounded-xl animate-in fade-in duration-200 flex items-center justify-between gap-3 ${
              quizManagerError ? curriculumUi.alertError : curriculumUi.alertSuccess
            }`}
          >
            <span>{quizManagerError || quizManagerMsg}</span>
          </div>
        )}

        {/* Level 1: List of Quizzes */}
        <div className="space-y-4 pt-2">
          {teacherQuizzes.length === 0 ? (
            <div className={`${curriculumUi.empty} p-8 text-center space-y-3`}>
              <HelpCircle className="h-10 w-10 text-slate-500 mx-auto" />
              <p className="text-xs text-slate-400 font-semibold">Aucun quiz n'a encore été créé dans ce module.</p>
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
            <div className="rounded-2xl border border-slate-800/90 bg-slate-950/60 overflow-hidden divide-y divide-slate-800/80 shadow-md">
              {teacherQuizzes.map((quiz, quizIndex) => {
                const isQuizOpen = selectedQuizId === quiz.id;
                const questionCount =
                  quiz.questionCount ??
                  quiz.questions?.length ??
                  (isQuizOpen ? selectedQuizDetail?.questions?.length || 0 : 0);
                const questions = isQuizOpen ? selectedQuizDetail?.questions || [] : [];

                return (
                  <div key={quiz.id} className="transition-all">
                    {/* LEVEL 1: QUIZ HEADER */}
                    <div
                      onClick={() => handleOpenQuiz(quiz.id)}
                      className={`cursor-pointer p-4 flex items-center justify-between gap-4 select-none transition-colors ${
                        isQuizOpen ? "bg-slate-900/95" : "bg-slate-950/70 hover:bg-slate-900/80"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="p-1.5 rounded-lg border border-teal-500/30 bg-teal-950/60 text-teal-300 shrink-0">
                          {isQuizOpen ? (
                            <ChevronDown className="w-4 h-4 text-teal-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          )}
                        </span>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <h4 className="text-sm font-black text-white truncate">
                            {quiz.title || `Quiz ${quizIndex + 1}`}
                          </h4>
                          <span
                            className={`rounded border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider shrink-0 ${getStepTheme(4).chip}`}
                          >
                            {questionCount} QCM{questionCount !== 1 ? "s" : ""}
                          </span>
                          {quiz.published ? (
                            <span className="rounded border border-emerald-500/40 bg-emerald-950/60 px-2 py-0.5 text-[9px] font-bold text-emerald-400 shrink-0">
                              Publié
                            </span>
                          ) : (
                            <span className="rounded border border-amber-500/40 bg-amber-950/60 px-2 py-0.5 text-[9px] font-bold text-amber-400 shrink-0">
                              Brouillon
                            </span>
                          )}
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
                      <div className="p-5 border-t border-slate-800/80 bg-slate-950/40 space-y-4">
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
                            className="inline-flex items-center gap-1.5 rounded-xl border border-teal-500/40 bg-teal-950/70 px-3.5 py-2 text-xs font-bold text-teal-300 hover:bg-teal-900/80 hover:text-white transition-all shadow-sm active:scale-95"
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
                                {editingQuestionId ? "Modifier la question QCM" : "Nouvelle question QCM"}
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
                              onSubmit={async (e) => {
                                e.preventDefault();
                                const ok = await handleAddQuestion(e);
                                if (ok) {
                                  setIsCreatingQcm(false);
                                }
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

                              {newQuestionText.trim() &&
                                (newQuestionText.includes("$") || newQuestionText.includes("\\")) && (
                                  <div className="rounded-xl border border-slate-800 bg-[#031512] p-3 text-xs font-semibold text-slate-200">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-teal-400 block mb-1">
                                      Aperçu KaTeX de la question :
                                    </span>
                                    <LatexText value={newQuestionText} />
                                  </div>
                                )}

                              {/* LEVEL 3: CHOICES MANAGEMENT */}
                              <div className="space-y-4 border-t border-slate-800/80 pt-4">
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <span className="text-[11px] font-black uppercase tracking-wider text-teal-300 block">
                                      Choix de réponses ({newQuestionOptions.length})
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-medium">
                                      Minimum 2 choix requis. Cochez directement la ou les bonnes réponses ci-dessous.
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setNewQuestionOptions([
                                        ...newQuestionOptions,
                                        `Choix ${newQuestionOptions.length + 1}`,
                                      ]);
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-teal-500/40 bg-teal-950/60 px-3 py-1.5 text-xs font-bold text-teal-300 hover:bg-teal-900/80 hover:text-white transition-all shrink-0"
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                    Ajouter un choix
                                  </button>
                                </div>

                                {/* CHOICE INPUT STRUCTURED LIST */}
                                <div className="grid grid-cols-1 gap-3">
                                  {newQuestionOptions.map((opt, idx) => {
                                    const isCorrect =
                                      selectedCorrectOptions.includes(opt.trim()) && opt.trim().length > 0;
                                    const canDelete = newQuestionOptions.length > 2;

                                    return (
                                      <div
                                        key={idx}
                                        className={`p-3.5 space-y-3 rounded-xl border transition-all ${
                                          isCorrect
                                            ? "border-emerald-500/60 bg-emerald-950/20 shadow-sm ring-1 ring-emerald-500/30"
                                            : "border-slate-800 bg-[#031512] hover:border-slate-700/80"
                                        }`}
                                      >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                          <div className="flex items-center gap-2">
                                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-teal-500/40 bg-teal-950/80 px-2.5 py-1 text-[10px] font-black uppercase text-teal-300 font-mono">
                                              Choix {idx + 1}
                                            </span>

                                            {/* DIRECT 1-CLICK CORRECT ANSWER TOGGLE BUTTON */}
                                            <button
                                              type="button"
                                              onClick={() => toggleCorrectOption(opt)}
                                              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-black transition-all cursor-pointer ${
                                                isCorrect
                                                  ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 ring-1 ring-emerald-300"
                                                  : "border border-slate-700 bg-slate-900/90 text-slate-400 hover:text-emerald-300 hover:border-emerald-500/40"
                                              }`}
                                              title="Cliquer pour définir comme bonne réponse"
                                            >
                                              <CheckCircle2
                                                className={`w-3.5 h-3.5 ${
                                                  isCorrect ? "text-slate-950" : "text-slate-500"
                                                }`}
                                              />
                                              {isCorrect ? "Bonne réponse ✓" : "Définir comme bonne réponse"}
                                            </button>
                                          </div>

                                          {/* Delete choice button */}
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
                                            title={
                                              canDelete ? "Supprimer ce choix" : "Impossible : 2 choix minimum requis"
                                            }
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>

                                        <textarea
                                          required
                                          rows={2}
                                          placeholder={`Contenu du Choix ${idx + 1}`}
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
                                          className={`w-full rounded-xl border border-slate-700/80 bg-slate-950/90 px-3 py-2 font-mono text-xs font-semibold text-slate-100 transition-all focus:bg-slate-950 focus:outline-none focus:ring-2 ${stepTheme.focus}`}
                                        />

                                        {opt.trim() && (opt.includes("$") || opt.includes("\\")) && (
                                          <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-1.5 text-[11px] font-semibold text-slate-200">
                                            <LatexText value={opt} compact />
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Active correct answers summary */}
                                <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-slate-800 bg-[#031512]">
                                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0">
                                    Bonne(s) réponse(s) active(s) :
                                  </span>
                                  {selectedCorrectOptions.length === 0 ? (
                                    <span className="text-xs text-amber-400 font-semibold italic flex items-center gap-1">
                                      <AlertCircle className="w-3.5 h-3.5" />
                                      Aucune bonne réponse définie. Cliquez sur « Définir comme bonne réponse » sur l'un
                                      des choix ci-dessus.
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

                                {/* Explication didactique — ALWAYS VISIBLE */}
                                <div className="space-y-2 border-t border-slate-800/80 pt-4">
                                  <label className="block space-y-1.5">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[11px] font-black uppercase tracking-wider text-teal-300">
                                        Explication didactique académique
                                      </span>
                                      <span className="text-[10px] text-slate-400 font-medium">
                                        Affichée aux étudiants après validation de leur tentative
                                      </span>
                                    </div>
                                    <textarea
                                      required
                                      rows={3}
                                      placeholder={String.raw`Exemple : La solution découle directement de la formule $\det(A)=ad-bc$ car...`}
                                      value={newQuestionExplanation}
                                      onChange={(e) => setNewQuestionExplanation(e.target.value)}
                                      className={`${inputFocus} font-mono leading-relaxed text-xs`}
                                    />
                                  </label>

                                  {newQuestionExplanation.trim() &&
                                    (newQuestionExplanation.includes("$") ||
                                      newQuestionExplanation.includes("\\")) && (
                                      <div className="rounded-xl border border-slate-800 bg-[#031512] p-3 text-xs font-semibold text-slate-200">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-teal-400 block mb-1">
                                          Aperçu KaTeX de l'explication :
                                        </span>
                                        <LatexText value={newQuestionExplanation} />
                                      </div>
                                    )}
                                </div>
                              </div>

                              {quizManagerError && (
                                <div className="p-3 border border-red-500/40 bg-red-950/60 text-xs font-semibold text-red-300 rounded-xl flex items-center gap-2">
                                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                                  <span>{quizManagerError}</span>
                                </div>
                              )}

                              <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsCreatingQcm(false);
                                    handleCancelEditQuestion?.();
                                  }}
                                  className="rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-all cursor-pointer"
                                >
                                  Annuler
                                </button>
                                <button
                                  type="submit"
                                  className={`rounded-xl px-5 py-2.5 text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer ${getStepTheme(4).button}`}
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
                        {questions.length === 0 ? (
                          <div className="rounded-xl border border-slate-800/80 bg-[#031512]/60 p-6 text-center space-y-2">
                            <p className="text-xs text-slate-400 font-semibold">
                              Ce quiz ne contient encore aucune question QCM.
                            </p>
                            <p className="text-[11px] text-slate-500">
                              Cliquez sur « Ajouter une question QCM » pour créer votre première question.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3 pt-1">
                            {questions.map((q: any, qIdx: number) => {
                              const isEditingThisQcm = editingQuestionId === q.id;
                              const isExpanded = expandedQuestionId === q.id;
                              const answerList = String(q.answer || "")
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean);

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
                                    onClick={() => setExpandedQuestionId(isExpanded ? null : q.id)}
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
                                        {isExpanded ? (
                                          <ChevronDown className="w-4 h-4 text-teal-300" />
                                        ) : (
                                          <ChevronRight className="w-4 h-4 text-slate-400" />
                                        )}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Expanded question detail */}
                                  {isExpanded && (
                                    <div className="p-4 border-t border-slate-800/80 bg-[#031512] space-y-3 animate-in fade-in duration-200">
                                      <div className="space-y-1">
                                        <span className="text-[10px] font-black uppercase text-slate-400">
                                          Énoncé complet :
                                        </span>
                                        <div className="text-xs text-white">
                                          <LatexText value={q.question} />
                                        </div>
                                      </div>

                                      <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
                                        <span className="text-[10px] font-black uppercase text-slate-400">
                                          Options de réponse :
                                        </span>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                          {Array.isArray(q.options) &&
                                            q.options.map((opt: string, optI: number) => {
                                              const isThisCorrect =
                                                answerList.includes(opt.trim()) || opt.trim() === q.answer?.trim();
                                              return (
                                                <div
                                                  key={optI}
                                                  className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                                                    isThisCorrect
                                                      ? "border-emerald-500/50 bg-emerald-950/50 text-emerald-200 font-bold"
                                                      : "border-slate-800 bg-slate-950/60 text-slate-300"
                                                  }`}
                                                >
                                                  <div className="flex items-center gap-2 min-w-0">
                                                    <span className="font-mono text-[10px] opacity-70">
                                                      {String.fromCharCode(65 + optI)}.
                                                    </span>
                                                    <span className="truncate">
                                                      <LatexText value={opt} compact />
                                                    </span>
                                                  </div>
                                                  {isThisCorrect && (
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                                  )}
                                                </div>
                                              );
                                            })}
                                        </div>
                                      </div>

                                      {q.explanation && (
                                        <div className="space-y-1 pt-2 border-t border-slate-800/60">
                                          <span className="text-[10px] font-black uppercase text-slate-400">
                                            Explication :
                                          </span>
                                          <div className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                                            <LatexText value={q.explanation} />
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
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
