import { useCallback, useEffect, useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { getClientErrorMessage } from "../client-errors";
import {
  bindUploadProgress,
  formatUploadProgressLabel,
  getUploadedFileCustomId,
  getUploadedFileUrl,
  uploadFiles,
  getUploadErrorMessage,
  validateUploadFile,
} from "../uploadthing-client";
import { api, getFreshSessionToken } from "../api";
import type { AppUser } from "../components/AuthScreen";
import type { Course, ContentSection, FacultyDomain, LessonContent } from "../types";
import {
  MIN_PAID_COURSE_PRICE,
  freeAccessDurationInputValue,
  getFreeAccessWindowEndDate,
  isFreeCoursePrice,
  normalizeCoursePriceForSave,
  normalizeFreeAccessDurationDays,
} from "../utils/course-pricing";
import {
  datetimeLocalToIso,
  defaultFreeAccessEndFromStart,
  formatDatetimeLocalValue,
} from "../utils/free-access-datetime";
import { integerFromNumericInput, numberFromNumericInput, numericInputFromNumber } from "../utils/numeric-input";
import { flattenSections } from "./useCourseContent";
import { isLiveReplayContent } from "../live/live-replay";
import { useAsyncEffectGuard, type AsyncRequestToken } from "./useAsyncEffectGuard";
import { useAutoClearTimeout } from "./useAutoClearTimeout";

type Discipline = FacultyDomain["disciplines"][number];

export interface TeacherCurriculumCourseContent {
  courseContentSections: ContentSection[];
  setCourseContentSections: Dispatch<SetStateAction<ContentSection[]>>;
  moduleRootContents: LessonContent[];
  setModuleRootContents: Dispatch<SetStateAction<LessonContent[]>>;
  flattenSections: typeof flattenSections;
  refreshCourseContent: (courseId: number) => Promise<ContentSection[]>;
}

export interface UseTeacherCurriculumOptions {
  courses: Course[];
  setCourses: Dispatch<SetStateAction<Course[]>>;
  managedCourses: Course[];
  managedCourseIds: string;
  allDisciplines: Discipline[];
  currentUser: AppUser | null;
  role: string;
  courseContent: TeacherCurriculumCourseContent;
}

async function uploadCourseImage(
  courseId: number,
  file: File,
  setStatus: Dispatch<SetStateAction<string>>,
): Promise<Course> {
  const token = await getFreshSessionToken();
  if (!token) throw new Error("Session expirée ou non autorisée.");

  const uploadedFiles = await (uploadFiles as any)("courseImage", {
    files: [file],
    input: { courseId },
    headers: { Authorization: `Bearer ${token}` },
    onUploadProgress: bindUploadProgress((progress) =>
      setStatus(`Téléversement : ${formatUploadProgressLabel(progress)}`),
    ),
  });
  const uploadedFile = uploadedFiles?.[0];
  const imageUrl = getUploadedFileUrl(uploadedFile);
  const customId = getUploadedFileCustomId(uploadedFile);
  if (!imageUrl || !customId) throw new Error("La confirmation de l'image téléversée est introuvable.");

  setStatus("Confirmation de l'image en cours...");
  const confirmedCourse = await api.confirmCourseImage(courseId, customId);
  if (!confirmedCourse?.imageUrl) throw new Error("L'image n'a pas été confirmée par le serveur.");
  return confirmedCourse as Course;
}

export function useTeacherCurriculum({
  setCourses,
  managedCourses,
  managedCourseIds,
  allDisciplines,
  currentUser,
  role,
  courseContent,
}: UseTeacherCurriculumOptions) {
  const {
    setCourseContentSections,
    setModuleRootContents,
    flattenSections: flattenSectionsFn,
    refreshCourseContent,
  } = courseContent;

  const [activeCurriculumStep, setActiveCurriculumStep] = useState<number>(1);
  const [quizChapterId, setQuizChapterId] = useState<string>("");
  const [curriculumSuccessMsg, setCurriculumSuccessMsg] = useState("");
  const [curriculumErrorMsg, setCurriculumErrorMsg] = useState("");
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [newCourseDescription, setNewCourseDescription] = useState("");
  const [newCourseImageFile, setNewCourseImageFile] = useState<File | null>(null);
  const [newCourseImageStatus, setNewCourseImageStatus] = useState("");
  const [newCourseDisciplineId, setNewCourseDisciplineId] = useState(0);
  const [newCourseLevel, _setNewCourseLevel] = useState("Licence 1");
  const [newCourseCredits, setNewCourseCredits] = useState(numericInputFromNumber(3));
  const [newCourseDuration, setNewCourseDuration] = useState("20 heures");
  const [newCoursePrice, setNewCoursePrice] = useState(numericInputFromNumber(0));
  const [newCourseIsFree, setNewCourseIsFree] = useState(true);
  const [newCourseFreeAccessStartsAt, setNewCourseFreeAccessStartsAt] = useState(formatDatetimeLocalValue(null));
  const [newCourseFreeAccessEndsAt, setNewCourseFreeAccessEndsAt] = useState(() =>
    defaultFreeAccessEndFromStart(formatDatetimeLocalValue(null)),
  );
  const [newCourseFreeAccessDurationDays, setNewCourseFreeAccessDurationDays] = useState("");
  const [newCoursePublished, setNewCoursePublished] = useState(true);
  const [newSectionCourseId, setNewSectionCourseId] = useState<number>(1);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newSectionPublished, setNewSectionPublished] = useState(true);
  const [uploadCourseId, setUploadCourseId] = useState<number>(1);
  const [uploadSectionId, setUploadSectionId] = useState("");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadType, setUploadType] = useState<"VIDEO" | "PDF" | "IMAGE">("VIDEO");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPublished, setUploadPublished] = useState(true);
  const [uploadStatusMsg, setUploadStatusMsg] = useState("");
  const [uploadStatusKind, setUploadStatusKind] = useState<"idle" | "progress" | "success" | "error">("idle");
  const [isUploadingLessonAsset, setIsUploadingLessonAsset] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editCourseImageFile, setEditCourseImageFile] = useState<File | null>(null);
  const [editCourseImageStatus, setEditCourseImageStatus] = useState("");
  const [editCourseForm, setEditCourseForm] = useState({
    title: "",
    description: "",
    level: "",
    duration: "",
    credits: "",
    disciplineId: 0,
    price: "",
    isFree: true,
    freeAccessStartsAt: "",
    freeAccessEndsAt: "",
    freeAccessDurationDays: "",
  });
  const [teacherQuizzes, setTeacherQuizzes] = useState<any[]>([]);
  const [selectedQuizDetail, setSelectedQuizDetail] = useState<any | null>(null);
  const [quizCourseId, setQuizCourseId] = useState<number>(1);
  const [newQuizTitle, setNewQuizTitle] = useState("");
  const [selectedQuizId, setSelectedQuizId] = useState<string>("");
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionOptions, setNewQuestionOptions] = useState(["Choix 1", "Choix 2", "Choix 3", "Choix 4"]);
  const [newQuestionAnswer, setNewQuestionAnswer] = useState("");
  const [newQuestionExplanation, setNewQuestionExplanation] = useState("");
  const [quizManagerMsg, setQuizManagerMsg] = useState("");
  const [quizManagerError, setQuizManagerError] = useState("");
  const quizStep = currentUser?.role === "ADMIN" ? 6 : 4;

  const { startRequest } = useAsyncEffectGuard();
  const scheduleClear = useAutoClearTimeout();
  const disciplineIdsKey = useMemo(() => allDisciplines.map((discipline) => discipline.id).join(","), [allDisciplines]);

  const showCurriculumSuccess = useCallback(
    (message: string) => {
      setCurriculumErrorMsg("");
      setCurriculumSuccessMsg(message);
      scheduleClear(() => setCurriculumSuccessMsg(""), 6500);
    },
    [scheduleClear],
  );

  const showCurriculumError = useCallback(
    (message: string) => {
      if (!message.trim()) return;
      setCurriculumSuccessMsg("");
      setCurriculumErrorMsg(message);
      scheduleClear(() => setCurriculumErrorMsg(""), 8500);
    },
    [scheduleClear],
  );

  const loadTeacherQuizzes = useCallback(
    async (courseId?: number, request?: AsyncRequestToken) => {
      const active = request ?? startRequest();
      const targetCourseId = courseId ?? quizCourseId;
      if (!targetCourseId) return;
      try {
        const quizList = await api.getCourseQuizzes(targetCourseId);
        if (request && !active.isActive()) return;
        setTeacherQuizzes(quizList);
        if (selectedQuizId && !quizList.some((q: any) => q.id === selectedQuizId)) {
          setSelectedQuizId("");
        } else if (quizList.length === 0) {
          setSelectedQuizId("");
        }
      } catch (err: any) {
        if (request && !active.isActive()) return;
        console.error("Failed to load quizzes:", err);
        setTeacherQuizzes([]);
      }
    },
    [selectedQuizId, quizCourseId, startRequest],
  );

  const loadSelectedQuizDetail = useCallback(
    async (quizId?: string, request?: AsyncRequestToken) => {
      const active = request ?? startRequest();
      const targetQuizId = quizId ?? selectedQuizId;
      if (!targetQuizId) {
        setSelectedQuizDetail(null);
        return;
      }
      try {
        const quiz = await api.getQuizById(targetQuizId);
        if (request && !active.isActive()) return;
        setSelectedQuizDetail(quiz);
      } catch (err: any) {
        if (request && !active.isActive()) return;
        console.error("Failed to load quiz detail:", err);
        setSelectedQuizDetail(null);
      }
    },
    [selectedQuizId, startRequest],
  );

  useEffect(() => {
    if (role !== "teacher" || activeCurriculumStep !== quizStep || !selectedQuizId) {
      setSelectedQuizDetail(null);
      return;
    }
    const request = startRequest();
    void loadSelectedQuizDetail(selectedQuizId, request);
  }, [role, activeCurriculumStep, quizStep, selectedQuizId, loadSelectedQuizDetail, startRequest]);

  useEffect(() => {
    if (allDisciplines.length === 0) {
      if (newCourseDisciplineId !== 0) setNewCourseDisciplineId(0);
      return;
    }
    if (!allDisciplines.some((discipline) => discipline.id === newCourseDisciplineId)) {
      setNewCourseDisciplineId(allDisciplines[0].id);
    }
  }, [disciplineIdsKey, allDisciplines, newCourseDisciplineId]);

  useEffect(() => {
    if (role !== "teacher") return;
    if (managedCourses.length === 0) {
      setCourseContentSections([]);
      setModuleRootContents([]);
      setUploadSectionId("");
      return;
    }
    if (!managedCourses.some((course) => course.id === newSectionCourseId)) {
      const firstManagedCourseId = managedCourses[0].id;
      setNewSectionCourseId(firstManagedCourseId);
      setUploadCourseId(firstManagedCourseId);
      setQuizCourseId(firstManagedCourseId);
    }
  }, [role, managedCourseIds, newSectionCourseId, managedCourses, setCourseContentSections, setModuleRootContents]);

  useEffect(() => {
    if (role !== "teacher" || activeCurriculumStep !== quizStep || !quizCourseId) return;
    const request = startRequest();
    void loadTeacherQuizzes(quizCourseId, request);
  }, [role, activeCurriculumStep, quizStep, quizCourseId, loadTeacherQuizzes, startRequest]);

  useEffect(() => {
    if (!currentUser || role === "student") return;
    if (!managedCourses.some((course) => course.id === newSectionCourseId)) {
      setCourseContentSections([]);
      setModuleRootContents([]);
      return;
    }
    const request = startRequest();
    void refreshCourseContent(newSectionCourseId).then((sections) => {
      if (!request.isActive()) return;
      const flat = flattenSectionsFn(sections);
      const chapters = flat.filter((section) => !section.parentId);
      if (
        uploadCourseId === newSectionCourseId &&
        uploadSectionId &&
        !chapters.some((chapter) => chapter.id === uploadSectionId)
      ) {
        setUploadSectionId("");
      }
    });
  }, [
    newSectionCourseId,
    currentUser?.id,
    role,
    managedCourseIds,
    managedCourses,
    refreshCourseContent,
    flattenSectionsFn,
    setCourseContentSections,
    setModuleRootContents,
    uploadCourseId,
    uploadSectionId,
    startRequest,
  ]);

  const handleCreateCourse = async (e: FormEvent) => {
    e.preventDefault();
    if (!newCourseTitle.trim()) return;
    if (newCourseImageFile) {
      const validationError = validateUploadFile(newCourseImageFile, "IMAGE");
      if (validationError) {
        setNewCourseImageStatus(validationError);
        showCurriculumError(validationError);
        return;
      }
    }
    const discipline = allDisciplines.find((item) => item.id === newCourseDisciplineId);
    if (!discipline) {
      showCurriculumError("Choisissez un sous-domaine valide avant de créer le module.");
      return;
    }

    try {
      const course = await api.createCourse({
        title: newCourseTitle,
        level: newCourseLevel || "Licence 1",
        credits: integerFromNumericInput(newCourseCredits, 0),
        duration: newCourseDuration.trim() || "20 heures",
        category: discipline.name,
        disciplineId: discipline.id,
        price: normalizeCoursePriceForSave(
          newCourseIsFree,
          numberFromNumericInput(newCoursePrice, MIN_PAID_COURSE_PRICE),
        ),
        freeAccessStartsAt: newCourseIsFree
          ? (datetimeLocalToIso(newCourseFreeAccessStartsAt) ?? new Date().toISOString())
          : null,
        freeAccessEndsAt: newCourseIsFree
          ? (datetimeLocalToIso(newCourseFreeAccessEndsAt) ?? new Date(Date.now() + 30 * 86400000).toISOString())
          : null,
        freeAccessDurationDays: newCourseIsFree
          ? normalizeFreeAccessDurationDays(newCourseFreeAccessDurationDays)
          : null,
        instructor: currentUser?.fullName,
        description: newCourseDescription,
        published: newCoursePublished,
      });
      const normalizedCourse: Course = {
        ...course,
        createdById: course.createdById ?? currentUser?.id ?? null,
        instructor: course.instructor || currentUser?.fullName || "",
      };
      setCourses((prev) => [...prev.filter((item) => item.id !== normalizedCourse.id), normalizedCourse]);

      let imageUploadFailed = false;
      if (newCourseImageFile) {
        try {
          setNewCourseImageStatus("Téléversement de l'image en cours...");
          const confirmedCourse = await uploadCourseImage(
            normalizedCourse.id,
            newCourseImageFile,
            setNewCourseImageStatus,
          );
          normalizedCourse.imageUrl = confirmedCourse.imageUrl;
          setCourses((prev) => prev.map((item) => (item.id === normalizedCourse.id ? normalizedCourse : item)));
          setNewCourseImageStatus("Image du module enregistrée.");
        } catch (err) {
          imageUploadFailed = true;
          const message = getUploadErrorMessage(err);
          setNewCourseImageStatus(message);
          showCurriculumError(`Le module a été créé, mais son image n'a pas pu être enregistrée. ${message}`);
        }
      }
      setNewSectionCourseId(normalizedCourse.id);
      setUploadCourseId(normalizedCourse.id);
      setUploadSectionId("");
      setNewCourseTitle("");
      setNewCourseDescription("");
      setNewCourseImageFile(null);
      setNewCourseFreeAccessStartsAt(formatDatetimeLocalValue(null));
      setNewCourseFreeAccessEndsAt(defaultFreeAccessEndFromStart(formatDatetimeLocalValue(null)));
      setNewCourseFreeAccessDurationDays("");
      setCourseContentSections([]);
      setModuleRootContents([]);
      if (!imageUploadFailed) {
        showCurriculumSuccess(`Module « ${normalizedCourse.title} » créé avec succès.`);
      }
    } catch (err: any) {
      console.error("Failed to create course:", err);
      showCurriculumError(getClientErrorMessage(err, "Création du module impossible."));
    }
  };

  const handleCreateChapter = async (e: FormEvent) => {
    e.preventDefault();
    if (!newSectionTitle.trim()) return;

    try {
      const result = await api.createChapter(newSectionCourseId, {
        title: newSectionTitle,
        published: newSectionPublished,
      });
      await refreshCourseContent(newSectionCourseId);
      setUploadCourseId(newSectionCourseId);
      setUploadSectionId(result.section?.id || "");
      setNewSectionTitle("");
      showCurriculumSuccess("Chapitre créé avec succès.");
    } catch (err: any) {
      console.error("Failed to create chapter:", err);
      showCurriculumError(getClientErrorMessage(err, "Création du chapitre impossible."));
    }
  };

  const handleUploadLessonAsset = async (e: FormEvent) => {
    e.preventDefault();
    if (isUploadingLessonAsset) return;
    const token = await getFreshSessionToken();
    if (!uploadFile || !uploadTitle.trim()) {
      setUploadStatusMsg("Sélectionnez un titre et un fichier.");
      setUploadStatusKind("error");
      return;
    }
    if (!token) {
      setUploadStatusMsg("Session expirée. Reconnectez-vous puis réessayez.");
      setUploadStatusKind("error");
      return;
    }

    const validationError = validateUploadFile(uploadFile, uploadType);
    if (validationError) {
      setUploadStatusMsg(validationError);
      setUploadStatusKind("error");
      showCurriculumError(validationError);
      return;
    }

    const intent = {
      courseId: uploadCourseId,
      sectionId: uploadSectionId || null,
      title: uploadTitle.trim(),
      contentType: uploadType,
      published: uploadPublished,
      fileName: uploadFile.name,
      mimeType: uploadFile.type,
      size: uploadFile.size,
    };

    setIsUploadingLessonAsset(true);
    setUploadStatusKind("progress");
    try {
      setUploadStatusMsg("Téléversement en cours...");
      const uploadedFiles = await (uploadFiles as any)("lessonAsset", {
        files: [uploadFile],
        input: {
          courseId: intent.courseId,
          sectionId: intent.sectionId,
          title: intent.title,
          contentType: intent.contentType,
          published: intent.published,
        },
        headers: { Authorization: `Bearer ${token}` },
        onUploadProgress: bindUploadProgress((progress) =>
          setUploadStatusMsg(`Téléversement : ${formatUploadProgressLabel(progress)}`),
        ),
      });
      const customId = getUploadedFileCustomId(uploadedFiles?.[0]);
      if (!customId) throw new Error("La confirmation du média téléversé est introuvable.");

      setUploadStatusMsg("Confirmation et enregistrement en cours...");
      const { courseId, ...confirmationIntent } = intent;
      const confirmedContent = await api.confirmLessonAsset(courseId, { customId, ...confirmationIntent });
      if (!confirmedContent?.id) throw new Error("Le média n'a pas été confirmé par le serveur.");

      await refreshCourseContent(intent.courseId);
      setUploadFile(null);
      setUploadTitle("");
      setUploadStatusMsg("Média enregistré durablement et visible après actualisation.");
      setUploadStatusKind("success");
      showCurriculumSuccess("Média enregistré avec succès.");
    } catch (err: any) {
      console.error("Failed to upload lesson asset:", err);
      const message = getUploadErrorMessage(err);
      setUploadStatusMsg(message);
      setUploadStatusKind("error");
      showCurriculumError(message);
    } finally {
      setIsUploadingLessonAsset(false);
    }
  };

  const handleSelectManagedCourse = async (courseId: number) => {
    setNewSectionCourseId(courseId);
    setUploadCourseId(courseId);
    setQuizCourseId(courseId);
    setUploadSectionId("");
    await refreshCourseContent(courseId);
  };

  const [editingQuestionId, setEditingQuestionId] = useState<string>("");

  const handleCreateQuiz = async (e?: FormEvent | string) => {
    if (e && typeof e === "object" && "preventDefault" in e) {
      e.preventDefault();
    }
    const autoTitle =
      typeof e === "string" && e.trim() ? e.trim() : newQuizTitle.trim() || `Quiz ${teacherQuizzes.length + 1}`;
    const resolvedSectionId = quizChapterId || null;
    try {
      setQuizManagerError("");
      const quiz = await api.createCourseQuiz(quizCourseId, {
        sectionId: resolvedSectionId,
        title: autoTitle,
        published: true,
      });
      setNewQuizTitle("");
      setQuizChapterId("");
      await loadTeacherQuizzes(quizCourseId);
      setSelectedQuizId(quiz.id);
      setQuizManagerMsg(`Quiz créé : "${quiz.title}"`);
      scheduleClear(() => setQuizManagerMsg(""), 5000);
    } catch (err: any) {
      setQuizManagerError(getClientErrorMessage(err, "Création du quiz impossible."));
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!window.confirm("Voulez-vous vraiment supprimer ce quiz et toutes ses questions ?")) return;
    try {
      setQuizManagerError("");
      await api.deleteQuiz(quizId);
      if (selectedQuizId === quizId) {
        setSelectedQuizId("");
        setSelectedQuizDetail(null);
      }
      await loadTeacherQuizzes(quizCourseId);
      setQuizManagerMsg("Quiz supprimé avec succès.");
      scheduleClear(() => setQuizManagerMsg(""), 4000);
    } catch (err: any) {
      setQuizManagerError(getClientErrorMessage(err, "Suppression du quiz impossible."));
    }
  };

  const handleUpdateQuizTitle = async (quiz: { id: string; title: string }) => {
    const updatedTitle = window.prompt("Nouveau nom du quiz :", quiz.title);
    if (updatedTitle === null || !updatedTitle.trim() || updatedTitle.trim() === quiz.title) return;
    try {
      setQuizManagerError("");
      await api.updateQuiz(quiz.id, { title: updatedTitle.trim() });
      await loadTeacherQuizzes(quizCourseId);
      if (selectedQuizId === quiz.id) {
        await loadSelectedQuizDetail(quiz.id);
      }
      setQuizManagerMsg(`Quiz renommé : "${updatedTitle.trim()}"`);
      scheduleClear(() => setQuizManagerMsg(""), 4000);
    } catch (err: any) {
      setQuizManagerError(getClientErrorMessage(err, "Modification du quiz impossible."));
    }
  };

  const handleAddQuestion = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedQuizId || !newQuestionText.trim() || !newQuestionAnswer.trim() || !newQuestionExplanation.trim()) {
      setQuizManagerError("Tous les champs du QCM sont requis.");
      return;
    }
    const filledOptions = newQuestionOptions.filter((o) => o.trim());
    if (filledOptions.length < 2) {
      setQuizManagerError("Au moins 2 options de réponse sont requises.");
      return;
    }
    const selectedAnswerList = newQuestionAnswer
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);
    if (selectedAnswerList.length === 0 || !selectedAnswerList.every((ans) => filledOptions.includes(ans))) {
      setQuizManagerError("Chaque bonne réponse doit correspondre à l'une des options renseignées.");
      return;
    }
    try {
      setQuizManagerError("");
      let savedQcm: any = null;
      if (editingQuestionId) {
        savedQcm = await api.updateQuizQuestion(editingQuestionId, {
          question: newQuestionText.trim(),
          options: filledOptions,
          answer: newQuestionAnswer.trim(),
          explanation: newQuestionExplanation.trim(),
        });
        setQuizManagerMsg("QCM mis à jour avec succès.");
      } else {
        savedQcm = await api.addQuizQuestion(selectedQuizId, {
          question: newQuestionText.trim(),
          options: filledOptions,
          answer: newQuestionAnswer.trim(),
          explanation: newQuestionExplanation.trim(),
        });
        setQuizManagerMsg("QCM ajouté avec succès.");
      }

      if (savedQcm) {
        setSelectedQuizDetail((prev: any) => {
          if (!prev) return prev;
          const currentQuestions = Array.isArray(prev.questions) ? prev.questions : [];
          if (editingQuestionId) {
            return {
              ...prev,
              questions: currentQuestions.map((q: any) => (q.id === editingQuestionId ? savedQcm : q)),
            };
          } else {
            return {
              ...prev,
              questions: [...currentQuestions, savedQcm],
            };
          }
        });

        setTeacherQuizzes((prevList: any[]) =>
          prevList.map((quiz) => {
            if (quiz.id !== selectedQuizId) return quiz;
            const currentCount = quiz.questionCount ?? quiz.questions?.length ?? 0;
            return {
              ...quiz,
              questionCount: editingQuestionId ? currentCount : currentCount + 1,
            };
          }),
        );
      }

      setEditingQuestionId("");
      setNewQuestionText("");
      setNewQuestionOptions(["Choix 1", "Choix 2", "Choix 3", "Choix 4"]);
      setNewQuestionAnswer("");
      setNewQuestionExplanation("");
      await loadTeacherQuizzes(quizCourseId);
      await loadSelectedQuizDetail(selectedQuizId);
      scheduleClear(() => setQuizManagerMsg(""), 4000);
    } catch (err: any) {
      setQuizManagerError(getClientErrorMessage(err, "Enregistrement du QCM impossible."));
    }
  };

  const handleStartEditQuestion = (q: any) => {
    setEditingQuestionId(q.id);
    setNewQuestionText(q.question || "");
    const options =
      Array.isArray(q.options) && q.options.length > 0 ? q.options : ["Choix 1", "Choix 2", "Choix 3", "Choix 4"];
    setNewQuestionOptions(options);
    setNewQuestionAnswer(q.answer || "");
    setNewQuestionExplanation(q.explanation || "");
  };

  const handleCancelEditQuestion = () => {
    setEditingQuestionId("");
    setNewQuestionText("");
    setNewQuestionOptions(["Choix 1", "Choix 2", "Choix 3", "Choix 4"]);
    setNewQuestionAnswer("");
    setNewQuestionExplanation("");
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!window.confirm("Supprimer ce QCM ?")) return;
    try {
      await api.deleteQuizQuestion(questionId);
      setSelectedQuizDetail((prev: any) => {
        if (!prev) return prev;
        const currentQuestions = Array.isArray(prev.questions) ? prev.questions : [];
        return {
          ...prev,
          questions: currentQuestions.filter((q: any) => q.id !== questionId),
        };
      });
      setTeacherQuizzes((prevList: any[]) =>
        prevList.map((quiz) => {
          if (quiz.id !== selectedQuizId) return quiz;
          const currentCount = quiz.questionCount ?? quiz.questions?.length ?? 1;
          return {
            ...quiz,
            questionCount: Math.max(0, currentCount - 1),
          };
        }),
      );
      await loadTeacherQuizzes(quizCourseId);
      await loadSelectedQuizDetail(selectedQuizId);
      setQuizManagerMsg("QCM supprimé.");
      scheduleClear(() => setQuizManagerMsg(""), 3000);
    } catch (err: any) {
      setQuizManagerError(getClientErrorMessage(err, "Suppression du QCM impossible."));
    }
  };

  const handleUpdateCourseDetails = (course: Course) => {
    setEditingCourse(course);
    setEditCourseImageFile(null);
    setEditCourseImageStatus("");
    setEditCourseForm({
      title: course.title,
      description: course.description,
      level: course.level,
      duration: course.duration,
      credits: numericInputFromNumber(course.credits),
      disciplineId: course.disciplineId ?? allDisciplines[0]?.id ?? 0,
      price: numericInputFromNumber(isFreeCoursePrice(course.price) ? MIN_PAID_COURSE_PRICE : course.price),
      isFree: isFreeCoursePrice(course.price),
      freeAccessStartsAt: formatDatetimeLocalValue(course.freeAccessStartsAt),
      freeAccessEndsAt: formatDatetimeLocalValue(
        course.freeAccessEndsAt ?? getFreeAccessWindowEndDate(course.freeAccessStartsAt, course.freeAccessDurationDays),
      ),
      freeAccessDurationDays: freeAccessDurationInputValue(course.freeAccessDurationDays),
    });
  };

  const handleSaveEditCourse = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingCourse) return;
    if (!editCourseForm.title.trim()) {
      showCurriculumError("Le titre du module est obligatoire.");
      return;
    }
    if (editCourseImageFile) {
      const validationError = validateUploadFile(editCourseImageFile, "IMAGE");
      if (validationError) {
        setEditCourseImageStatus(validationError);
        showCurriculumError(validationError);
        return;
      }
    }
    try {
      let updatedCourse = await api.updateCourseDetails(editingCourse.id, {
        title: editCourseForm.title.trim(),
        description: editCourseForm.description.trim(),
        level: editCourseForm.level.trim(),
        duration: editCourseForm.duration.trim(),
        credits: integerFromNumericInput(editCourseForm.credits, 0),
        disciplineId: Number(editCourseForm.disciplineId),
        price: normalizeCoursePriceForSave(
          editCourseForm.isFree,
          numberFromNumericInput(editCourseForm.price, MIN_PAID_COURSE_PRICE),
        ),
        freeAccessStartsAt: editCourseForm.isFree ? datetimeLocalToIso(editCourseForm.freeAccessStartsAt) : null,
        freeAccessEndsAt: editCourseForm.isFree ? datetimeLocalToIso(editCourseForm.freeAccessEndsAt) : null,
        freeAccessDurationDays: editCourseForm.isFree
          ? normalizeFreeAccessDurationDays(editCourseForm.freeAccessDurationDays)
          : null,
      });
      setCourses((prev) => prev.map((item) => (item.id === updatedCourse.id ? updatedCourse : item)));

      if (editCourseImageFile) {
        try {
          setEditCourseImageStatus("Téléversement de l'image en cours...");
          const confirmedCourse = await uploadCourseImage(
            updatedCourse.id,
            editCourseImageFile,
            setEditCourseImageStatus,
          );
          updatedCourse = { ...updatedCourse, ...confirmedCourse };
          setCourses((prev) => prev.map((item) => (item.id === updatedCourse.id ? updatedCourse : item)));
          setEditCourseImageStatus("Image du module enregistrée.");
        } catch (err) {
          const message = getUploadErrorMessage(err);
          setEditCourseImageStatus(message);
          showCurriculumError(
            `Les informations ont été modifiées, mais l'image n'a pas pu être enregistrée. ${message}`,
          );
          return;
        }
      }

      setEditCourseImageFile(null);
      setEditingCourse(null);
      showCurriculumSuccess(`Module « ${updatedCourse.title} » modifié.`);
    } catch (err: any) {
      showCurriculumError(getClientErrorMessage(err, "Modification du module impossible."));
    }
  };

  const handleToggleCoursePublished = async (course: Course) => {
    try {
      const updatedCourse = await api.updateCourse(course.id, { published: !course.published });
      setCourses((prev) => prev.map((item) => (item.id === updatedCourse.id ? updatedCourse : item)));
      showCurriculumSuccess(`Module ${updatedCourse.published ? "publié" : "dépublié"}.`);
    } catch (err: any) {
      showCurriculumError(getClientErrorMessage(err, "Changement de publication impossible."));
    }
  };

  const handleDeleteCourse = async (course: Course) => {
    if (!window.confirm(`Supprimer définitivement le module "${course.title}" ?`)) return;
    try {
      await api.deleteCourse(course.id);
      setCourses((prev) => prev.filter((item) => item.id !== course.id));
      if (newSectionCourseId === course.id) {
        const nextCourse = managedCourses.find((item) => item.id !== course.id);
        setNewSectionCourseId(nextCourse?.id || 1);
        setUploadCourseId(nextCourse?.id || 1);
        setCourseContentSections([]);
        setModuleRootContents([]);
        setUploadSectionId("");
      }
      showCurriculumSuccess("Module supprimé.");
    } catch (err: any) {
      showCurriculumError(getClientErrorMessage(err, "Suppression du module impossible."));
    }
  };

  const handleUpdateSectionTitle = async (section: ContentSection) => {
    if (section.parentId) return;
    const title = window.prompt("Nouveau titre du chapitre", section.title);
    if (!title || !title.trim()) return;
    try {
      if (section.chapterId) {
        await api.updateChapter(section.chapterId, { title: title.trim() });
      } else {
        await api.putContentSection(section.id, { title: title.trim() });
      }
      await refreshCourseContent(section.courseId);
      showCurriculumSuccess(`Chapitre « ${section.title} » modifié.`);
    } catch (err: any) {
      showCurriculumError(getClientErrorMessage(err, "Modification impossible."));
    }
  };

  const handleToggleSectionPublished = async (section: ContentSection) => {
    if (section.parentId) return;
    try {
      if (section.chapterId) {
        await api.publishChapter(section.chapterId, !section.published);
      } else {
        await api.updateContentSection(section.id, { published: !section.published });
      }
      await refreshCourseContent(section.courseId);
      showCurriculumSuccess(`Chapitre ${!section.published ? "publié" : "dépublié"}.`);
    } catch (err: any) {
      showCurriculumError(getClientErrorMessage(err, "Publication impossible."));
    }
  };

  const handleDeleteSection = async (section: ContentSection) => {
    if (section.parentId) return;
    if (!window.confirm(`Supprimer "${section.title}" et tout son contenu ?`)) return;
    try {
      if (section.chapterId) {
        await api.deleteChapter(section.chapterId);
      } else {
        await api.deleteContentSection(section.id);
      }
      await refreshCourseContent(section.courseId);
      if (uploadSectionId === section.id) setUploadSectionId("");
      showCurriculumSuccess(`Chapitre « ${section.title} » supprimé.`);
    } catch (err: any) {
      showCurriculumError(getClientErrorMessage(err, "Suppression impossible."));
    }
  };

  const handleToggleContentPublished = async (content: LessonContent) => {
    try {
      await api.updateLessonContent(content.id, { published: !content.published });
      await refreshCourseContent(content.courseId);
      showCurriculumSuccess(`Média ${!content.published ? "publié" : "dépublié"}.`);
    } catch (err: any) {
      showCurriculumError(getClientErrorMessage(err, "Publication du média impossible."));
    }
  };

  const handleDeleteLessonContent = async (content: LessonContent) => {
    if (!window.confirm(`Supprimer le média "${content.title}" ?`)) return;
    try {
      await api.deleteLessonContent(content.id);
      await refreshCourseContent(content.courseId);
      showCurriculumSuccess("Média supprimé.");
    } catch (err: any) {
      showCurriculumError(getClientErrorMessage(err, "Suppression du média impossible."));
    }
  };

  const managedCourse = managedCourses.find((course) => course.id === newSectionCourseId) || managedCourses[0] || null;
  const managedSections = flattenSectionsFn(courseContent.courseContentSections);
  const chapterSections = managedSections.filter((section) => !section.parentId);
  const _selectedManagedSection = chapterSections.find((section) => section.id === uploadSectionId) || null;

  const handleSetUploadSectionId = (sectionId: string) => {
    if (!sectionId) {
      setUploadSectionId("");
      return;
    }
    const chapter = chapterSections.find((section) => section.id === sectionId);
    if (!chapter) {
      setUploadSectionId("");
      return;
    }
    setUploadSectionId(chapter.id);
  };

  const allChapterContents = managedSections.flatMap((section) => section.contents || []);
  const selectedManagedContents = [
    ...courseContent.moduleRootContents,
    ...allChapterContents.filter((cc) => !courseContent.moduleRootContents.some((rc) => rc.id === cc.id)),
  ];
  const managedLiveReplays = [...courseContent.moduleRootContents, ...allChapterContents].filter(
    (content) => content.type === "VIDEO" && !content.published && isLiveReplayContent(content.body),
  );

  return {
    newSectionCourseId,
    activeCurriculumStep,
    setActiveCurriculumStep,
    quizChapterId,
    setQuizChapterId,
    curriculumSuccessMsg,
    curriculumErrorMsg,
    newCourseTitle,
    setNewCourseTitle,
    newCourseDescription,
    setNewCourseDescription,
    newCourseImageFile,
    setNewCourseImageFile,
    newCourseImageStatus,
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
    newCourseFreeAccessDurationDays,
    setNewCourseFreeAccessDurationDays,
    newCoursePublished,
    setNewCoursePublished,
    newSectionTitle,
    setNewSectionTitle,
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
    uploadStatusKind,
    isUploadingLessonAsset,
    editingCourse,
    setEditingCourse,
    editCourseImageFile,
    setEditCourseImageFile,
    editCourseImageStatus,
    editCourseForm,
    setEditCourseForm,
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
    managedCourse,
    managedSections,
    chapterSections,
    selectedManagedContents,
    managedLiveReplays,
    handleSetUploadSectionId,
    showCurriculumSuccess,
    showCurriculumError,
    handleCreateCourse,
    handleCreateChapter,
    handleUploadLessonAsset,
    handleSelectManagedCourse,
    editingQuestionId,
    handleDeleteQuiz,
    handleUpdateQuizTitle,
    handleStartEditQuestion,
    handleCancelEditQuestion,
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
    handleToggleContentPublished,
    handleDeleteLessonContent,
  };
}
