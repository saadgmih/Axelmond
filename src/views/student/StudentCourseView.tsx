import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  Brain,
  Camera,
  CheckCircle,
  ChevronLeft,
  FileText,
  HelpCircle,
  Info,
  List,
  PlayCircle,
  Video,
  X,
} from "lucide-react";
import AITutorChat from "../../components/AITutorChat";
import PdfLessonViewer from "../../components/PdfLessonViewer";
import PremiumVideoPlayer from "../../components/PremiumVideoPlayer";
import { lessonContentIdFromModule } from "../../course-curriculum-utils";
import { findLessonContent } from "../../hooks/useCourseContent";
import { sanitizeCourseAttachmentUrl } from "../../external-url-security";
import type { ContentSection, Course, CourseModule, LessonContent } from "../../types";
import { formatCredits } from "../../utils/morocco-locale";

type NavigateTo = (view: string, targetCourse?: Course | null) => void;
type QuizQuestion = {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
};

interface StudentCourseViewProps {
  selectedCourse: Course;
  selectedModule: CourseModule;
  courseContentSections: ContentSection[];
  selectedLessonContent: LessonContent | null;
  showAITutor: boolean;
  quizQuestions: QuizQuestion[] | null;
  quizAnswers: Record<string, string>;
  quizSubmitted: boolean;
  quizScore: number | null;
  quizSubmitError: string;
  navigateTo: NavigateTo;
  onModuleSelect: (mod: CourseModule) => void;
  setShowAITutor: Dispatch<SetStateAction<boolean>>;
  markModuleCompleted: (modId: number) => void | Promise<void>;
  handleQuizAnswerSelect: (index: number, optionValue: string) => void;
  handleQuizSubmit: () => void | Promise<void>;
  resetQuiz: () => void;
  setCourseToPurchase?: (course: Course) => void;
}

