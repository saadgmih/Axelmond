import {
  BookOpen,
  Layers,
  FolderTree,
  Video,
  HelpCircle,
  Plus,
  Trash2,
  Edit3,
  Save,
  Check,
  FilePlus,
  Eye,
  EyeOff,
  FileText,
  Download,
  X,
  Sparkles,
  DollarSign,
  Clock,
  Award,
  ChevronRight
} from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import type { Course, ContentSection, FacultyDomain, LessonContent } from "../../types";
import { formatCredits, formatMad } from "../../utils/morocco-locale";
import {
  CURRICULUM_STEPS,
  curriculumUi,
  getStepTheme,
  publishedBadge,
  publishedLabel,
} from "./curriculum-theme";
import PremiumVideoPlayer from "../../components/PremiumVideoPlayer";

export interface TeacherCurriculumViewProps {
  domains: FacultyDomain[];
  activeCurriculumStep: number;
  setActiveCurriculumStep: (value: number) => void;
  selectedChapterId: string;
  setSelectedChapterId: (value: string) => void;
  selectedPartieId: string;
  setSelectedPartieId: (value: string) => void;
  newSectionMode: "chapter" | "part" | "subpart";
  setNewSectionMode: (value: "chapter" | "part" | "subpart") => void;
  uploadChapterId: string;
  setUploadChapterId: (value: string) => void;
  uploadPartId: string;
  setUploadPartId: (value: string) => void;
  uploadSubpartId: string;
  setUploadSubpartId: (value: string) => void;
  quizChapterId: string;
  setQuizChapterId: (value: string) => void;
  quizPartId: string;
  setQuizPartId: (value: string) => void;
  quizSubpartId: string;
  setQuizSubpartId: (value: string) => void;
  curriculumSuccessMsg: string;
  curriculumErrorMsg: string;
  newCourseTitle: string;
  setNewCourseTitle: (value: string) => void;
  newCourseDescription: string;
  setNewCourseDescription: (value: string) => void;
  newCourseDisciplineId: number;
  setNewCourseDisciplineId: (value: number) => void;
  newCourseCredits: number;
  setNewCourseCredits: (value: number) => void;
  newCourseDuration: string;
  setNewCourseDuration: (value: string) => void;
  newCoursePrice: number;
  setNewCoursePrice: (value: number) => void;
  newCoursePublished: boolean;
  setNewCoursePublished: (value: boolean) => void;
  newSectionCourseId: number;
  newSectionTitle: string;
  setNewSectionTitle: (value: string) => void;
  newSectionParentId: string;
  setNewSectionParentId: (value: string) => void;
  newSectionPublished: boolean;
  setNewSectionPublished: (value: boolean) => void;
  uploadSectionId: string;
  setUploadSectionId: (value: string) => void;
  uploadTitle: string;
  setUploadTitle: (value: string) => void;
  uploadType: "VIDEO" | "PDF" | "IMAGE";
  setUploadType: (value: "VIDEO" | "PDF" | "IMAGE") => void;
  uploadFile: File | null;
  setUploadFile: (value: File | null) => void;
  uploadPublished: boolean;
  setUploadPublished: (value: boolean) => void;
  uploadStatusMsg: string;
  editingCourse: Course | null;
  setEditingCourse: (value: Course | null) => void;
  editCourseForm: { title: string; description: string; level: string; duration: string; credits: number; disciplineId: number; price: number };
  setEditCourseForm: Dispatch<SetStateAction<{ title: string; description: string; level: string; duration: string; credits: number; disciplineId: number; price: number }>>;

  teacherQuizzes: any[];
  quizCourseId: number;
  newQuizTitle: string;
  setNewQuizTitle: (value: string) => void;
  selectedQuizId: string;
  setSelectedQuizId: (value: string) => void;
  newQuestionText: string;
  setNewQuestionText: (value: string) => void;
  newQuestionOptions: string[];
  setNewQuestionOptions: Dispatch<SetStateAction<string[]>>;

  newQuestionAnswer: string;
  setNewQuestionAnswer: (value: string) => void;
  newQuestionExplanation: string;
  setNewQuestionExplanation: (value: string) => void;
  quizManagerMsg: string;
  quizManagerError: string;
  allDisciplines: FacultyDomain['disciplines'][number][];
  managedCourses: Course[];
  managedCourse: Course | null;
  managedSections: (ContentSection & { depth?: number })[];
  chapterSections: (ContentSection & { depth?: number })[];
  uploadPartOptions: (ContentSection & { depth?: number })[];
  selectedManagedContents: LessonContent[];
  handleSetUploadSectionId: (sectionId: string) => void;
  showCurriculumSuccess: (message: string) => void;
  showCurriculumError: (message: string) => void;
  handleCreateCourse: (...args: any[]) => void | Promise<void>;
  handleCreateSection: (...args: any[]) => void | Promise<void>;
  handleUploadLessonAsset: (...args: any[]) => void | Promise<void>;
  handleSelectManagedCourse: (courseId: number) => Promise<void>;
  loadTeacherQuizzes: (courseId?: number) => void | Promise<void>;
  handleCreateQuiz: (...args: any[]) => void | Promise<void>;
  handleAddQuestion: (...args: any[]) => void | Promise<void>;
  handleDeleteQuestion: (...args: any[]) => void | Promise<void>;
  handleUpdateCourseDetails: (...args: any[]) => void | Promise<void>;
  handleSaveEditCourse: (...args: any[]) => void | Promise<void>;
  handleToggleCoursePublished: (...args: any[]) => void | Promise<void>;
  handleDeleteCourse: (...args: any[]) => void | Promise<void>;
  handleUpdateSectionTitle: (...args: any[]) => void | Promise<void>;
  handleToggleSectionPublished: (...args: any[]) => void | Promise<void>;
  handleDeleteSection: (...args: any[]) => void | Promise<void>;
  handleAddChildSection: (...args: any[]) => void | Promise<void>;
  handleToggleContentPublished: (...args: any[]) => void | Promise<void>;
  handleDeleteLessonContent: (...args: any[]) => void | Promise<void>;
}

