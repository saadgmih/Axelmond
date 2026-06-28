import { BookOpen, Check, Sparkles } from "lucide-react";
import { formatCredits } from "../../../utils/morocco-locale";

import { curriculumUi, getCurriculumSteps, getModuleStep, getStepTheme } from "../curriculum-theme";
import type { TeacherCurriculumViewProps } from "../curriculum-types";

type Props = Pick<
  TeacherCurriculumViewProps,
  | "activeCurriculumStep"
  | "canManageAcademicTaxonomy"
  | "setActiveCurriculumStep"
  | "curriculumSuccessMsg"
  | "curriculumErrorMsg"
  | "managedCourse"
  | "managedCourses"
  | "newSectionCourseId"
  | "showCurriculumError"
  | "handleSelectManagedCourse"
  | "loadTeacherQuizzes"
>;

export default function CurriculumStepper(props: Props) {
  const {
    activeCurriculumStep,
    canManageAcademicTaxonomy,
    setActiveCurriculumStep,
    curriculumSuccessMsg,
    curriculumErrorMsg,
    managedCourse,
    managedCourses,
    newSectionCourseId,
    showCurriculumError,
    handleSelectManagedCourse,
    loadTeacherQuizzes,
  } = props;
  const curriculumSteps = getCurriculumSteps(canManageAcademicTaxonomy);
  const moduleStep = getModuleStep(canManageAcademicTaxonomy);
  const stepGridClass = canManageAcademicTaxonomy ? "xl:grid-cols-7" : "xl:grid-cols-5";
  const heroDescription = canManageAcademicTaxonomy
    ? "Parcourez les 7 étapes pour construire votre programme : domaines, sous-domaines, modules, chapitres, arborescence, médias et évaluations. Chaque étape a sa couleur pour repérer rapidement où vous travaillez."
    : "Parcourez les 5 étapes pour construire votre module : catalogue, chapitres, arborescence, médias et évaluations. Chaque étape a sa couleur pour repérer rapidement où vous travaillez.";

  return (
    <>
      {/* Hero + stepper */}
      <div className={curriculumUi.hero}>
        <div className={curriculumUi.heroGlow} />
        <div className="relative space-y-6">
          <div className="space-y-3 max-w-2xl">
            <span className={curriculumUi.studioBadge}>
              <Sparkles className="h-3.5 w-3.5" />
              Studio pédagogique
            </span>
            <h2 className={curriculumUi.heroTitle}>Gestion du programme pédagogique</h2>
            <p className={curriculumUi.heroDesc}>{heroDescription}</p>
          </div>

          {(curriculumSuccessMsg || curriculumErrorMsg) && (
            <div
              className={`animate-in fade-in duration-200 ${
                curriculumErrorMsg ? curriculumUi.alertError : curriculumUi.alertSuccess
              }`}
            >
              {curriculumErrorMsg || curriculumSuccessMsg}
            </div>
          )}

          <div className={`${curriculumUi.divider} pt-5 space-y-4`}>
            <p className={curriculumUi.progressLabel}>
              Progression · étape {activeCurriculumStep} / {curriculumSteps.length}
            </p>
            <div className={curriculumUi.progressTrack}>
              <div
                className={curriculumUi.progressFill}
                style={{ width: `${(activeCurriculumStep / curriculumSteps.length) * 100}%` }}
              />
            </div>
            <div className={`grid grid-cols-1 gap-2 sm:grid-cols-2 ${stepGridClass}`}>
              {curriculumSteps.map((s) => {
                const Icon = s.icon;
                const isActive = activeCurriculumStep === s.step;
                const isCompleted = activeCurriculumStep > s.step;
                return (
                  <button
                    key={s.step}
                    type="button"
                    onClick={() => {
                      if (managedCourses.length > 0 || s.step <= moduleStep) {
                        setActiveCurriculumStep(s.step);
                      } else {
                        showCurriculumError("Veuillez d'abord créer un module à l'étape Modules.");
                      }
                    }}
                    className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition-all duration-200 ${
                      isActive ? s.active : isCompleted ? s.completed : curriculumUi.stepIdle
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                        isActive ? s.badgeActive : isCompleted ? s.badgeCompleted : "bg-slate-800 text-slate-500"
                      }`}
                    >
                      {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <p
                        className={`text-[10px] font-black uppercase tracking-wider ${isActive ? "text-slate-300" : "text-slate-500"}`}
                      >
                        Étape {s.step}
                      </p>
                      <p className={`truncate text-sm font-black ${isActive ? "text-white" : "text-slate-200"}`}>
                        {s.label}
                      </p>
                      <p className="truncate text-[10px] text-slate-500">{s.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {managedCourses.length > 0 && activeCurriculumStep > moduleStep && (
        <div className={`${curriculumUi.contextBanner} animate-in fade-in duration-200`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${getStepTheme(1).chip}`}
              >
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Module en cours d&apos;édition
                </p>
                <h3 className="mt-1 text-base font-black leading-tight text-white">
                  {managedCourse ? managedCourse.title : "Aucun module sélectionné"}
                </h3>
                {managedCourse && (
                  <p className="mt-1 text-[11px] text-slate-400">
                    {managedCourse.discipline?.name || managedCourse.category} · {formatCredits(managedCourse.credits)}{" "}
                    · {managedCourse.duration}
                    {managedCourse.published === false ? " · Brouillon" : " · Publié"}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={newSectionCourseId}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  handleSelectManagedCourse(val);
                  loadTeacherQuizzes(val);
                }}
                className="min-w-[180px] rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {managedCourses.map((c) => (
                  <option key={c.id} value={c.id} className="text-slate-900">
                    {c.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setActiveCurriculumStep(moduleStep)}
                className={`rounded-xl px-4 py-2.5 text-xs font-black transition-colors ${getStepTheme(1).button}`}
              >
                Changer de module
              </button>
            </div>
          </div>
        </div>
      )}

      {managedCourses.length === 0 && activeCurriculumStep > moduleStep && (
        <div className={`${curriculumUi.empty} max-w-xl mx-auto space-y-4 animate-in fade-in duration-200`}>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-500/30 bg-violet-950/50 text-violet-400">
            <Sparkles className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-black text-white">Commencez par un module</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Créez votre premier module à l&apos;étape <strong className="text-indigo-400">Modules</strong> avant
            d&apos;ajouter chapitres, médias ou quiz.
          </p>
          <button
            type="button"
            onClick={() => setActiveCurriculumStep(moduleStep)}
            className={`mx-auto inline-flex rounded-xl px-5 py-2.5 text-xs font-black transition-colors ${getStepTheme(1).button}`}
          >
            Aller à l&apos;étape Modules
          </button>
        </div>
      )}
    </>
  );
}