export default function StudentCourseView({
  selectedCourse,
  selectedModule,
  courseContentSections,
  selectedLessonContent: selectedLessonContentFromProps,
  showAITutor,
  quizQuestions,
  quizAnswers,
  quizSubmitted,
  quizScore,
  quizSubmitError,
  navigateTo,
  onModuleSelect,
  setShowAITutor,
  markModuleCompleted,
  handleQuizAnswerSelect,
  handleQuizSubmit,
  resetQuiz,
  setCourseToPurchase,
}: StudentCourseViewProps) {
  const [isModuleDrawerOpen, setIsModuleDrawerOpen] = useState(false);

  const enrollment = selectedCourse.enrollment;

  const [timeRemaining, setTimeRemaining] = useState<number>(() => {
    if (!enrollment?.endDate) return 0;
    return new Date(enrollment.endDate).getTime() - Date.now();
  });

  useEffect(() => {
    if (!enrollment?.endDate) return;

    setTimeRemaining(new Date(enrollment.endDate).getTime() - Date.now());

    const interval = setInterval(() => {
      const remaining = new Date(enrollment.endDate!).getTime() - Date.now();
      setTimeRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [enrollment?.endDate]);

  const formattedStartDate = useMemo(() => {
    if (!enrollment?.startDate) return "";
    return new Date(enrollment.startDate).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, [enrollment?.startDate]);

  const formattedEndDate = useMemo(() => {
    if (!enrollment?.endDate) return "";
    return new Date(enrollment.endDate).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, [enrollment?.endDate]);

  const isSoonExpired = enrollment && timeRemaining > 0 && timeRemaining <= 3 * 24 * 60 * 60 * 1000;
  const isExpired = enrollment && timeRemaining <= 0;

  const statusLabel = isExpired ? "Expiré" : isSoonExpired ? "Expire bientôt" : "Actif";
  const statusColor = isExpired
    ? "bg-rose-50 text-rose-700 border-rose-200"
    : isSoonExpired
      ? "bg-amber-50 text-amber-700 border-amber-200"
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
    return findLessonContent(courseContentSections, linkedContentId);
  }, [selectedLessonContentFromProps, selectedModule.sectionId, courseContentSections]);

  const moduleSidebar = (
    <>
      <div className="p-4 sm:p-5 border-b border-slate-100 space-y-4">
        <button
          onClick={() => navigateTo("dashboard")}
          className="text-xs text-slate-500 font-bold hover:text-indigo-600 flex items-center gap-1 transition-colors min-h-[44px]"
        >
          <ChevronLeft className="w-4 h-4" /> Retour tableau de bord
        </button>

        <div className="space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded">
            {selectedCourse.level} · {formatCredits(selectedCourse.credits)}
          </span>
          <h2 className="text-base font-black text-slate-800 leading-tight">{selectedCourse.title}</h2>
          <p className="text-xs text-slate-500 font-medium">Syllabus officiel • {selectedCourse.instructor}</p>
        </div>

        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1 mt-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 font-bold">Progression totale :</span>
            <span className="font-extrabold text-indigo-600">{selectedCourse.progress}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
            <div className="h-full bg-indigo-600" style={{ width: `${selectedCourse.progress}%` }}></div>
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
                    <CheckCircle className={`w-4 h-4 ${isCurrent ? "text-indigo-400" : "text-emerald-500"}`} />
                  ) : mod.type === "quiz" ? (
                    <HelpCircle className="w-4 h-4 text-purple-400" />
                  ) : mod.type === "pdf" ? (
                    <FileText className="w-4 h-4 text-orange-400" />
                  ) : mod.type === "image" ? (
                    <Camera className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <PlayCircle className="w-4 h-4 text-indigo-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="truncate leading-tight">{mod.title}</p>
                  <span
                    className={`text-[10px] block mt-1 uppercase font-semibold ${
                      isCurrent ? "text-indigo-300" : "text-slate-400"
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
      <div className="flex-1 bg-white overflow-y-auto flex flex-col min-w-0 min-h-0">
        <div className="lg:hidden sticky top-0 z-20 flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-white/95 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setIsModuleDrawerOpen(true)}
            className="touch-target inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <List className="w-4 h-4" />
            Plan du cours
          </button>
          <span className="text-xs font-bold text-slate-500 truncate">{selectedModule.title}</span>
        </div>

        <div className="p-4 sm:p-6 md:p-8 space-y-6 flex-1">
          {/* Lesson Context Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="space-y-1">
              <span className="text-xs text-indigo-600 font-bold uppercase tracking-wider">
                Module en cours d'étude
              </span>
              <h1 className="text-xl md:text-2xl font-black text-slate-800 leading-tight">{selectedModule.title}</h1>
            </div>

            <button
              onClick={() => setShowAITutor(!showAITutor)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 self-start cursor-pointer group"
            >
              <Brain className="w-4 h-4 group-hover:scale-110 transition-transform" />
              {showAITutor ? "Masquer Tuteur IA" : "Ouvrir Tuteur IA"}
            </button>
          </div>

          {enrollment && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-700">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-extrabold uppercase tracking-wider ${statusColor}`}>
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
                  <span className="text-indigo-600 uppercase text-[9px] tracking-wider font-extrabold">Temps restant :</span>
                  <span className="font-mono text-indigo-700 font-black">
                    {isExpired ? "Accès expiré" : formatTimeRemaining(timeRemaining)}
                  </span>
                </div>
                {(isExpired || isSoonExpired) && setCourseToPurchase && (
                  <button
                    onClick={() => setCourseToPurchase(selectedCourse)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm shadow-indigo-100 cursor-pointer"
                  >
                    Renouveler
                  </button>
                )}
              </div>
            </div>
          )}

          {isExpired ? (
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-6 shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-100">
                <Info className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-800">Votre accès a expiré</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  L'accès de 30 jours à ce module est terminé. Pour continuer à visionner les vidéos, lire les manuels et passer les évaluations, veuillez renouveler votre inscription.
                </p>
              </div>
              {setCourseToPurchase && (
                <button
                  onClick={() => setCourseToPurchase(selectedCourse)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-6 py-3 rounded-2xl transition-all shadow-md shadow-indigo-100 cursor-pointer inline-flex items-center gap-2"
                >
                  Renouveler mon inscription
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              {/* Module body (Video / Text / Quiz) */}
              <div className={`${showAITutor ? "xl:col-span-7" : "xl:col-span-12"} space-y-6`}>
                {selectedLessonContent &&
                  (() => {
                    const rawAttachmentUrl = selectedLessonContent.attachments[0]?.url;
                    const safeAttachmentUrl = sanitizeCourseAttachmentUrl(rawAttachmentUrl);

                    return (
                      <div className="space-y-5">
                        <div className="bg-slate-900 rounded-2xl p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm border border-slate-950">
                          <div className="flex items-center gap-3">
                            <div className="p-3 bg-indigo-500/10 text-indigo-300 rounded-xl border border-indigo-500/20">
                              {selectedLessonContent.type === "VIDEO" ? (
                                <Video className="w-6 h-6" />
                              ) : selectedLessonContent.type === "PDF" ? (
                                <FileText className="w-6 h-6" />
                              ) : (
                                <Camera className="w-6 h-6" />
                              )}
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest leading-none">
                                Contenu publié — consultation sur la plateforme
                              </p>
                              <h4 className="text-sm font-bold text-white mt-1">{selectedLessonContent.title}</h4>
                              {selectedLessonContent.type !== "VIDEO" &&
                                selectedLessonContent.type !== "IMAGE" && (
                                  <p className="text-[11px] text-slate-400">
                                    {selectedLessonContent.attachments[0]?.fileName || "Contenu texte"}
                                  </p>
                                )}
                            </div>
                          </div>
                        </div>

                        {selectedLessonContent.type === "VIDEO" && safeAttachmentUrl && (
                          <PremiumVideoPlayer
                            src={safeAttachmentUrl}
                            title={selectedLessonContent.title}
                            instructor={selectedCourse.instructor}
                            activeSector="student"
                          />
                        )}

                        {selectedLessonContent.type === "PDF" && (
                          <PdfLessonViewer contentId={selectedLessonContent.id} title={selectedLessonContent.title} />
                        )}

                        {selectedLessonContent.type === "PDF" && rawAttachmentUrl && !safeAttachmentUrl && (
                          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                            Ce document utilise une URL non autorisée.
                          </div>
                        )}

                        {selectedLessonContent.type === "IMAGE" && (
                          <PdfLessonViewer
                            contentId={selectedLessonContent.id}
                            title={selectedLessonContent.title}
                            mediaType="IMAGE"
                          />
                        )}

                        {selectedLessonContent.type === "IMAGE" && rawAttachmentUrl && !safeAttachmentUrl && (
                          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                            Cette image utilise une URL non autorisée.
                          </div>
                        )}
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
                          <PremiumVideoPlayer
                            src={safeModuleVideoUrl}
                            title={selectedModule.title}
                            instructor={selectedCourse.instructor}
                            activeSector="student"
                          />
                        ) : (
                          <div className="relative w-full aspect-video bg-slate-950 rounded-2xl overflow-hidden shadow-md border border-slate-800 flex flex-col items-center justify-center gap-3 px-6 text-center">
                            <Video className="w-12 h-12 text-indigo-400" />
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
                              Marquez ce module comme terminé pour augmenter vos crédits Axelmond Research Labs.
                            </p>
                          </div>

                          {selectedModule.completed ? (
                            <div className="flex items-center gap-1.5 text-emerald-600 bg-white border border-emerald-200 px-4 py-2.5 rounded-xl text-xs font-bold">
                              <CheckCircle className="w-4 h-4" /> Complété avec succès
                            </div>
                          ) : (
                            <button
                              onClick={() => markModuleCompleted(selectedModule.id)}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer shadow-sm shadow-indigo-100"
                            >
                              Valider et terminer le chapitre
                            </button>
                          )}
                        </div>

                        {/* Additional content description notes */}
                        <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-3.5">
                          <h3 className="font-extrabold text-slate-800">À propos de ce module vidéo</h3>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            Ce module vidéo interactif est préparé par la faculté d'informatique théorique d'Axelmond
                            Research Labs. Il récapitule les grands principes scientifiques du sujet et contient de
                            précieux exercices pratiques à faire dans votre propre terminal.
                          </p>
                          <p className="text-xs text-slate-500 border-l-4 border-indigo-400 pl-4 py-1 italic bg-indigo-50/20">
                            Astuce académique : Vous pouvez poser des questions précises sur le code vidéo s'affichant à
                            l'écran en utilisant notre tuteur IA situé à votre droite.
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
                                        <span className="text-indigo-600 font-bold">•</span>
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
                          onClick={() => markModuleCompleted(selectedModule.id)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer"
                        >
                          Marquer cette leçon comme lue
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* CASE C: INTERACTIVE QUIZ */}
                {!selectedLessonContent && selectedModule.type === "quiz" && (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-2xl p-6 shadow-md border border-indigo-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider bg-indigo-950 px-2.5 py-1 rounded inline-block border border-indigo-900">
                          CONTRÔLE DES CONNAISSANCES INTERACTIF
                        </span>
                        <h2 className="text-xl font-black">Évaluation de fin de module</h2>
                        <p className="text-xs text-indigo-200 max-w-sm leading-relaxed">
                          Le score minimal académique de validation requis est de 100%.
                        </p>
                      </div>

                      {selectedModule.completed && selectedModule.score && (
                        <div className="bg-white/10 border border-white/20 p-3 rounded-xl text-center self-start sm:self-auto min-w-[120px]">
                          <p className="text-[10px] text-indigo-200 leading-none uppercase font-bold">Dernière Note</p>
                          <p className="text-3xl font-black text-white mt-1">{selectedModule.score}</p>
                        </div>
                      )}
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
                      {/* Render questions list */}
                      {quizQuestions ? (
                        <div className="space-y-8">
                          {quizQuestions.map((q, idx) => {
                            const isCorrect = quizAnswers[idx] === q.answer;
                            return (
                              <div
                                key={idx}
                                className="space-y-3 pb-6 border-b border-slate-100 last:border-none last:pb-0"
                              >
                                <h4 className="font-extrabold text-sm text-slate-800 leading-tight">
                                  Question {idx + 1} : {q.question}
                                </h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                                  {q.options.map((option, oIdx) => {
                                    const isSelected = quizAnswers[idx] === option;
                                    return (
                                      <button
                                        key={oIdx}
                                        type="button"
                                        disabled={quizSubmitted}
                                        onClick={() => handleQuizAnswerSelect(idx, option)}
                                        className={`w-full text-left p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between border cursor-pointer transition-all ${
                                          isSelected
                                            ? quizSubmitted
                                              ? isCorrect
                                                ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                                                : "bg-red-50 border-red-300 text-red-800"
                                              : "bg-indigo-600 border-indigo-700 text-white shadow-sm"
                                            : quizSubmitted && option === q.answer
                                              ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                                              : "bg-slate-50 border-slate-200 hover:bg-slate-100/70 text-slate-700"
                                        }`}
                                      >
                                        <span>{option}</span>

                                        {/* Status indicators */}
                                        {isSelected &&
                                          quizSubmitted &&
                                          (isCorrect ? (
                                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                                          ) : (
                                            <X className="w-4 h-4 text-red-600" />
                                          ))}
                                      </button>
                                    );
                                  })}
                                </div>

                                {/* Explanation notes */}
                                {quizSubmitted && (
                                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 leading-relaxed flex gap-2 pt-3">
                                    <Info className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <strong className="text-slate-800 font-bold block mb-0.5">
                                        Explication académique :
                                      </strong>
                                      {q.explanation}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {quizSubmitError && (
                            <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3 text-xs font-bold">
                              {quizSubmitError}
                            </div>
                          )}

                          {/* Grading summary actions */}
                          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                            {quizSubmitted ? (
                              <>
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-12 h-12 rounded-full flex items-center justify-center font-black font-mono text-lg shadow-inner ${
                                      quizScore === quizQuestions!.length
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-indigo-100 text-indigo-700"
                                    }`}
                                  >
                                    {quizScore}/{quizQuestions!.length}
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-bold text-slate-800 leading-tight">Note acquise</h4>
                                    <p className="text-xs text-slate-500">
                                      {quizScore === quizQuestions!.length
                                        ? "Félicitations ! Félicité et validé par le conseil."
                                        : "Réessayez pour obtenir le score parfait."}
                                    </p>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={resetQuiz}
                                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
                                >
                                  Recommencer l'évaluation
                                </button>
                              </>
                            ) : (
                              <>
                                <p className="text-xs text-slate-400 font-semibold">
                                  {Object.keys(quizAnswers).length} sur {quizQuestions!.length} résolues.
                                </p>
                                <button
                                  type="button"
                                  onClick={handleQuizSubmit}
                                  disabled={Object.keys(quizAnswers).length < quizQuestions!.length}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-6 py-3 rounded-xl transition-all shadow-md shadow-indigo-100 disabled:opacity-50 disabled:shadow-none cursor-pointer"
                                >
                                  Soumettre mes réponses
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-slate-400 text-xs">Aucun quiz n'est modélisé pour cette ressource.</p>
                      )}
                    </div>
                  </div>
                )}

                {!selectedLessonContent &&
                  selectedModule.type !== "video" &&
                  !(selectedModule.type === "pdf" && selectedModule.contentMarkdown) &&
                  selectedModule.type !== "quiz" && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 sm:p-10 text-center space-y-4">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500 border border-indigo-100">
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

              {/* AI Tutor Chat Widget right inside column layout */}
              {showAITutor && (
                <div className="xl:col-span-5 min-h-[320px] h-[min(520px,55dvh)] xl:h-[min(520px,calc(100dvh-120px))] xl:sticky xl:top-4 animate-in slide-in-from-right duration-200">
                  <AITutorChat
                    courseId={selectedCourse.id}
                    moduleId={selectedModule.id}
                    courseTitle={selectedCourse.title}
                    moduleTitle={selectedModule.title}
                    onClose={() => setShowAITutor(false)}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
