import { memo, useMemo, useRef } from "react";

import {
  Activity,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Cpu,
  GraduationCap,
  HelpCircle,
  Layers,
  PlayCircle,
  Radio,
  ShoppingCart,
  Target,
  TrendingUp,
  Video,
} from "lucide-react";

import type { ReactNode } from "react";

import type { AppUser } from "../../components/AuthScreen";

import type { Course, CourseModule } from "../../types";
import { formatCredits } from "../../utils/morocco-locale";
import { prefetchCourseContent } from "../../utils/prefetch";
import { useTvNavigation } from "../../hooks/useTvNavigation";

type NavigateTo = (view: string, targetCourse?: Course | null) => void;

type CourseIconRenderer = (iconName: string, colorClass?: string) => ReactNode;

interface StudentDashboardViewProps {
  currentUser: AppUser | null;

  navigateTo: NavigateTo;

  enrolledCourses: number[];

  courses: Course[];

  getCourseIcon: CourseIconRenderer;
  isLoginDataLoading?: boolean;
  isEnrolledCatalogSyncing?: boolean;
}

function parseQuizScore(score?: string): { correct: number; total: number } | null {
  if (!score) return null;

  const match = score.trim().match(/^(\d+)\s*\/\s*(\d+)$/);

  if (!match) return null;

  const correct = Number(match[1]);

  const total = Number(match[2]);

  if (!Number.isFinite(correct) || !Number.isFinite(total) || total <= 0) return null;

  return { correct, total };
}

function findContinueTarget(enrolledList: Course[]): {
  course: Course;

  nextModule: CourseModule | null;
} | null {
  if (enrolledList.length === 0) return null;

  const sorted = [...enrolledList].sort((a, b) => {
    if (a.progress >= 100 && b.progress < 100) return 1;

    if (b.progress >= 100 && a.progress < 100) return -1;

    return b.progress - a.progress;
  });

  const course = sorted.find((item) => item.progress < 100) || sorted[0];

  const nextModule = course.modules.find((module) => !module.completed) || null;

  return { course, nextModule };
}

function findLastActivity(enrolledList: Course[]): { courseTitle: string; moduleTitle: string } | null {
  let last: { courseTitle: string; moduleTitle: string } | null = null;

  for (const course of enrolledList) {
    for (const module of course.modules) {
      if (module.completed) {
        last = { courseTitle: course.title, moduleTitle: module.title };
      }
    }
  }

  return last;
}

const DashboardStatCard = memo(function DashboardStatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
  wide,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof BookOpen;
  accent: string;
  wide?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/5 bg-slate-900/70 p-4 space-y-2 ${
        wide ? "md:col-span-2 xl:col-span-2" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{label}</span>
        <Icon className={`w-4 h-4 shrink-0 ${accent}`} />
      </div>
      <p className="text-lg sm:text-xl font-black text-white truncate">{value}</p>
      <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">{hint}</p>
    </div>
  );
});

