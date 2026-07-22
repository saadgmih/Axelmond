import { lazy, Suspense, useEffect, useMemo, useState, useRef, type Dispatch, type SetStateAction } from "react";
import {
  Camera,
  CheckCircle,
  FileText,
  HelpCircle,
  Info,
  PanelLeftClose,
  PanelLeftOpen,
  PlayCircle,
  Sigma,
  Target,
  Video,
  X,
} from "lucide-react";
import { LayoutFloatingToggle } from "../../components/LayoutFloatingToggle";
import LatexText from "../../components/LazyLatexText";
import SuccessCoachPanel from "../../components/SuccessCoachPanel";
import { lessonContentIdFromModule } from "../../course-curriculum-utils";
import { findLessonContent } from "../../hooks/useCourseContent";
import { sanitizeCourseAttachmentUrl } from "../../external-url-security";
import { getEnrollmentEffectiveEndDate, getEnrollmentRemainingMs, isEnrollmentActive } from "../../enrollment-access";
import type { ContentSection, Course, CourseModule, LessonContent, QuizQuestion } from "../../types";
import { formatCredits } from "../../utils/morocco-locale";
import { getCourseContentProgress } from "../../utils/course-content-metrics";

const PdfLessonViewer = lazy(() => import("../../components/PdfLessonViewer"));
const PremiumVideoPlayer = lazy(() => import("../../components/PremiumVideoPlayer"));

function CourseMediaFallback({ label }: { label: string }) {
  return (
    <div
      className="flex min-h-48 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950 px-6 text-center text-xs font-bold text-slate-400"
      role="status"
    >
      {label}
    </div>
  );
}

type NavigateTo = (view: string, targetCourse?: Course | null) => void;
interface StudentCourseViewProps {
  selectedCourse: Course;
  selectedModule: CourseModule;
  courseContentSections: ContentSection[];
  moduleRootContents: LessonContent[];
  selectedLessonContent: LessonContent | null;
  showSuccessCoach: boolean;
  quizQuestions: QuizQuestion[] | null;
  quizAnswers: Record<string, string>;
  quizSubmitted: boolean;
  quizScore: number | null;
  quizSubmitError: string;
  moduleProgressPendingId: number | null;
  moduleProgressError: string;
  navigateTo: NavigateTo;
  onModuleSelect: (mod: CourseModule) => void;
  setShowSuccessCoach: Dispatch<SetStateAction<boolean>>;
  markModuleCompleted: (modId: number, completed?: boolean) => void | Promise<void>;
  handleQuizAnswerSelect: (index: number, optionValue: string) => void;
  handleQuizSubmit: () => void | Promise<void>;
  resetQuiz: () => void;
  setCourseToPurchase?: (course: Course) => void;
}