export default function TeacherCurriculumView({
  domains,
  activeCurriculumStep,
  setActiveCurriculumStep,
  selectedChapterId,
  setSelectedChapterId,
  selectedPartieId,
  setSelectedPartieId,
  newSectionMode,
  setNewSectionMode,
  uploadChapterId,
  setUploadChapterId,
  uploadPartId,
  setUploadPartId,
  uploadSubpartId,
  setUploadSubpartId,
  quizChapterId,
  setQuizChapterId,
  quizPartId,
  setQuizPartId,
  quizSubpartId,
  setQuizSubpartId,
  curriculumSuccessMsg,
  curriculumErrorMsg,
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
  newSectionTitle,
  setNewSectionTitle,
  newSectionParentId,
  setNewSectionParentId,
  newSectionPublished,
  setNewSectionPublished,
  uploadSectionId,
  setUploadSectionId,
  uploadTitle,
  setUploadTitle,
  uploadType,
  setUploadType,
  uploadFile,
  setUploadFile,
  uploadPublished,
  setUploadPublished,
  uploadStatusMsg,
  editingCourse,
  setEditingCourse,
  editCourseForm,
  setEditCourseForm,
  teacherQuizzes,
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
  allDisciplines,
  managedCourses,
  managedCourse,
  managedSections,
  chapterSections,
  uploadPartOptions,
  selectedManagedContents,
  handleSetUploadSectionId,
  showCurriculumSuccess,
  showCurriculumError,
  handleCreateCourse,
  handleCreateSection,
  handleUploadLessonAsset,
  handleSelectManagedCourse,
  loadTeacherQuizzes,
  handleCreateQuiz,
  handleAddQuestion,
  handleDeleteQuestion,
  handleUpdateCourseDetails,
  handleSaveEditCourse,
  handleToggleCoursePublished,
  handleDeleteCourse,
  handleUpdateSectionTitle,
  handleToggleSectionPublished,
  handleDeleteSection,
  handleAddChildSection,
  handleToggleContentPublished,
  handleDeleteLessonContent
}: TeacherCurriculumViewProps) {
  const stepTheme = getStepTheme(activeCurriculumStep);
  const inputFocus = `${curriculumUi.input} ${stepTheme.focus}`;

  return (
                <div className={curriculumUi.page}>
                  {/* Hero + stepper */}
                  <div className={curriculumUi.hero}>
                    <div className={curriculumUi.heroGlow} />
                    <div className="relative space-y-6">
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-3 max-w-2xl">
                          <span className={curriculumUi.studioBadge}>
                            <Sparkles className="h-3.5 w-3.5" />
                            Studio pédagogique
                          </span>
                          <h2 className={curriculumUi.heroTitle}>
                            Gestion du programme pédagogique
                          </h2>
                          <p className={curriculumUi.heroDesc}>
                            Parcourez les 5 étapes pour construire votre module : catalogue, chapitres, arborescence, médias et évaluations.
                            Chaque étape a sa couleur pour repérer rapidement où vous travaillez.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => showCurriculumSuccess("Pour voir comme étudiant : connectez-vous avec un compte étudiant et ouvrez le catalogue puis le module publié.")}
                          className={curriculumUi.previewBtn}
                        >
                          <Eye className="h-4 w-4 text-violet-400" />
                          Voir comme étudiant
                        </button>
                      </div>

                      {(curriculumSuccessMsg || curriculumErrorMsg) && (
                        <div className={`animate-in fade-in duration-200 ${
                          curriculumErrorMsg ? curriculumUi.alertError : curriculumUi.alertSuccess
                        }`}>
                          {curriculumErrorMsg || curriculumSuccessMsg}
                        </div>
                      )}

                      <div className={`${curriculumUi.divider} pt-5 space-y-4`}>
                        <p className={curriculumUi.progressLabel}>
                          Progression · étape {activeCurriculumStep} / {CURRICULUM_STEPS.length}
                        </p>
                        <div className={curriculumUi.progressTrack}>
                          <div
                            className={curriculumUi.progressFill}
                            style={{ width: `${(activeCurriculumStep / CURRICULUM_STEPS.length) * 100}%` }}
                          />
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
                          {CURRICULUM_STEPS.map((s) => {
                            const Icon = s.icon;
                            const isActive = activeCurriculumStep === s.step;
                            const isCompleted = activeCurriculumStep > s.step;
                            return (
                              <button
                                key={s.step}
                                type="button"
                                onClick={() => {
                                  if (managedCourses.length > 0 || s.step === 1) {
                                    setActiveCurriculumStep(s.step);
                                  } else {
                                    showCurriculumError("Veuillez d'abord créer un module à l'étape 1.");
                                  }
                                }}
                                className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition-all duration-200 ${
                                  isActive
                                    ? s.active
                                    : isCompleted
                                    ? s.completed
                                    : curriculumUi.stepIdle
                                }`}
                              >
                                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                                  isActive
                                    ? s.badgeActive
                                    : isCompleted
                                    ? s.badgeCompleted
                                    : "bg-slate-800 text-slate-500"
                                }`}>
                                  {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                                </div>
                                <div className="min-w-0">
                                  <p className={`text-[10px] font-black uppercase tracking-wider ${isActive ? "text-slate-300" : "text-slate-500"}`}>
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

                  {managedCourses.length > 0 && activeCurriculumStep > 1 && (
                    <div className={`${curriculumUi.contextBanner} animate-in fade-in duration-200`}>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${getStepTheme(1).chip}`}>
                            <BookOpen className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Module en cours d&apos;édition</p>
                            <h3 className="mt-1 text-base font-black leading-tight text-white">
                              {managedCourse ? managedCourse.title : "Aucun module sélectionné"}
                            </h3>
                            {managedCourse && (
                              <p className="mt-1 text-[11px] text-slate-400">
                                ID {managedCourse.id} · {managedCourse.discipline?.name || managedCourse.category} · {formatCredits(managedCourse.credits)} · {managedCourse.duration}
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
                            onClick={() => setActiveCurriculumStep(1)}
                            className={`rounded-xl px-4 py-2.5 text-xs font-black transition-colors ${getStepTheme(1).button}`}
                          >
                            Changer de module
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {managedCourses.length === 0 && activeCurriculumStep > 1 && (
                    <div className={`${curriculumUi.empty} max-w-xl mx-auto space-y-4 animate-in fade-in duration-200`}>
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-500/30 bg-violet-950/50 text-violet-400">
                        <Sparkles className="h-8 w-8" />
                      </div>
                      <h3 className="text-lg font-black text-white">Commencez par un module</h3>
                      <p className="text-sm text-slate-400 leading-relaxed">
                        Créez votre premier module à l&apos;étape <strong className="text-indigo-400">Modules</strong> avant d&apos;ajouter chapitres, médias ou quiz.
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveCurriculumStep(1)}
                        className={`mx-auto inline-flex rounded-xl px-5 py-2.5 text-xs font-black transition-colors ${getStepTheme(1).button}`}
                      >
                        Aller à l&apos;étape Modules
                      </button>
                    </div>
                  )}

                  {activeCurriculumStep === 1 && (
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

                          <button
                            type="submit"
                            className={curriculumUi.createBtn}
                          >
                            <Plus className="h-4 w-4" />
                            Créer le module
                          </button>
                        </form>
                      </div>

                      <div className="xl:col-span-7 space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className={curriculumUi.sectionTitle}>
                            Vos modules ({managedCourses.length})
                          </h3>
                          <span className={curriculumUi.countBadge}>
                            {managedCourses.length} module{managedCourses.length !== 1 ? "s" : ""}
                          </span>
                        </div>

                        <div className="max-h-[650px] space-y-4 overflow-y-auto pr-1">
                          {managedCourses.length === 0 && (
                            <div className={curriculumUi.empty}>
                              <BookOpen className="mx-auto mb-2 h-8 w-8 text-slate-600" />
                              <p className="text-xs font-semibold text-slate-500">Aucun module lié à ce profil. Créez un module à gauche.</p>
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
                                    <p className="text-[10px] font-black uppercase tracking-wider text-indigo-400">Modifier le module #{course.id}</p>
                                    <span className="rounded bg-slate-800 px-2 py-0.5 text-[9px] font-black text-slate-400">ID {course.id}</span>
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
                                        type="number" min="0"
                                        placeholder="Crédits"
                                        value={editCourseForm.credits}
                                        onChange={(e) => setEditCourseForm((prev) => ({ ...prev, credits: parseInt(e.target.value) || 0 }))}
                                        className={`${curriculumUi.input} ${getStepTheme(1).focus}`}
                                      />
                                    </label>
                                    <label className="space-y-1 block">
                                      <span className="text-[9px] font-bold text-slate-400 uppercase">Prix (DH)</span>
                                      <input
                                        type="number" min="0" step="0.5"
                                        placeholder="Prix"
                                        value={editCourseForm.price}
                                        onChange={(e) => setEditCourseForm((prev) => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                                        className={`${curriculumUi.input} ${getStepTheme(1).focus}`}
                                      />
                                    </label>
                                    <label className="md:col-span-2 space-y-1 block">
                                      <span className="text-[9px] font-bold text-slate-400 uppercase">Discipline</span>
                                      <select
                                        value={editCourseForm.disciplineId}
                                        onChange={(e) => setEditCourseForm((prev) => ({ ...prev, disciplineId: parseInt(e.target.value) }))}
                                        className={`${curriculumUi.input} ${getStepTheme(1).focus} text-slate-700`}
                                      >
                                        {allDisciplines.map((d) => (
                                          <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                      </select>
                                    </label>
                                  </div>
                                  <div className="flex gap-2 pt-1">
                                    <button type="submit" className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-black transition-colors ${getStepTheme(1).button}`}><Save className="h-4 w-4" /> Enregistrer</button>
                                    <button type="button" onClick={() => setEditingCourse(null)} className={curriculumUi.ghostBtn}>Annuler</button>
                                  </div>
                                </form>
                              ) : (
                                <div className="space-y-4">
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-2 min-w-0 flex-1">
                                      <h4 className="text-base font-black text-white leading-snug">{course.title}</h4>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className={`rounded border px-2.5 py-0.5 text-[9px] font-black uppercase ${getStepTheme(1).chip}`}>
                                          {course.discipline?.name || course.category}
                                        </span>
                                        <span className="text-[9px] font-bold text-slate-500">ID {course.id}</span>
                                      </div>
                                      <p className="line-clamp-2 text-xs leading-relaxed text-slate-400">{course.description}</p>
                                    </div>

                                    <span className={publishedBadge(course.published ?? false)}>
                                      <span className={`h-1.5 w-1.5 rounded-full ${course.published ? "bg-emerald-400" : "bg-amber-400"}`} />
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
                                      <button
                                        onClick={() => handleUpdateCourseDetails(course)}
                                        className={curriculumUi.ghostBtn}
                                      >
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
                                      <button
                                        onClick={() => handleDeleteCourse(course)}
                                        className={curriculumUi.dangerBtn}
                                      >
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
                  )}

                  {activeCurriculumStep === 2 && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                      <div className={`lg:col-span-5 ${curriculumUi.panel} ${getStepTheme(2).panel} space-y-5 self-start`}>
                        <div>
                          <h3 className={curriculumUi.panelTitle}>
                            <Plus className="h-5 w-5 text-cyan-400" />
                            Ajouter un chapitre
                          </h3>
                          <p className={curriculumUi.panelSubtitle}>Créez un chapitre de premier niveau pour structurer ce module.</p>
                        </div>

                        <form onSubmit={handleCreateSection} className={`space-y-4 pt-3 ${curriculumUi.divider}`}>
                          <label className="block space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Titre du chapitre</span>
                            <input
                              type="text"
                              required
                              placeholder="ex: Chapitre 1 : Introduction générale"
                              value={!newSectionParentId ? newSectionTitle : ""}
                              onChange={(e) => {
                                setNewSectionMode("chapter");
                                setNewSectionParentId("");
                                setNewSectionTitle(e.target.value);
                              }}
                              className={inputFocus}
                            />
                          </label>

                          <label className={curriculumUi.checkbox}>
                            <input
                              type="checkbox"
                              checked={newSectionPublished}
                              onChange={(e) => setNewSectionPublished(e.target.checked)}
                              className={`h-4 w-4 cursor-pointer accent-indigo-600`}
                            />
                            Publier immédiatement le chapitre
                          </label>

                          <button
                            type="submit"
                            className={`w-full rounded-xl py-3 text-xs font-black shadow-sm transition-colors active:scale-[0.98] ${getStepTheme(2).button}`}
                          >
                            Créer le chapitre
                          </button>
                        </form>
                      </div>

                      {/* Right Panel: Chapters List */}
                      <div className="lg:col-span-7 space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className={curriculumUi.sectionTitle}>
                            Chapitres du module ({chapterSections.length})
                          </h3>
                          <span className={curriculumUi.countBadge}>
                            {chapterSections.length} chapitre{chapterSections.length !== 1 ? "s" : ""}
                          </span>
                        </div>

                        <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                          {chapterSections.length === 0 ? (
                            <div className={curriculumUi.empty}>
                              <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                              <p className="text-xs text-slate-400 font-semibold">Aucun chapitre créé. Utilisez le formulaire à gauche pour commencer.</p>
                            </div>
                          ) : (
                            chapterSections.map((section) => (
                              <div
                                key={section.id}
                                className={`${curriculumUi.card} ${
                                  uploadSectionId === section.id
                                    ? getStepTheme(2).listActive
                                    : curriculumUi.cardHover
                                }`}
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="space-y-1">
                                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                                      Chapitre ID: {section.chapterId} • Section ID: {section.id}
                                    </span>
                                    <h4 className="text-sm font-black text-white">{section.title}</h4>
                                  </div>
                                  <span className={publishedBadge(section.published)}>
                                    {publishedLabel(section.published ?? false)}
                                  </span>
                                </div>

                                <div className={`flex flex-wrap items-center justify-between gap-3 pt-4 ${curriculumUi.divider} mt-4`}>
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      onClick={() => handleUpdateSectionTitle(section)}
                                      className={curriculumUi.ghostBtn}
                                    >
                                      Renommer
                                    </button>
                                    <button
                                      onClick={() => handleToggleSectionPublished(section)}
                                      className={section.published ? curriculumUi.unpublishBtn : `${curriculumUi.ghostBtn} border-cyan-500/30 text-cyan-300`}
                                    >
                                      {section.published ? "Dépublier" : "Publier"}
                                    </button>
                                    <button
                                      onClick={() => handleDeleteSection(section)}
                                      className={curriculumUi.dangerBtn}
                                    >
                                      Supprimer
                                    </button>
                                  </div>

                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => {
                                        handleAddChildSection(section);
                                        setActiveCurriculumStep(3);
                                      }}
                                      className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-[10px] font-black transition-colors ${getStepTheme(3).chip} hover:opacity-90`}
                                    >
                                      <Plus className="w-3 h-3" />
                                      Ajouter partie
                                    </button>
                                    <button
                                      onClick={() => {
                                        handleSetUploadSectionId(section.id);
                                        setActiveCurriculumStep(4);
                                      }}
                                      className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-[10px] font-black text-white transition-colors ${getStepTheme(4).button}`}
                                    >
                                      <Video className="w-3 h-3" />
                                      Médias
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeCurriculumStep === 3 && (
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                      <div className={`xl:col-span-5 ${curriculumUi.panel} ${getStepTheme(3).panel} space-y-5 self-start`}>
                        <div>
                          <h3 className={curriculumUi.panelTitle}>
                            <FolderTree className="h-5 w-5 text-emerald-400" />
                            Ajouter une section
                          </h3>
                          <p className={curriculumUi.panelSubtitle}>Créez des parties et sous-parties pour organiser votre cours.</p>
                        </div>

                        <form onSubmit={handleCreateSection} className={`space-y-4 pt-3 ${curriculumUi.divider}`}>
                          <label className="block space-y-1">
                            <span className={curriculumUi.label}>1. Chapitre parent</span>
                            <select
                              value={selectedChapterId}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSelectedChapterId(val);
                                setSelectedPartieId("");
                                setNewSectionParentId(val);
                                setNewSectionMode(val ? "part" : "chapter");
                              }}
                              className={inputFocus}
                            >
                              <option value="">-- Choisir un chapitre (requis) --</option>
                              {chapterSections.map((section) => (
                                <option key={section.id} value={section.id}>{section.title}</option>
                              ))}
                            </select>
                          </label>

                          <label className="block space-y-1">
                            <span className={curriculumUi.label}>2. Partie parent (optionnelle)</span>
                            <select
                              value={selectedPartieId}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSelectedPartieId(val);
                                setNewSectionParentId(val || selectedChapterId);
                                setNewSectionMode(val ? "subpart" : "part");
                              }}
                              disabled={!selectedChapterId}
                              className={`w-full rounded-xl border border-slate-700 bg-[#090d16] px-3 py-3 text-xs font-semibold text-slate-100 transition-all focus:bg-slate-950 focus:outline-none focus:ring-4 disabled:bg-slate-900 disabled:text-slate-600 ${stepTheme.focus}`}
                            >
                              <option value="">-- Sous-section de chapitre (crée une Partie) --</option>
                              {managedSections.filter((section) => section.parentId === selectedChapterId).map((section) => (
                                <option key={section.id} value={section.id}>{section.title}</option>
                              ))}
                            </select>
                          </label>

                          <label className="block space-y-1">
                            <span className={curriculumUi.label}>Titre de la nouvelle section</span>
                            <input
                              type="text"
                              required
                              placeholder={selectedPartieId ? "ex: Sous-partie B : Modèles avancés" : "ex: Partie 1 : Les bases théoriques"}
                              value={newSectionTitle}
                              onChange={(e) => setNewSectionTitle(e.target.value)}
                              className={inputFocus}
                            />
                          </label>

                          <label className={curriculumUi.checkbox}>
                            <input
                              type="checkbox"
                              checked={newSectionPublished}
                              onChange={(e) => setNewSectionPublished(e.target.checked)}
                              className={`h-4 w-4 cursor-pointer accent-indigo-600`}
                            />
                            Publier immédiatement après création
                          </label>

                          <button
                            type="submit"
                            disabled={!selectedChapterId}
                            className={`w-full rounded-xl py-3 text-xs font-black shadow-sm transition-colors active:scale-[0.98] disabled:scale-100 disabled:opacity-50 ${getStepTheme(3).button}`}
                          >
                            {selectedPartieId ? "Créer la sous-partie" : "Créer la partie"}
                          </button>
                        </form>
                      </div>

                      {/* Right Panel: Outline Hierarchy Tree View */}
                      <div className="xl:col-span-7 space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className={curriculumUi.sectionTitle}>
                            Structure & arborescence du module
                          </h3>
                          <span className={curriculumUi.countBadge}>
                            {managedSections.length} section{managedSections.length !== 1 ? "s" : ""}
                          </span>
                        </div>

                        <div className={curriculumUi.treePanel}>
                          {managedSections.length === 0 ? (
                            <div className="text-center py-8">
                              <FolderTree className="mx-auto mb-2 h-8 w-8 text-emerald-600/60" />
                              <p className="text-xs text-slate-400 font-semibold">Le syllabus est vide. Créez un chapitre à l'étape 2.</p>
                            </div>
                          ) : (
                            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                              {managedSections.map((section) => {
                                const depth = section.depth ?? 0;
                                const indent = depth * 20;
                                const isChapter = !section.parentId;
                                const isPart = depth === 1;
                                const isSubpart = depth === 2;

                                return (
                                  <div
                                    key={section.id}
                                    className={`flex flex-col justify-between gap-3 rounded-2xl border p-3 transition-colors md:flex-row md:items-center ${
                                      uploadSectionId === section.id
                                        ? getStepTheme(3).listActive
                                        : isChapter
                                        ? "border-slate-700 bg-slate-800/60"
                                        : isPart
                                        ? "border-violet-500/20 bg-slate-900/60 shadow-sm"
                                        : "border-cyan-500/20 bg-slate-900/40"
                                    }`}
                                    style={{ marginLeft: `${Math.min(indent, 80)}px` }}
                                  >
                                    <div className="flex items-start gap-2 flex-1 min-w-0">
                                      {depth > 0 && (
                                        <span className="text-slate-300 font-light select-none pt-0.5">└─</span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleSetUploadSectionId(section.id)}
                                        className="text-left flex-1 min-w-0"
                                      >
                                        <div className="flex flex-wrap items-center gap-1.5">
                                          <span className={`shrink-0 rounded px-2 py-0.5 text-[8px] font-black uppercase leading-none ${
                                            isChapter ? curriculumUi.levelChapter : isPart ? curriculumUi.levelPart : curriculumUi.levelSubpart
                                          }`}>
                                            {isChapter ? "Chapitre" : isPart ? "Partie" : "Sous-partie"}
                                          </span>
                                          <span className="text-[9px] text-slate-400 font-bold shrink-0">ID {section.id}</span>
                                        </div>
                                        <p className={`mt-1.5 truncate text-xs text-slate-200 ${isChapter ? "font-black" : "font-bold"}`}>
                                          {section.title}
                                        </p>
                                      </button>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                                      {!isSubpart && (
                                        <button
                                          type="button"
                                          onClick={() => handleAddChildSection(section)}
                                          className={`rounded-xl border p-2 text-[10px] font-bold transition-colors ${getStepTheme(3).chip} hover:opacity-90`}
                                          title="Ajouter sous-partie"
                                        >
                                          <Plus className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleSetUploadSectionId(section.id);
                                          setActiveCurriculumStep(4);
                                        }}
                                        className={`rounded-xl border p-2 text-[10px] font-bold transition-colors ${getStepTheme(4).chip} hover:opacity-90`}
                                        title="Médias"
                                      >
                                        <Video className="w-3.5 h-3.5 text-slate-400" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateSectionTitle(section)}
                                        className={curriculumUi.ghostBtn}
                                      >
                                        Renommer
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleToggleSectionPublished(section)}
                                        className={`${curriculumUi.ghostBtn} ${section.published ? "" : "border-emerald-500/30 bg-emerald-950/40 text-emerald-400"}`}
                                      >
                                        {section.published ? "Masquer" : "Publier"}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteSection(section)}
                                        className={`${curriculumUi.dangerBtn} p-2`}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeCurriculumStep === 4 && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                      <div className={`lg:col-span-5 ${curriculumUi.panel} ${getStepTheme(4).panel} space-y-5 self-start`}>
                        <div>
                          <h3 className={curriculumUi.panelTitle}>
                            <FileText className="h-5 w-5 text-amber-400" />
                            Ajouter des médias
                          </h3>
                          <p className={curriculumUi.panelSubtitle}>Uploadez vidéos, PDF ou images dans la section cible.</p>
                        </div>

                        <form onSubmit={handleUploadLessonAsset} className={`space-y-4 pt-3 ${curriculumUi.divider}`}>
                          {/* Destination Section Selector */}
                          <div className="space-y-1">
                            <span className={curriculumUi.label}>Section cible</span>
                            <select
                              value={uploadSectionId}
                              onChange={(e) => handleSetUploadSectionId(e.target.value)}
                              className={`${inputFocus} text-slate-700`}
                            >
                              <option value="">-- Directement dans le module (racine) --</option>
                              {managedSections.map((section) => (
                                <option key={section.id} value={section.id}>
                                  {`${"— ".repeat(section.depth ?? 0)}${section.title}`}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Cascading selectors */}
                          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-amber-500/20 bg-amber-950/20 p-3">
                            <label className="block space-y-1">
                              <span className="text-[9px] font-black text-slate-400 uppercase">Chapitre</span>
                              <select
                                value={uploadChapterId}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setUploadChapterId(value);
                                  setUploadPartId("");
                                  setUploadSubpartId("");
                                  setUploadSectionId(value);
                                }}
                                className="w-full rounded-xl border border-slate-700 bg-[#090d16] px-2 py-2 text-[11px] text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                              >
                                <option value="">Module uniquement</option>
                                {chapterSections.map((section) => (
                                  <option key={section.id} value={section.id}>{section.title}</option>
                                ))}
                              </select>
                            </label>

                            <label className="block space-y-1">
                              <span className="text-[9px] font-black text-slate-400 uppercase">Partie</span>
                              <select
                                value={uploadPartId}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setUploadPartId(value);
                                  setUploadSubpartId("");
                                  setUploadSectionId(value || uploadChapterId);
                                }}
                                disabled={!uploadChapterId}
                                className="w-full rounded-xl border border-slate-700 bg-[#090d16] px-2 py-2 text-[11px] text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400/30 disabled:bg-slate-900"
                              >
                                <option value="">Partie facultative</option>
                                {uploadPartOptions.map((section) => (
                                  <option key={section.id} value={section.id}>{section.title}</option>
                                ))}
                              </select>
                            </label>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <label className="block space-y-1">
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Type de média</span>
                              <select
                                value={uploadType}
                                onChange={(e) => setUploadType(e.target.value as any)}
                                className={`w-full rounded-xl border border-slate-700 bg-[#090d16] px-3 py-3 text-xs font-semibold text-slate-100 focus:bg-slate-950 focus:outline-none focus:ring-4 ${stepTheme.focus}`}
                              >
                                <option value="VIDEO">Vidéo (.mp4, WebM)</option>
                                <option value="PDF">Document PDF</option>
                                <option value="IMAGE">Image (PNG, JPG, SVG)</option>
                              </select>
                            </label>

                            <label className="block space-y-1">
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Titre visible</span>
                              <input
                                type="text"
                                required
                                placeholder="ex: Tutoriel de programmation"
                                value={uploadTitle}
                                onChange={(e) => setUploadTitle(e.target.value)}
                                className={inputFocus}
                              />
                            </label>
                          </div>

                          {/* Styled File Input Container */}
                          <label className="block space-y-1 cursor-pointer">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Fichier média</span>
                            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-amber-500/30 bg-amber-950/20 p-4 text-center transition-colors hover:bg-amber-950/30 group">
                              <Download className="h-8 w-8 text-amber-400 transition-colors group-hover:text-amber-300" />
                              <div className="text-xs text-slate-400">
                                {uploadFile ? (
                                  <p className="max-w-[280px] truncate font-mono text-[11px] font-bold text-amber-300">
                                    {uploadFile.name} ({(uploadFile.size / (1024 * 1024)).toFixed(2)} Mo)
                                  </p>
                                ) : (
                                  <>
                                    <p className="font-bold text-slate-300">Sélectionnez ou glissez un fichier</p>
                                    <p className="text-[10px] text-slate-500 mt-1">PDF, MP4 ou images uniquement</p>
                                  </>
                                )}
                              </div>
                              <input
                                type="file"
                                required
                                accept={uploadType === "VIDEO" ? "video/*" : uploadType === "PDF" ? "application/pdf" : "image/*"}
                                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                                className="hidden"
                              />
                            </div>
                          </label>

                          <label className={curriculumUi.checkbox}>
                            <input
                              type="checkbox"
                              checked={uploadPublished}
                              onChange={(e) => setUploadPublished(e.target.checked)}
                              className={`h-4 w-4 cursor-pointer accent-indigo-600`}
                            />
                            Publier le média après l'upload
                          </label>

                          <button
                            type="submit"
                            className={`w-full rounded-xl py-3 text-xs font-black shadow-sm transition-colors active:scale-[0.98] ${stepTheme.button}`}
                          >
                            Lancer le téléversement (Upload)
                          </button>

                          {uploadStatusMsg && (
                            <div className="flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-950/40 p-3 text-center text-xs font-bold text-amber-300 animate-pulse">
                              <span className="h-2.5 w-2.5 shrink-0 animate-ping rounded-full bg-amber-400" />
                              {uploadStatusMsg}
                            </div>
                          )}
                        </form>
                      </div>

                      {/* Right Panel: Section Contents List */}
                      <div className="lg:col-span-7 space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className={curriculumUi.sectionTitle}>
                            Médias attachés à la section
                          </h3>
                          <span className={curriculumUi.countBadge}>
                            {selectedManagedContents.length} média{selectedManagedContents.length !== 1 ? "s" : ""}
                          </span>
                        </div>

                        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                          {selectedManagedContents.length === 0 ? (
                            <div className={curriculumUi.empty}>
                              <FileText className="mx-auto mb-2 h-8 w-8 text-amber-300" />
                              <p className="text-xs font-semibold text-slate-500">
                                {uploadSectionId ? "Aucun média attaché à cette section." : "Aucun média attaché directement à la racine du module."}
                              </p>
                            </div>
                          ) : (
                            selectedManagedContents.map((content) => {
                              const attachment = content.attachments?.[0];
                              return (
                                <div key={content.id} className={`${curriculumUi.card} space-y-4`}>
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className={`rounded px-2 py-0.5 text-[8px] font-black uppercase ${
                                          content.type === "VIDEO" ? curriculumUi.mediaVideo : content.type === "PDF" ? curriculumUi.mediaPdf : curriculumUi.mediaImage
                                        }`}>
                                          {content.type}
                                        </span>
                                        <span className="text-[9px] text-slate-400 font-bold">ID: {content.id}</span>
                                      </div>
                                      <h4 className="text-sm font-black text-white leading-snug">{content.title}</h4>
                                      {attachment?.fileName && (
                                        <p className="max-w-md truncate font-mono text-[11px] text-slate-500">{attachment.fileName}</p>
                                      )}
                                    </div>

                                    <span className={publishedBadge(content.published)}>
                                      {publishedLabel(content.published ?? false)}
                                    </span>
                                  </div>

                                  {/* Preview */}
                                  {attachment?.url && (
                                    <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/60 p-2">
                                      {content.type === "IMAGE" && (
                                        <img src={attachment.url} alt={content.title} className="w-full max-h-48 object-contain rounded-xl bg-slate-950" />
                                      )}
                                      {content.type === "VIDEO" && (
                                        <PremiumVideoPlayer
                                          src={attachment.url}
                                          title={content.title}
                                          instructor={managedCourse?.instructor ?? "Professeur"}
                                          activeSector="teacher"
                                        />
                                      )}
                                      {content.type === "PDF" && (
                                        <div className="py-6 flex flex-col items-center justify-center gap-2">
                                          <FileText className="h-12 w-12 text-red-500" />
                                          <p className="text-[11px] font-bold text-slate-600">Document PDF attaché</p>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  <div className={`flex flex-wrap gap-2 pt-3 ${curriculumUi.divider}`}>
                                    {attachment?.url && (
                                      <a
                                        href={attachment.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={curriculumUi.ghostBtn}
                                      >
                                        Ouvrir le fichier
                                      </a>
                                    )}
                                    <button
                                      onClick={() => handleToggleContentPublished(content)}
                                      className={`${curriculumUi.ghostBtn} ${content.published ? "" : "border-emerald-500/30 bg-emerald-950/40 text-emerald-400 hover:bg-emerald-950/60"}`}
                                    >
                                      {content.published ? "Dépublier" : "Publier"}
                                    </button>
                                    <button
                                      onClick={() => handleDeleteLessonContent(content)}
                                      className="px-3.5 py-2 text-[10px] font-black rounded-xl bg-red-950/50 border border-red-500/30 text-red-400 hover:bg-red-950/70 ml-auto"
                                    >
                                      Supprimer média
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeCurriculumStep === 5 && (
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
                            <div className={`p-3 border text-xs font-semibold rounded-xl animate-in fade-in duration-200 ${
                              quizManagerError ? curriculumUi.alertError : curriculumUi.alertSuccess
                            }`}>
                              {quizManagerError || quizManagerMsg}
                            </div>
                          )}

                          <form onSubmit={handleCreateQuiz} className="space-y-4">
                            {/* Target Section Selector */}
                            <div className="space-y-1">
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Section de rattachement</span>
                              <select
                                value={quizSubpartId || quizPartId || quizChapterId || ""}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (!value) {
                                    setQuizChapterId("");
                                    setQuizPartId("");
                                    setQuizSubpartId("");
                                  } else {
                                    const section = managedSections.find(s => s.id === value);
                                    if (section) {
                                      if (!section.parentId) {
                                        setQuizChapterId(section.id);
                                        setQuizPartId("");
                                        setQuizSubpartId("");
                                      } else {
                                        const parent = managedSections.find(s => s.id === section.parentId);
                                        if (parent && !parent.parentId) {
                                          setQuizChapterId(parent.id);
                                          setQuizPartId(section.id);
                                          setQuizSubpartId("");
                                        } else if (parent && parent.parentId) {
                                          const grandparent = managedSections.find(s => s.id === parent.parentId);
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
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Titre du Quiz</span>
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
                            <h3 className={curriculumUi.sectionTitle}>
                              Quiz du module ({teacherQuizzes.length})
                            </h3>
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
                                <p className="text-xs text-slate-400 font-semibold">Aucun quiz créé. Utilisez le formulaire ci-dessus.</p>
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
                                      <span className={`rounded border px-1.5 py-0.5 text-[8px] font-black uppercase ${getStepTheme(5).chip}`}>
                                        {quiz.questions?.length || 0} question(s)
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
                                <h3 className="text-sm font-black uppercase tracking-wider text-white">
                                  Ajouter une question
                                </h3>
                                <p className="mt-1 text-xs font-medium text-slate-500">
                                  Quiz : <span className="font-bold text-violet-400">{teacherQuizzes.find(q => q.id === selectedQuizId)?.title}</span>
                                </p>
                              </div>

                              <form onSubmit={handleAddQuestion} className={`space-y-4 pt-3 ${curriculumUi.divider}`}>
                                <label className="block space-y-1">
                                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Énoncé de la question</span>
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
                                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block font-semibold">Options de réponses</span>
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
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Bonne réponse</span>
                                    <select
                                      value={newQuestionAnswer}
                                      onChange={(e) => setNewQuestionAnswer(e.target.value)}
                                      required
                                      className={`${inputFocus} text-slate-700`}
                                    >
                                      <option value="">-- Choisir la bonne option --</option>
                                      {newQuestionOptions.filter(o => o.trim()).map((o, idx) => (
                                        <option key={idx} value={o}>{`Option ${String.fromCharCode(65 + idx)}: ${o}`}</option>
                                      ))}
                                    </select>
                                  </label>

                                  <label className="block space-y-1">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Explication didactique</span>
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
                                Questions du Quiz ({ (teacherQuizzes.find(q => q.id === selectedQuizId)?.questions || []).length })
                              </h3>

                              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                                {(teacherQuizzes.find(q => q.id === selectedQuizId)?.questions || []).map((q: any, idx: number) => (
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
                                          <div key={optIdx} className={`p-2 rounded-xl flex items-center gap-1.5 border ${
                                            isCorrect ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-300" : "border-slate-700 bg-slate-900/60 text-slate-500"
                                          }`}>
                                            <span className={`w-4 h-4 rounded text-[9px] font-black flex items-center justify-center shrink-0 ${
                                              isCorrect ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400"
                                            }`}>
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

                                {(teacherQuizzes.find(q => q.id === selectedQuizId)?.questions?.length === 0) && (
                                  <div className={`${curriculumUi.empty} p-6`}>
                                    <p className="text-xs text-slate-400 font-semibold">Aucune question dans ce quiz. Ajoutez-en avec le formulaire.</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className={`${curriculumUi.panel} flex h-full flex-col items-center justify-center gap-2 py-16 text-center`}>
                            <HelpCircle className="h-10 w-10 text-violet-500/50" />
                            <h4 className="text-sm font-black text-slate-200">Aucun quiz sélectionné</h4>
                            <p className="text-xs text-slate-400 font-medium max-w-xs leading-relaxed">
                              Sélectionnez un quiz existant dans la colonne de gauche ou créez-en un nouveau pour commencer à y insérer des questions.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
  );
}