const DashboardCourseCard = memo(function DashboardCourseCard({
  course,
  getCourseIcon,
  navigateTo,
}: {
  course: Course;
  getCourseIcon: CourseIconRenderer;
  navigateTo: NavigateTo;
}) {
  const completedChapters = course.modules.filter((m) => m.completed).length;
  const totalChapters = course.modules.length;

  return (
    <div
      className="rounded-2xl border border-slate-800 bg-slate-900/60 shadow-sm hover:shadow-lg hover:border-slate-700 transition-all flex flex-col overflow-hidden"
      onMouseEnter={() => prefetchCourseContent(course.id)}
    >
      <div className="p-5 sm:p-6 flex-1 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className={`p-3 rounded-xl ${course.color}`}>
            {getCourseIcon(course.iconName, "w-6 h-6 text-slate-800")}
          </div>
          <span className="bg-slate-800 text-slate-300 text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full border border-slate-700">
            {course.level}
          </span>
        </div>

        <div className="space-y-1">
          <h3 className="font-extrabold text-base text-white leading-tight truncate">{course.title}</h3>
          <p className="text-xs text-slate-400 font-medium truncate">Par {course.instructor}</p>
        </div>

        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{course.description}</p>

        <div className="pt-2 space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 font-semibold">
              {completedChapters} / {totalChapters} chapitres
            </span>
            <span className="text-emerald-300 font-bold font-mono">{course.progress}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                course.progress === 100 ? "bg-emerald-500" : "bg-emerald-500"
              }`}
              style={{ width: `${course.progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="bg-slate-950/50 px-5 sm:px-6 py-4 border-t border-slate-800 flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-slate-500 uppercase">{formatCredits(course.credits)}</span>
        <button
          onClick={() => navigateTo("course", course)}
          className="text-xs font-bold text-emerald-300 hover:text-emerald-200 flex items-center gap-1 cursor-pointer min-h-[44px]"
        >
          Étudier le syllabus <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});

export default function StudentDashboardView({
  currentUser,

  navigateTo,

  enrolledCourses,

  courses,

  getCourseIcon,

  isLoginDataLoading,
  isEnrolledCatalogSyncing,
}: StudentDashboardViewProps) {
  const dashboardGridRef = useRef<HTMLDivElement>(null);
  useTvNavigation(dashboardGridRef, true);

  const enrolledList = useMemo(
    () => courses.filter((course) => enrolledCourses.includes(course.id)),

    [courses, enrolledCourses],
  );
  const showEnrollmentLoading = enrolledCourses.length > 0 && Boolean(isLoginDataLoading || isEnrolledCatalogSyncing);

  const progress = useMemo(() => {
    const completedChapters = enrolledList.reduce(
      (sum, course) => sum + course.modules.filter((module) => module.completed).length,

      0,
    );

    const totalChapters = enrolledList.reduce((sum, course) => sum + course.modules.length, 0);

    const globalProgress =
      enrolledList.length > 0
        ? Math.round(enrolledList.reduce((sum, course) => sum + course.progress, 0) / enrolledList.length)
        : 0;

    const ectsTarget = enrolledList.reduce((sum, course) => sum + course.credits, 0);

    const quizModules = enrolledList.flatMap((course) => course.modules.filter((module) => module.type === "quiz"));

    const passedQuizzes = quizModules.filter((module) => module.completed).length;

    const quizPercentages = quizModules

      .map((module) => parseQuizScore(module.score))

      .filter((value): value is { correct: number; total: number } => value !== null)

      .map((value) => Math.round((value.correct / value.total) * 100));

    const averageQuizScore =
      quizPercentages.length > 0
        ? Math.round(quizPercentages.reduce((sum, value) => sum + value, 0) / quizPercentages.length)
        : null;

    const continueTarget = findContinueTarget(enrolledList);

    const lastActivity = findLastActivity(enrolledList);

    const activeModules = enrolledList

      .filter((course) => course.progress > 0 && course.progress < 100)

      .sort((a, b) => b.progress - a.progress);

    return {
      completedChapters,

      totalChapters,

      globalProgress,

      ectsTarget,

      passedQuizzes,

      totalQuizzes: quizModules.length,

      averageQuizScore,

      continueTarget,

      lastActivity,

      activeModules,
    };
  }, [enrolledList]);

  const statCards = [
    {
      label: "Modules inscrits",

      value: String(enrolledList.length),

      hint: enrolledList.length === 1 ? "module actif" : "modules actifs",

      icon: BookOpen,

      accent: "text-emerald-300",
    },

    {
      label: "Progression globale",

      value: `${progress.globalProgress}%`,

      hint: "moyenne de vos parcours",

      icon: TrendingUp,

      accent: "text-teal-300",
    },

    {
      label: "Chapitres complétés",

      value: String(progress.completedChapters),

      hint: progress.totalChapters > 0 ? `sur ${progress.totalChapters} chapitres` : "aucun chapitre disponible",

      icon: CheckCircle2,

      accent: "text-emerald-300",
    },

    {
      label: "Quiz réussis",

      value: String(progress.passedQuizzes),

      hint: progress.totalQuizzes > 0 ? `sur ${progress.totalQuizzes} quiz` : "aucun quiz disponible",

      icon: HelpCircle,

      accent: "text-teal-300",
    },

    {
      label: "Score moyen quiz",

      value: progress.averageQuizScore !== null ? `${progress.averageQuizScore}%` : "—",

      hint:
        progress.averageQuizScore !== null ? "basé sur vos tentatives enregistrées" : "aucune tentative enregistrée",

      icon: Target,

      accent: "text-lime-300",
    },

    {
      label: "Crédits visés",

      value: String(progress.ectsTarget),

      hint: "crédits cumulés inscrits",

      icon: GraduationCap,

      accent: "text-emerald-300",
    },

    {
      label: "Dernière activité",

      value: progress.lastActivity ? progress.lastActivity.moduleTitle : "—",

      hint: progress.lastActivity ? progress.lastActivity.courseTitle : "commencez votre premier module",

      icon: Clock,

      accent: "text-slate-300",

      wide: true,
    },
  ];

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-200">
      <div className="bg-gradient-to-r from-emerald-900 via-indigo-800 to-slate-900 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-lg border border-emerald-950">
        <div className="absolute right-0 top-0 w-1/3 h-full opacity-10 pointer-events-none">
          <Cpu className="w-full h-full text-white" />
        </div>

        <div className="relative z-10 max-w-2xl space-y-3">
          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full inline-block">
            Espace Étudiant Actif
          </span>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight leading-tight">
            Bonjour, {currentUser ? currentUser.fullName.split(" ")[0] : "Étudiant"}.
          </h1>

          <p className="text-emerald-200 text-sm md:text-base leading-relaxed">
            Vous êtes inscrit en <strong>{currentUser ? currentUser.levelOrTitle : "Licence 3 d'Informatique"}</strong>{" "}
            de Performance Académique. Poursuivez vos modules interactifs, ou conversez avec votre tuteur IA.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              type="button"
              data-tv-focusable
              tabIndex={0}
              onClick={() => navigateTo("catalog")}
              className="kbd-nav-focus touch-target bg-white text-emerald-900 hover:bg-slate-100 px-5 py-2.5 min-h-[44px] rounded-xl font-bold text-xs transition-colors shadow-sm"
            >
              Parcourir le catalogue
            </button>

            <button
              type="button"
              data-tv-focusable
              tabIndex={0}
              onClick={() => navigateTo("profile")}
              className="kbd-nav-focus touch-target bg-emerald-600/50 hover:bg-emerald-600/70 text-white border border-emerald-500/30 px-5 py-2.5 min-h-[44px] rounded-xl font-bold text-xs transition-colors"
            >
              Consulter mes notes académiques
            </button>
          </div>
        </div>
      </div>

      <div ref={dashboardGridRef} data-tv-zone="student-dashboard" className="space-y-6 md:space-y-8">
        <section className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/40 p-5 sm:p-6 md:p-8 shadow-xl space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2 min-w-0">
              <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400 shrink-0" />
                Ma progression académique
              </h3>

              <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
                Vue d'ensemble basée sur vos modules inscrits, chapitres complétés et résultats de quiz enregistrés.
              </p>
            </div>

            {progress.continueTarget ? (
              <button
                onClick={() => {
                  const target = progress.continueTarget;
                  if (!target) return;
                  navigateTo("course", target.course);
                }}
                className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs px-5 py-3 min-h-[44px] transition-colors shadow-lg shadow-emerald-950/40"
              >
                <PlayCircle className="w-4 h-4 shrink-0" />

                <span className="text-left">
                  Continuer le cours
                  <span className="block text-[10px] font-semibold text-emerald-100/90 truncate max-w-[220px] sm:max-w-[280px]">
                    {progress.continueTarget.nextModule
                      ? progress.continueTarget.nextModule.title
                      : progress.continueTarget.course.title}
                  </span>
                </span>

                <ChevronRight className="w-4 h-4 shrink-0" />
              </button>
            ) : enrolledList.length === 0 ? (
              <button
                onClick={() => navigateTo("catalog")}
                className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 font-bold text-xs px-5 py-3 min-h-[44px] transition-colors"
              >
                Explorer le catalogue
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : null}
          </div>

          <div className="rounded-2xl border border-white/5 bg-slate-950/50 p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Progression globale</p>

                <p className="text-2xl sm:text-3xl font-black text-white mt-1">{progress.globalProgress}%</p>
              </div>

              <p className="text-xs text-slate-400">
                {progress.completedChapters} chapitre
                {progress.completedChapters !== 1 ? "s" : ""} complété
                {progress.completedChapters !== 1 ? "s" : ""}
                {progress.totalChapters > 0 ? ` sur ${progress.totalChapters}` : ""}
              </p>
            </div>

            <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  progress.globalProgress >= 100 ? "bg-emerald-500" : "bg-gradient-to-r from-emerald-500 to-sky-400"
                }`}
                style={{
                  width: `${Math.min(100, Math.max(0, progress.globalProgress))}%`,
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {statCards.map((card) => (
              <DashboardStatCard key={card.label} {...card} />
            ))}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-sm font-black text-white">Modules en cours</h4>

              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {progress.activeModules.length} actif
                {progress.activeModules.length !== 1 ? "s" : ""}
              </span>
            </div>

            {progress.activeModules.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 px-4 py-6 text-center">
                <p className="text-sm font-semibold text-slate-300">
                  {enrolledList.length === 0
                    ? "Aucun module inscrit pour le moment."
                    : enrolledList.every((course) => course.progress >= 100)
                      ? "Tous vos modules inscrits sont terminés."
                      : "Ouvrez un module pour démarrer votre progression."}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {progress.activeModules.map((course) => {
                  const completed = course.modules.filter((module) => module.completed).length;

                  const total = course.modules.length;

                  const nextModule = course.modules.find((module) => !module.completed);

                  return (
                    <div
                      key={course.id}
                      className="rounded-2xl border border-white/5 bg-slate-900/60 p-4 flex flex-col sm:flex-row sm:items-center gap-4"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className={`p-2.5 rounded-xl shrink-0 ${course.color}`}>
                          {getCourseIcon(course.iconName, "w-5 h-5 text-slate-800")}
                        </div>

                        <div className="min-w-0 space-y-1">
                          <p className="text-sm font-bold text-white truncate">{course.title}</p>

                          <p className="text-[11px] text-slate-400 truncate">
                            {nextModule ? `Prochain : ${nextModule.title}` : `${completed}/${total} chapitres`}
                          </p>

                          <div className="flex items-center gap-2 pt-1">
                            <div className="h-1.5 flex-1 max-w-[180px] rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-emerald-500"
                                style={{ width: `${course.progress}%` }}
                              />
                            </div>

                            <span className="text-[11px] font-bold text-emerald-300 font-mono">{course.progress}%</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        data-tv-focusable
                        tabIndex={0}
                        onClick={() => navigateTo("course", course)}
                        className="kbd-nav-focus touch-target self-start sm:self-center inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-200 text-xs font-bold px-4 py-2.5 min-h-[44px] transition-colors"
                        aria-label={`Continuer le module ${course.title}`}
                      >
                        Continuer
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {courses.filter((c) => enrolledCourses.includes(c.id) && c.isLiveNow).length > 0 && (
          <div className="bg-red-950/40 border border-red-900/50 rounded-2xl p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-start gap-4 min-w-0">
                <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-400 relative flex-shrink-0 border border-red-500/20">
                  <Radio className="w-6 h-6 animate-pulse" />

                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-950"></span>
                </div>

                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-red-300 uppercase tracking-wider bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20">
                    SÉMINAIRE INTERACTIF EN DIRECT
                  </span>

                  <h3 className="text-base font-bold text-white mt-1 truncate">
                    {courses.find((c) => c.isLiveNow)?.instructor || "Votre enseignant"} anime une session en direct !
                  </h3>

                  <p className="text-xs text-slate-400 mt-0.5">
                    {courses.find((c) => c.isLiveNow && enrolledCourses.includes(c.id))?.liveSubject
                      ? `Sujet : ${courses.find((c) => c.isLiveNow && enrolledCourses.includes(c.id))!.liveSubject}`
                      : "Rejoignez la salle de classe pour suivre la session en direct."}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  const activeCourse = courses.find((c) => c.isLiveNow && enrolledCourses.includes(c.id));

                  if (activeCourse) navigateTo("live", activeCourse);
                }}
                className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-5 py-3 min-h-[44px] rounded-xl transition-all shadow-md shadow-red-950/30 flex items-center gap-2"
              >
                <Video className="w-4 h-4" /> Rejoindre la salle de classe
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex justify-between items-center gap-3 flex-wrap">
            <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-400" />
              Mes Modules d'Étude Actifs ({enrolledList.length})
            </h2>

            <span className="text-xs font-semibold text-slate-500">Vos modules en accès</span>
          </div>

          {showEnrollmentLoading ? (
            <div className="rounded-2xl py-20 text-center border border-slate-800/60 bg-slate-900/40 shadow-sm flex flex-col items-center justify-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-900/40 text-emerald-400 rounded-full flex items-center justify-center mb-6 shadow-inner border border-emerald-500/20 relative">
                <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 border-t-indigo-500 animate-spin" />
                <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 animate-pulse text-emerald-500" />
              </div>
              <h3 className="text-lg font-black text-slate-100 mb-2 animate-pulse">Chargement de votre espace...</h3>
              <p className="text-sm text-slate-400 max-w-sm mx-auto">
                Préparation de vos modules académiques et synchronisation de votre progression.
              </p>
            </div>
          ) : enrolledList.length === 0 ? (
            <div className="rounded-2xl p-10 sm:p-12 text-center border border-slate-800 bg-slate-900/50 space-y-4 shadow-sm">
              <ShoppingCart className="w-12 h-12 text-slate-600 mx-auto" />

              <h3 className="text-lg font-bold text-slate-100 font-sans">Aucun module actif</h3>

              <p className="text-sm text-slate-400 max-w-sm mx-auto">
                Abonnez-vous aux modules de votre choix à prix abordable dans notre catalogue de formation.
              </p>

              <button
                onClick={() => navigateTo("catalog")}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-3 min-h-[44px] rounded-xl shadow-md cursor-pointer"
              >
                Découvrir le catalogue de Performance Académique
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {enrolledList.map((course) => (
                <DashboardCourseCard
                  key={course.id}
                  course={course}
                  getCourseIcon={getCourseIcon}
                  navigateTo={navigateTo}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