export default function StudentCourseView({
  selectedCourse,
  selectedModule,
  courseContentSections,
  moduleRootContents,
  selectedLessonContent: selectedLessonContentFromProps,
  showSuccessCoach,
  quizQuestions,
  quizAnswers,
  quizSubmitted,
  quizScore,
  quizSubmitError,
  moduleProgressPendingId,
  moduleProgressError,
  navigateTo,
  onModuleSelect,
  setShowSuccessCoach,
  markModuleCompleted,
  handleQuizAnswerSelect,
  handleQuizSubmit,
  resetQuiz,
  setCourseToPurchase,
}: StudentCourseViewProps) {
  const [isModuleDrawerOpen, setIsModuleDrawerOpen] = useState(false);

  const openCoachBtnRef = useRef<HTMLButtonElement>(null);
  const prevShowSuccessCoach = useRef(showSuccessCoach);

  const [isLargeScreen, setIsLargeScreen] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(min-width: 1440px)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(min-width: 1440px)");
    const handler = (e: MediaQueryListEvent) => {
      setIsLargeScreen(e.matches);
    };
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (prevShowSuccessCoach.current && !showSuccessCoach) {
      openCoachBtnRef.current?.focus();
    }
    prevShowSuccessCoach.current = showSuccessCoach;
  }, [showSuccessCoach]);

  const shouldLockScroll = showSuccessCoach && !isLargeScreen;

  const enrollment = selectedCourse.enrollment;

  const contentProgress = useMemo(() => getCourseContentProgress(selectedCourse.modules), [selectedCourse.modules]);
  const isModuleProgressPending = moduleProgressPendingId === selectedModule.id;
  const answeredQuizCount = quizQuestions ? Math.min(Object.keys(quizAnswers).length, quizQuestions.length) : 0;
  const quizCompletionPercentage = quizQuestions?.length
    ? Math.round((answeredQuizCount / quizQuestions.length) * 100)
    : 0;

  const [timeRemaining, setTimeRemaining] = useState<number | null>(() => {
    if (!enrollment) return null;
    return getEnrollmentRemainingMs(enrollment);
  });

  useEffect(() => {
    if (!enrollment) {
      setTimeRemaining(null);
      return;
    }

    setTimeRemaining(getEnrollmentRemainingMs(enrollment));
    if (!getEnrollmentEffectiveEndDate(enrollment)) return;

    const interval = setInterval(() => {
      const remaining = getEnrollmentRemainingMs(enrollment) ?? 0;
      setTimeRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [enrollment?.active, enrollment?.endDate, enrollment?.startDate]);

  const formattedStartDate = useMemo(() => {
    if (!enrollment?.startDate) return "";
    return new Date(enrollment.startDate).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, [enrollment?.startDate]);

  const formattedEndDate = useMemo(() => {
    if (!enrollment) return "";
    const effectiveEndDate = getEnrollmentEffectiveEndDate(enrollment);
    if (!effectiveEndDate) return "Non renseignée";
    return effectiveEndDate.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, [enrollment]);

  const isSoonExpired =
    Boolean(enrollment) && timeRemaining != null && timeRemaining > 0 && timeRemaining <= 3 * 24 * 60 * 60 * 1000;
  const isExpired = Boolean(enrollment && !isEnrollmentActive(enrollment));

  const statusLabel = isExpired ? "Expiré" : isSoonExpired ? "Expire bientôt" : "Actif";
  const statusColor = isExpired
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : isSoonExpired
      ? "bg-lime-50 text-lime-700 border-lime-200"
      : "bg-emerald-50 text-emerald-700 border-emerald-200";

  function formatTimeRemaining(ms: number): string {
    if (ms <= 0) return "Accès expiré";
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / 1000 / 60) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));

    const parts: string[] = [];
    if (days > 0) parts.push(`${days} jour${days > 1 ? "s" : ""}`);
    if (hours > 0 || days > 0) parts.push(`${hours}h`);
    if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}min`);
    parts.push(`${seconds}s`);

    return parts.join(" ");
  }

  const selectedLessonContent = useMemo(() => {
    if (selectedLessonContentFromProps) return selectedLessonContentFromProps;
    const linkedContentId = lessonContentIdFromModule(selectedModule.sectionId);
    if (!linkedContentId) return null;
    return (
      moduleRootContents.find((content) => content.id === linkedContentId) ||
      findLessonContent(courseContentSections, linkedContentId)
    );
  }, [selectedLessonContentFromProps, selectedModule.sectionId, courseContentSections, moduleRootContents]);

  function getContentCompletionLabel(type: LessonContent["type"]): string {
    if (type === "VIDEO") return "Marquer comme terminée";
    if (type === "IMAGE") return "Marquer comme consultée";
    return "Marquer comme terminé";
  }

  const moduleSidebar = (
    <>
      <div className="p-4 sm:p-5 border-b border-slate-100 space-y-4">
        <div className="space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded">
            {selectedCourse.level} · {formatCredits(selectedCourse.credits)}
          </span>
          <h2 className="text-base font-black text-slate-800 leading-tight">{selectedCourse.title}</h2>
          <p className="text-xs text-slate-500 font-medium">Syllabus officiel • {selectedCourse.instructor}</p>
        </div>

        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1 mt-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 font-bold">Progression totale :</span>
            <span className="font-extrabold text-emerald-600">{contentProgress.progressPercent}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
            <div className="h-full bg-emerald-600" style={{ width: `${contentProgress.progressPercent}%` }}></div>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2.5">Plan d'apprentissage</p>
        <div className="space-y-1">
          {selectedCourse.modules.map((mod) => {
            const isCurrent = selectedModule.id === mod.id;
            return (
              <button
                key={mod.id}
                onClick={() => {
                  onModuleSelect(mod);
                  setIsModuleDrawerOpen(false);
                }}
                className={`w-full text-left px-3.5 py-3 min-h-[44px] rounded-xl text-xs font-semibold flex items-start gap-2.5 transition-all ${
                  isCurrent ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div className="mt-0.5 flex-shrink-0">
                  {mod.completed ? (
                    <CheckCircle className={`w-4 h-4 ${isCurrent ? "text-emerald-400" : "text-emerald-500"}`} />
                  ) : mod.type === "quiz" ? (
                    <HelpCircle className="w-4 h-4 text-teal-400" />
                  ) : mod.type === "pdf" ? (
                    <FileText className="w-4 h-4 text-orange-400" />
                  ) : mod.type === "image" ? (
                    <Camera className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <PlayCircle className="w-4 h-4 text-emerald-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="truncate leading-tight">{mod.title}</p>
                  <span
                    className={`text-[10px] block mt-1 uppercase font-semibold ${
                      isCurrent ? "text-emerald-300" : "text-slate-400"
                    }`}
                  >
                    {mod.type === "video"
                      ? "Module Vidéo"
                      : mod.type === "pdf"
                        ? "Document Manuel"
                        : mod.type === "image"
                          ? "Illustration"
                          : "Évaluation interactive"}{" "}
                    • {mod.duration}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedCourse.isLiveNow && (
        <div className="p-4 border-t border-slate-100">
          <button
            onClick={() => {
              setIsModuleDrawerOpen(false);
              navigateTo("live", selectedCourse);
            }}
            className="w-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-3 min-h-[44px] rounded-xl flex items-center justify-center gap-1.5 shadow-sm shadow-red-100 cursor-pointer"
          >
            <Video className="w-4 h-4" /> Accéder à la classe Live
          </button>
        </div>
      )}
    </>
  );

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-0 overflow-hidden">
      <div className="lg:hidden">
        <LayoutFloatingToggle
          anchor="module"
          storageKey="axelmond_module_plan_toggle_position"
          ariaLabel={isModuleDrawerOpen ? "Fermer le plan du cours" : "Ouvrir le plan du cours"}
          ariaPressed={isModuleDrawerOpen}
          title="Glisser pour déplacer, cliquer pour basculer le plan du cours"
          onActivate={() => setIsModuleDrawerOpen((open) => !open)}
          className="module-plan-collapse-toggle"
        >
          {isModuleDrawerOpen ? (
            <PanelLeftClose className="layout-collapse-toggle-icon" aria-hidden="true" />
          ) : (
            <PanelLeftOpen className="layout-collapse-toggle-icon" aria-hidden="true" />
          )}
        </LayoutFloatingToggle>
      </div>

      {isModuleDrawerOpen && (
        <button
          type="button"
          aria-label="Fermer le plan du cours"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setIsModuleDrawerOpen(false)}
        />
      )}

      {/* Left Column: Modules menu hierarchy */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-[min(320px,88vw)] bg-white border-r border-slate-200 flex flex-col overflow-hidden flex-shrink-0 transform transition-transform duration-200 lg:relative lg:translate-x-0 lg:w-80 lg:z-auto ${
          isModuleDrawerOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <span className="text-xs font-black uppercase tracking-widest text-slate-500">Plan du cours</span>
          <button
            type="button"
            onClick={() => setIsModuleDrawerOpen(false)}
            className="touch-target p-2 rounded-lg text-slate-500 hover:bg-slate-100 flex items-center justify-center"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {moduleSidebar}
      </div>

      {/* Central Module Lesson space */}
      <div
        className={`flex-1 bg-white flex flex-col min-w-0 min-h-0 ${shouldLockScroll ? "overflow-hidden" : "overflow-y-auto"}`}
      >
        <div className="p-4 sm:p-6 md:p-8 space-y-6 flex-1">
          {/* Lesson Context Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="space-y-1">
              <span className="text-xs text-emerald-600 font-bold uppercase tracking-wider">
                Module en cours d'étude
              </span>
              <h1 className="text-xl md:text-2xl font-black text-slate-800 leading-tight">{selectedModule.title}</h1>
            </div>

            <button
              ref={openCoachBtnRef}
              type="button"
              onClick={() => setShowSuccessCoach(!showSuccessCoach)}
              aria-expanded={showSuccessCoach}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 self-start cursor-pointer group"
            >
              <Target className="w-4 h-4 group-hover:scale-110 transition-transform" />
              {showSuccessCoach ? "Masquer mon coach" : "Mon plan de réussite"}
            </button>
          </div>

          {enrollment && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-700">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-lg border text-[10px] font-extrabold uppercase tracking-wider ${statusColor}`}
                  >
                    {statusLabel}
                  </span>
                </div>
                <div className="h-4 w-px bg-slate-200 hidden md:block" />
                <div>
                  <span className="text-slate-400 font-bold">Inscription :</span> {formattedStartDate}
                </div>
                <div className="h-4 w-px bg-slate-200 hidden md:block" />
                <div>
                  <span className="text-slate-400 font-bold">Fin d'accès :</span> {formattedEndDate}
                </div>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-4">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 bg-white border border-slate-200/60 px-3.5 py-2 rounded-xl shadow-sm">
                  <span className="text-emerald-600 uppercase text-[9px] tracking-wider font-extrabold">
                    Temps restant :
                  </span>
                  <span className="font-mono text-emerald-700 font-black">
                    {isExpired ? "Accès expiré" : formatTimeRemaining(timeRemaining ?? 0)}
                  </span>
                </div>
                {(isExpired || isSoonExpired) && setCourseToPurchase && (
                  <button
                    onClick={() => setCourseToPurchase(selectedCourse)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm shadow-emerald-100 cursor-pointer"
                  >
                    Renouveler
                  </button>
                )}
              </div>
            </div>
          )}

          {moduleProgressError && (
            <div
              role="alert"
              className="rounded-2xl border border-rose-300/25 bg-rose-400/10 px-4 py-3 text-xs font-bold text-rose-200"
            >
              {moduleProgressError}
            </div>
          )}

          {isExpired ? (
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-6 shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <Info className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-800">Votre accès a expiré</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  L'accès de 30 jours à ce module est terminé. Pour continuer à visionner les vidéos, lire les manuels
                  et passer les évaluations, veuillez renouveler votre inscription.
                </p>
              </div>
              {setCourseToPurchase && (
                <button
                  onClick={() => setCourseToPurchase(selectedCourse)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-6 py-3 rounded-2xl transition-all shadow-md shadow-emerald-100 cursor-pointer inline-flex items-center gap-2"
                >
                  Renouveler mon inscription
                </button>
              )}
            </div>
          ) : (
            <div className="success-coach-layout-container">
              {/* Module body (Video / Text / Quiz) */}
              <div className="success-coach-layout-main space-y-6">
                {selectedLessonContent &&
                  (() => {
                    const rawAttachmentUrl = selectedLessonContent.attachments[0]?.url;
                    const safeAttachmentUrl = sanitizeCourseAttachmentUrl(rawAttachmentUrl);

                    return (
                      <div className="space-y-5">
                        <div className="bg-slate-900 rounded-2xl p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm border border-slate-950">
                          <div className="flex items-center gap-3">
                            <div className="p-3 bg-emerald-500/10 text-emerald-300 rounded-xl border border-emerald-500/20">
                              {selectedLessonContent.type === "VIDEO" ? (
                                <Video className="w-6 h-6" />
                              ) : selectedLessonContent.type === "PDF" ? (
                                <FileText className="w-6 h-6" />
                              ) : (
                                <Camera className="w-6 h-6" />
                              )}
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest leading-none">
                                Contenu publié — consultation sur la plateforme
                              </p>
                              <h4 className="text-sm font-bold text-white mt-1">{selectedLessonContent.title}</h4>
                              {selectedLessonContent.type !== "VIDEO" && selectedLessonContent.type !== "IMAGE" && (
                                <p className="text-[11px] text-slate-400">
                                  {selectedLessonContent.attachments[0]?.fileName || "Contenu texte"}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {selectedLessonContent.type === "VIDEO" && safeAttachmentUrl && (
                          <Suspense fallback={<CourseMediaFallback label="Chargement de la vidéo…" />}>
                            <PremiumVideoPlayer
                              src={safeAttachmentUrl}
                              contentId={selectedLessonContent.id}
                              title={selectedLessonContent.title}
                              instructor={selectedCourse.instructor}
                              activeSector="student"
                            />
                          </Suspense>
                        )}

                        {selectedLessonContent.type === "PDF" && (
                          <Suspense fallback={<CourseMediaFallback label="Chargement du document…" />}>
                            <PdfLessonViewer contentId={selectedLessonContent.id} title={selectedLessonContent.title} />
                          </Suspense>
                        )}

                        {selectedLessonContent.type === "PDF" && rawAttachmentUrl && !safeAttachmentUrl && (
                          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                            Ce document utilise une URL non autorisée.
                          </div>
                        )}

                        {selectedLessonContent.type === "IMAGE" && (
                          <Suspense fallback={<CourseMediaFallback label="Chargement de l’image…" />}>
                            <PdfLessonViewer
                              contentId={selectedLessonContent.id}
                              title={selectedLessonContent.title}
                              mediaType="IMAGE"
                            />
                          </Suspense>
                        )}

                        {selectedLessonContent.type === "IMAGE" && rawAttachmentUrl && !safeAttachmentUrl && (
                          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                            Cette image utilise une URL non autorisée.
                          </div>
                        )}

                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                              {selectedModule.completed && <CheckCircle className="w-4 h-4 text-emerald-600" />}
                              Progression de ce contenu
                            </h4>
                            <p className="text-xs text-slate-500">
                              {selectedModule.completed
                                ? "Ce contenu est comptabilisé dans votre progression."
                                : "Validez ce contenu après consultation pour mettre à jour votre progression."}
                            </p>
                          </div>

                          {selectedModule.completed ? (
                            <button
                              type="button"
                              disabled={isModuleProgressPending}
                              onClick={() => markModuleCompleted(selectedModule.id, false)}
                              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isModuleProgressPending ? "Enregistrement…" : "Annuler terminé"}
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isModuleProgressPending}
                              onClick={() => markModuleCompleted(selectedModule.id, true)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer shadow-sm shadow-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isModuleProgressPending
                                ? "Enregistrement…"
                                : getContentCompletionLabel(selectedLessonContent.type)}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                {/* CASE A: VIDEO CONTENT */}
                {!selectedLessonContent &&
                  selectedModule.type === "video" &&
                  (() => {
                    const safeModuleVideoUrl = sanitizeCourseAttachmentUrl(selectedModule.attachmentUrl);
                    return (
                      <div className="space-y-5">
                        {safeModuleVideoUrl ? (
                          <Suspense fallback={<CourseMediaFallback label="Chargement de la vidéo…" />}>
                            <PremiumVideoPlayer
                              src={safeModuleVideoUrl}
                              title={selectedModule.title}
                              instructor={selectedCourse.instructor}
                              activeSector="student"
                            />
                          </Suspense>
                        ) : (
                          <div className="relative w-full aspect-video bg-slate-950 rounded-2xl overflow-hidden shadow-md border border-slate-800 flex flex-col items-center justify-center gap-3 px-6 text-center">
                            <Video className="w-12 h-12 text-emerald-400" />
                            <div className="space-y-1">
                              <h3 className="text-sm font-black text-white">Vidéo à venir</h3>
                              <p className="text-xs text-slate-400">Contenu en préparation pour ce chapitre.</p>
                              <p className="text-[11px] text-slate-500 font-mono">
                                {selectedCourse.instructor} • {selectedModule.duration}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Complete chapter option */}
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-0.5">
                            <h4 className="font-extrabold text-sm text-slate-800">Avez-vous compris cette leçon ?</h4>
                            <p className="text-xs text-slate-500">
                              Marquez ce module comme terminé pour augmenter vos PA (Performance Académique).
                            </p>
                          </div>

                          {selectedModule.completed ? (
                            <div className="flex items-center gap-1.5 text-emerald-600 bg-white border border-emerald-200 px-4 py-2.5 rounded-xl text-xs font-bold">
                              <CheckCircle className="w-4 h-4" /> Complété avec succès
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={isModuleProgressPending}
                              onClick={() => markModuleCompleted(selectedModule.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer shadow-sm shadow-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isModuleProgressPending ? "Enregistrement…" : "Valider et terminer le chapitre"}
                            </button>
                          )}
                        </div>

                        {/* Additional content description notes */}
                        <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-3.5">
                          <h3 className="font-extrabold text-slate-800">À propos de ce module vidéo</h3>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            Ce module vidéo interactif est préparé par la faculté d'informatique théorique de
                            Performance Académique. Il récapitule les grands principes scientifiques du sujet et
                            contient de précieux exercices pratiques à faire dans votre propre terminal.
                          </p>
                          <p className="text-xs text-slate-500 border-l-4 border-emerald-400 pl-4 py-1 italic bg-emerald-50/20">
                            Astuce académique : ouvrez votre plan de réussite pour identifier la prochaine leçon à
                            travailler et lancer une séance de concentration.
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                {/* CASE B: DOCUMENT PDF TEXT */}
                {!selectedLessonContent && selectedModule.type === "pdf" && selectedModule.contentMarkdown && (
                  <div className="space-y-6">
                    {/* Download and Header banner */}
                    <div className="bg-slate-900 rounded-2xl p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm border border-slate-950">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-orange-500/10 text-orange-400 rounded-xl border border-orange-500/20">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest leading-none">
                            Document du module
                          </p>
                          <h4 className="text-sm font-bold text-white mt-1">{selectedModule.title}</h4>
                          <p className="text-[11px] text-slate-400">Manuel pédagogique • {selectedCourse.instructor}</p>
                        </div>
                      </div>
                    </div>

                    {/* Document rendering container */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
                      {/* Markdown parsing display */}
                      <div className="prose prose-slate max-w-none text-slate-800 text-xs sm:text-sm">
                        {/* Format the hardcoded content markdown nicely */}
                        <div className="space-y-4">
                          {selectedModule.contentMarkdown.split("\n\n").map((chunk, i) => {
                            if (chunk.startsWith("###")) {
                              return (
                                <h3
                                  key={i}
                                  className="text-lg font-black text-slate-900 border-b border-slate-100 pb-2 pt-4"
                                >
                                  {chunk.replace("###", "").trim()}
                                </h3>
                              );
                            } else if (chunk.startsWith("####")) {
                              return (
                                <h4 key={i} className="font-extrabold text-slate-800 pt-2">
                                  {chunk.replace("####", "").trim()}
                                </h4>
                              );
                            } else if (chunk.startsWith("```")) {
                              const rawCode = chunk
                                .replace(/```[a-z]*/, "")
                                .replace(/```$/, "")
                                .trim();
                              return (
                                <pre
                                  key={i}
                                  className="font-mono text-xs bg-slate-950 text-slate-100 p-4 rounded-xl overflow-x-auto border border-slate-800 shadow-inner"
                                >
                                  <code>{rawCode}</code>
                                </pre>
                              );
                            } else if (chunk.includes("- **")) {
                              return (
                                <ul key={i} className="space-y-1 my-2">
                                  {chunk.split("\n").map((line, li) => {
                                    const cleanLine = line.replace(/^\s*-\s*\*\*/, "").replace(/\*\*/, "");
                                    const parts = cleanLine.split(":");
                                    return (
                                      <li key={li} className="flex items-start gap-2 text-slate-700">
                                        <span className="text-emerald-600 font-bold">•</span>
                                        <p>
                                          <strong>{parts[0]}</strong>: {parts[1]}
                                        </p>
                                      </li>
                                    );
                                  })}
                                </ul>
                              );
                            }
                            return (
                              <p key={i} className="text-slate-600 leading-relaxed">
                                {chunk}
                              </p>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Validation box */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-0.5">
                        <h4 className="font-extrabold text-sm text-slate-800">Avez-vous fini de lire cet article ?</h4>
                        <p className="text-xs text-slate-500">Marquer comme lu pour faire grimper votre pourcentage.</p>
                      </div>

                      {selectedModule.completed ? (
                        <div className="flex items-center gap-1.5 text-emerald-600 bg-white border border-emerald-200 px-4 py-2.5 rounded-xl text-xs font-bold">
                          <CheckCircle className="w-4 h-4" /> Manuel validé
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={isModuleProgressPending}
                          onClick={() => markModuleCompleted(selectedModule.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isModuleProgressPending ? "Enregistrement…" : "Marquer cette leçon comme lue"}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* CASE C: INTERACTIVE QUIZ */}
                {!selectedLessonContent && selectedModule.type === "quiz" && (
                  <div className="space-y-6">
                    <div className="relative overflow-hidden rounded-3xl border border-teal-500/25 bg-slate-950 p-6 text-white shadow-md">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.28),transparent_34%),linear-gradient(135deg,rgba(76,29,149,0.58),rgba(15,23,42,0.92)_45%,rgba(6,78,59,0.32))]" />
                      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-2">
                          <span className="inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-teal-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-teal-200">
                            <Sigma className="h-3.5 w-3.5" />
                            Quiz scientifique avec LaTeX
                          </span>
                          <h2 className="text-xl font-black">Évaluation de fin de module</h2>
                          <p className="max-w-lg text-xs leading-relaxed text-slate-300">
                            Les formules, matrices, suites, intégrales et fonctions sont affichées en notation
                            académique.
                          </p>
                        </div>

                        <div className="grid min-w-[170px] grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/5 p-2 text-center backdrop-blur">
                          <div className="rounded-xl bg-slate-950/70 px-3 py-2">
                            <p className="text-[9px] font-black uppercase text-slate-400">Questions</p>
                            <p className="mt-1 text-lg font-black text-white">{quizQuestions?.length ?? 0}</p>
                          </div>
                          <div className="rounded-xl bg-slate-950/70 px-3 py-2">
                            <p className="text-[9px] font-black uppercase text-slate-400">Répondues</p>
                            <p className="mt-1 text-lg font-black text-teal-200">{answeredQuizCount}</p>
                          </div>
                        </div>
                      </div>

                      {selectedModule.completed && selectedModule.score && (
                        <div className="relative mt-4 w-fit min-w-[120px] rounded-xl border border-white/20 bg-white/10 p-3 text-center">
                          <p className="text-[10px] text-emerald-200 leading-none uppercase font-bold">Dernière Note</p>
                          <p className="text-3xl font-black text-white mt-1">{selectedModule.score}</p>
                        </div>
                      )}
                    </div>

                    {selectedModule.completed && (
                      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-emerald-300/20 bg-emerald-400/[0.08] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:flex-row sm:items-center">
                        <div className="space-y-1">
                          <h4 className="flex items-center gap-2 text-sm font-extrabold text-emerald-100">
                            <CheckCircle className="h-4 w-4 text-emerald-300" />
                            Quiz validé dans votre progression
                          </h4>
                          <p className="text-xs text-emerald-100/65">
                            Cette évaluation est comptabilisée dans votre avancement actuel.
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={isModuleProgressPending}
                          onClick={() => markModuleCompleted(selectedModule.id, false)}
                          className="cursor-pointer rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-5 py-2.5 text-xs font-bold text-emerald-100 transition-colors hover:border-emerald-300/40 hover:bg-emerald-300/15 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isModuleProgressPending ? "Enregistrement…" : "Annuler terminé"}
                        </button>
                      </div>
                    )}

                    <div
                      data-testid="student-quiz-panel"
                      className="rounded-[2rem] border border-emerald-200/10 bg-[#041b17]/90 p-3 shadow-[0_24px_70px_-38px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.035)] sm:p-5 lg:p-6"
                    >
                      {/* Render questions list */}
                      {quizQuestions && quizQuestions.length > 0 ? (
                        <div className="space-y-4 sm:space-y-5">
                          {quizQuestions.map((q, idx) => {
                            const isCorrect = quizAnswers[idx] === q.answer;
                            return (
                              <div
                                key={idx}
                                data-testid="quiz-question-card"
                                className="overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-[#08231e] shadow-[0_18px_48px_-32px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.035)]"
                              >
                                <div className="border-b border-emerald-100/10 bg-[linear-gradient(135deg,rgba(52,211,153,0.08),transparent_58%)] px-4 py-5 sm:px-5 sm:py-6">
                                  <span className="mb-3 inline-flex rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-200">
                                    Question {idx + 1}
                                  </span>
                                  <div className="text-sm font-extrabold leading-relaxed text-emerald-50 sm:text-base">
                                    <LatexText value={q.question} />
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 gap-3 bg-[#061c18]/70 p-4 sm:p-5 lg:grid-cols-2">
                                  {q.options.map((option, oIdx) => {
                                    const isSelected = quizAnswers[idx] === option;
                                    return (
                                      <button
                                        key={oIdx}
                                        type="button"
                                        disabled={quizSubmitted}
                                        aria-pressed={isSelected}
                                        onClick={() => handleQuizAnswerSelect(idx, option)}
                                        className={`group flex min-h-[76px] w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border p-3.5 text-left text-xs font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#061c18] disabled:cursor-default ${
                                          isSelected
                                            ? quizSubmitted
                                              ? isCorrect
                                                ? "border-emerald-400/60 bg-emerald-400/[0.12] text-emerald-50 ring-1 ring-inset ring-emerald-400/20"
                                                : "border-rose-400/60 bg-rose-400/[0.11] text-rose-50 ring-1 ring-inset ring-rose-400/20"
                                              : "border-emerald-300/70 bg-emerald-300/[0.14] text-white shadow-[0_12px_28px_-18px_rgba(52,211,153,0.8)] ring-2 ring-emerald-300/20"
                                            : quizSubmitted && option === q.answer
                                              ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-100 ring-1 ring-inset ring-emerald-400/15"
                                              : "border-white/[0.08] bg-[#0a2a23] text-emerald-50/85 hover:-translate-y-0.5 hover:border-emerald-300/35 hover:bg-[#0d352c] hover:text-white hover:shadow-[0_14px_28px_-22px_rgba(52,211,153,0.7)]"
                                        }`}
                                      >
                                        <span
                                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[11px] font-black transition-colors ${
                                            isSelected
                                              ? quizSubmitted
                                                ? isCorrect
                                                  ? "bg-emerald-300 text-emerald-950"
                                                  : "bg-rose-400 text-rose-950"
                                                : "bg-emerald-200 text-emerald-950"
                                              : quizSubmitted && option === q.answer
                                                ? "bg-emerald-300 text-emerald-950"
                                                : "border border-white/[0.06] bg-white/[0.06] text-emerald-100/55 group-hover:bg-emerald-300/15 group-hover:text-emerald-200"
                                          }`}
                                        >
                                          {String.fromCharCode(65 + oIdx)}
                                        </span>

                                        <span className="min-w-0 flex-1 leading-relaxed">
                                          <LatexText value={option} compact />
                                        </span>

                                        {/* Status indicators */}
                                        {quizSubmitted ? (
                                          option === q.answer ? (
                                            <CheckCircle className="h-4 w-4 shrink-0 text-emerald-300" />
                                          ) : isSelected ? (
                                            <X className="h-4 w-4 shrink-0 text-rose-300" />
                                          ) : null
                                        ) : isSelected ? (
                                          <CheckCircle className="h-4 w-4 shrink-0 text-emerald-200" />
                                        ) : null}
                                      </button>
                                    );
                                  })}
                                </div>

                                {/* Explanation notes */}
                                {quizSubmitted && (
                                  <div className="mx-4 mb-4 flex gap-2 rounded-2xl border border-emerald-200/10 bg-[#061c18] p-3.5 text-xs leading-relaxed text-emerald-50/65 sm:mx-5 sm:mb-5">
                                    <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-300" />
                                    <div>
                                      <strong className="mb-0.5 block font-bold text-emerald-100">
                                        Explication académique :
                                      </strong>
                                      <LatexText value={q.explanation} compact />
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {quizSubmitError && (
                            <div className="rounded-xl border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-xs font-bold text-rose-200">
                              {quizSubmitError}
                            </div>
                          )}

                          {/* Grading summary actions */}
                          <div className="flex flex-col items-stretch justify-between gap-4 rounded-2xl border border-white/[0.08] bg-[#061c18]/90 p-4 sm:flex-row sm:items-center">
                            {quizSubmitted ? (
                              <>
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border font-mono text-lg font-black ${
                                      quizScore === quizQuestions!.length
                                        ? "border-emerald-300/30 bg-emerald-300/15 text-emerald-200"
                                        : "border-teal-300/25 bg-teal-300/10 text-teal-200"
                                    }`}
                                  >
                                    {quizScore}/{quizQuestions!.length}
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-bold leading-tight text-emerald-50">Note acquise</h4>
                                    <p className="mt-1 text-xs text-emerald-50/55">
                                      {quizScore === quizQuestions!.length
                                        ? "Félicitations ! Félicité et validé par le conseil."
                                        : "Réessayez pour obtenir le score parfait."}
                                    </p>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={resetQuiz}
                                  className="cursor-pointer rounded-xl border border-white/10 bg-white/[0.06] px-5 py-2.5 text-xs font-bold text-emerald-50 transition-colors hover:border-emerald-300/25 hover:bg-emerald-300/10"
                                >
                                  Recommencer l'évaluation
                                </button>
                              </>
                            ) : (
                              <>
                                <div className="min-w-0 flex-1 sm:max-w-sm">
                                  <div className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold">
                                    <span className="text-emerald-50/60">Progression du quiz</span>
                                    <span className="text-emerald-200">
                                      {answeredQuizCount} / {quizQuestions.length}
                                    </span>
                                  </div>
                                  <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                                    <div
                                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-300 transition-[width] duration-300"
                                      style={{ width: `${quizCompletionPercentage}%` }}
                                    />
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={handleQuizSubmit}
                                  disabled={answeredQuizCount < quizQuestions.length}
                                  className="cursor-pointer rounded-xl border border-emerald-300/20 bg-emerald-500 px-6 py-3 text-xs font-bold text-emerald-950 shadow-[0_14px_30px_-18px_rgba(52,211,153,0.9)] transition-all hover:bg-emerald-400 disabled:cursor-not-allowed disabled:border-white/[0.06] disabled:bg-white/[0.06] disabled:text-emerald-50/30 disabled:shadow-none"
                                >
                                  Soumettre mes réponses
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="px-2 py-4 text-xs text-emerald-50/50">
                          Aucun quiz n'est modélisé pour cette ressource.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {!selectedLessonContent &&
                  selectedModule.type !== "video" &&
                  !(selectedModule.type === "pdf" && selectedModule.contentMarkdown) &&
                  selectedModule.type !== "quiz" && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 sm:p-10 text-center space-y-4">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500 border border-emerald-100">
                        <Info className="h-7 w-7" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-lg font-black text-slate-800">{selectedModule.title}</h3>
                        <p className="text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
                          {lessonContentIdFromModule(selectedModule.sectionId)
                            ? "Le contenu publié de ce module est en cours de chargement ou n'est pas encore disponible."
                            : "Ce module fait partie du plan d'apprentissage. Le professeur peut y ajouter des ressources pédagogiques prochainement."}
                        </p>
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600">
                        <span className="text-slate-400">Cours :</span>
                        {selectedCourse.title}
                        <span className="text-slate-300">•</span>
                        {selectedCourse.instructor}
                      </div>
                    </div>
                  )}
              </div>

              {/* Personalized success coach inside the responsive course layout */}
              {showSuccessCoach && (
                <>
                  <div
                    className="success-coach-drawer-backdrop"
                    onClick={() => setShowSuccessCoach(false)}
                    aria-hidden="true"
                  />
                  <div className="success-coach-layout-sidebar">
                    <SuccessCoachPanel
                      course={selectedCourse}
                      selectedModuleId={selectedModule.id}
                      onSelectModule={onModuleSelect}
                      onResetQuiz={resetQuiz}
                      onClose={() => setShowSuccessCoach(false)}
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
