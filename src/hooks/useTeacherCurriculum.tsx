import { useCallback, useEffect, useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { getClientErrorMessage } from "../client-errors";
import {
  bindUploadProgress,
  formatUploadProgressLabel,
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

export function useTeacherCurriculum({
  setCourses,
  managedCourses,
  managedCourseIds,
  allDisciplines,
  currentUser,
  role,
  courseContent,
}: UseTeacherCurriculumOptions) {
  const { setCourseContentSections, flattenSections: flattenSectionsFn, refreshCourseContent } = courseContent;

  const [activeCurriculumStep, setActiveCurriculumStep] = useState<number>(1);
  const [selectedChapterId, setSelectedChapterId] = useState<string>("");
  const [selectedPartieId, setSelectedPartieId] = useState<string>("");
  const [newSectionMode, setNewSectionMode] = useState<"chapter" | "part" | "subpart">("chapter");
  const [uploadChapterId, setUploadChapterId] = useState<string>("");
  const [uploadPartId, setUploadPartId] = useState<string>("");
  const [uploadSubpartId, setUploadSubpartId] = useState<string>("");
  const [quizChapterId, setQuizChapterId] = useState<string>("");
  const [quizPartId, setQuizPartId] = useState<string>("");
  const [quizSubpartId, setQuizSubpartId] = useState<string>("");
  const [curriculumSuccessMsg, setCurriculumSuccessMsg] = useState("");
  const [curriculumErrorMsg, setCurriculumErrorMsg] = useState("");
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [newCourseDescription, setNewCourseDescription] = useState("");
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
  const [newSectionParentId, setNewSectionParentId] = useState("");
  const [newSectionPublished, setNewSectionPublished] = useState(true);
  const [uploadCourseId, setUploadCourseId] = useState<number>(1);
  const [uploadSectionId, setUploadSectionId] = useState("");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadType, setUploadType] = useState<"VIDEO" | "PDF" | "IMAGE">("VIDEO");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPublished, setUploadPublished] = useState(true);
  const [uploadStatusMsg, setUploadStatusMsg] = useState("");
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
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
  const [newQuestionOptions, setNewQuestionOptions] = useState(["Option A", "Option B", "Option C", "Option D"]);
  const [newQuestionAnswer, setNewQuestionAnswer] = useState("");
  const [newQuestionExplanation, setNewQuestionExplanation] = useState("");
  const [quizManagerMsg, setQuizManagerMsg] = useState("");
  const [quizManagerError, setQuizManagerError] = useState("");
  const quizStep = currentUser?.role === "ADMIN" ? 7 : 5;

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
        if (!active.isActive()) return;
        setTeacherQuizzes(quizList);
        if (quizList.length > 0 && !quizList.some((q: any) => q.id === selectedQuizId)) {
          setSelectedQuizId(quizList[0].id);
        } else if (quizList.length === 0) {
          setSelectedQuizId("");
        }
      } catch (err: any) {
        if (!active.isActive()) return;
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
        if (!active.isActive()) return;
        setSelectedQuizDetail(quiz);
      } catch (err: any) {
        if (!active.isActive()) return;
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
      setNewSectionParentId("");
      setUploadSectionId("");
      return;
    }
    if (!managedCourses.some((course) => course.id === newSectionCourseId)) {
      const firstManagedCourseId = managedCourses[0].id;
      setNewSectionCourseId(firstManagedCourseId);
      setUploadCourseId(firstManagedCourseId);
      setQuizCourseId(firstManagedCourseId);
    }
  }, [role, managedCourseIds, newSectionCourseId, managedCourses, setCourseContentSections]);

  useEffect(() => {
    if (role !== "teacher" || activeCurriculumStep !== quizStep || !quizCourseId) return;
    const request = startRequest();
    void loadTeacherQuizzes(quizCourseId, request);
  }, [role, activeCurriculumStep, quizStep, quizCourseId, loadTeacherQuizzes, startRequest]);

  useEffect(() => {
    if (!currentUser || role === "student") return;
    if (!managedCourses.some((course) => course.id === newSectionCourseId)) {
      setCourseContentSections([]);
      return;
    }
    const request = startRequest();
    void refreshCourseContent(newSectionCourseId).then((sections) => {
      if (!request.isActive()) return;
      const flat = flattenSectionsFn(sections);
      if (!flat.some((section) => section.id === newSectionParentId)) setNewSectionParentId("");
      if (uploadCourseId === newSectionCourseId && !flat.some((section) => section.id === uploadSectionId)) {
        setUploadSectionId(flat[0]?.id || "");
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
    uploadCourseId,
    uploadSectionId,
    newSectionParentId,
    startRequest,
  ]);

  const handleCreateCourse = async (e: FormEvent) => {
    e.preventDefault();
    if (!newCourseTitle.trim() || !newCourseDescription.trim()) return;
    const discipline = allDisciplines.find((item) => item.id === newCourseDisciplineId);
    if (!discipline) {
      showCurriculumError("Choisissez un sous-domaine valide avant de créer le module.");
      return;
    }

    try {
      const course = await api.createCourse({
        title: newCourseTitle,
        level: newCourseLevel,
        credits: integerFromNumericInput(newCourseCredits, 0),
        duration: newCourseDuration,
        category: discipline.name,
        disciplineId: discipline.id,
        price: normalizeCoursePriceForSave(
          newCourseIsFree,
          numberFromNumericInput(newCoursePrice, MIN_PAID_COURSE_PRICE),
        ),
        freeAccessStartsAt: newCourseIsFree ? datetimeLocalToIso(newCourseFreeAccessStartsAt) : null,
        freeAccessEndsAt: newCourseIsFree ? datetimeLocalToIso(newCourseFreeAccessEndsAt) : null,
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
      setNewSectionCourseId(normalizedCourse.id);
      setUploadCourseId(normalizedCourse.id);
      setUploadSectionId("");
      setNewCourseTitle("");
      setNewCourseDescription("");
      setNewCourseFreeAccessStartsAt(formatDatetimeLocalValue(null));
      setNewCourseFreeAccessEndsAt(defaultFreeAccessEndFromStart(formatDatetimeLocalValue(null)));
      setNewCourseFreeAccessDurationDays("");
      setCourseContentSections([]);
      showCurriculumSuccess(`Module « ${normalizedCourse.title} » créé avec succès.`);
    } catch (err: any) {
      console.error("Failed to create course:", err);
      showCurriculumError(getClientErrorMessage(err, "Création du module impossible."));
    }
  };

  const handleCreateSection = async (e: FormEvent) => {
    e.preventDefault();
    if (!newSectionTitle.trim()) return;

    try {
      const result = newSectionParentId
        ? await api.createSection(newSectionCourseId, {
            title: newSectionTitle,
            parentId: newSectionParentId,
            published: newSectionPublished,
          })
        : await api.createChapter(newSectionCourseId, {
            title: newSectionTitle,
            published: newSectionPublished,
          });
      const sections = await refreshCourseContent(newSectionCourseId);
      setUploadCourseId(newSectionCourseId);
      setUploadSectionId(newSectionParentId ? result.id : result.section?.id || "");
      setNewSectionTitle("");
      showCurriculumSuccess(newSectionParentId ? "Partie créée avec succès." : "Chapitre créé avec succès.");
      if (!uploadSectionId && sections[0]) setUploadSectionId(sections[0].id);
    } catch (err: any) {
      console.error("Failed to create content section:", err);
      showCurriculumError(getClientErrorMessage(err, "Création de section impossible."));
    }
  };

  const handleUploadLessonAsset = async (e: FormEvent) => {
    e.preventDefault();
    const token = await getFreshSessionToken();
    if (!uploadFile || !uploadTitle.trim() || !token) {
      setUploadStatusMsg("Sélectionnez un titre et un fichier.");
      return;
    }

    const validationError = validateUploadFile(uploadFile, uploadType);
    if (validationError) {
      setUploadStatusMsg(validationError);
      showCurriculumError(validationError);
      return;
    }

    try {
      setUploadStatusMsg("Téléversement en cours...");
      await (uploadFiles as any)("lessonAsset", {
        files: [uploadFile],
        input: {
          courseId: uploadCourseId,
          sectionId: uploadSectionId || null,
          title: uploadTitle,
          contentType: uploadType,
          published: uploadPublished,
        },
        headers: { Authorization: `Bearer ${token}` },
        onUploadProgress: bindUploadProgress((progress) =>
          setUploadStatusMsg(`Téléversement : ${formatUploadProgressLabel(progress)}`),
        ),
      });
      await refreshCourseContent(uploadCourseId);
      setUploadFile(null);
      setUploadTitle("");
      setUploadStatusMsg("Média enregistré avec succès.");
      showCurriculumSuccess("Média enregistré avec succès.");
    } catch (err: any) {
      console.error("Failed to upload lesson asset:", err);
      const message = getUploadErrorMessage(err);
      setUploadStatusMsg(message);
      showCurriculumError(message);
    }
  };

  const handleSelectManagedCourse = async (courseId: number) => {
    setNewSectionCourseId(courseId);
    setUploadCourseId(courseId);
    setQuizCourseId(courseId);
    setNewSectionParentId("");
    setUploadSectionId("");
    await refreshCourseContent(courseId);
  };

  const handleCreateQuiz = async (e: FormEvent) => {
    e.preventDefault();
    if (!newQuizTitle.trim()) {
      setQuizManagerError("Veuillez saisir un titre pour le quiz.");
      return;
    }
    const resolvedSectionId = quizSubpartId || quizPartId || quizChapterId || null;
    try {
      setQuizManagerError("");
      const quiz = await api.createCourseQuiz(quizCourseId, {
        sectionId: resolvedSectionId,
        title: newQuizTitle.trim(),
        published: true,
      });
      setNewQuizTitle("");
      setQuizChapterId("");
      setQuizPartId("");
      setQuizSubpartId("");
      await loadTeacherQuizzes(quizCourseId);
      setSelectedQuizId(quiz.id);
      setQuizManagerMsg(`Quiz créé : "${quiz.title}"`);
      scheduleClear(() => setQuizManagerMsg(""), 5000);
    } catch (err: any) {
      setQuizManagerError(getClientErrorMessage(err, "Création du quiz impossible."));
    }
  };

  const handleAddQuestion = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedQuizId || !newQuestionText.trim() || !newQuestionAnswer.trim() || !newQuestionExplanation.trim()) {
      setQuizManagerError("Tous les champs de la question sont requis.");
      return;
    }
    const filledOptions = newQuestionOptions.filter((o) => o.trim());
    if (filledOptions.length < 2) {
      setQuizManagerError("Au moins 2 options de réponse sont requises.");
      return;
    }
    if (!filledOptions.includes(newQuestionAnswer.trim())) {
      setQuizManagerError("La bonne réponse doit correspondre à l'une des options.");
      return;
    }
    try {
      setQuizManagerError("");
      await api.addQuizQuestion(selectedQuizId, {
        question: newQuestionText.trim(),
        options: filledOptions,
        answer: newQuestionAnswer.trim(),
        explanation: newQuestionExplanation.trim(),
      });
      setNewQuestionText("");
      setNewQuestionOptions(["Option A", "Option B", "Option C", "Option D"]);
      setNewQuestionAnswer("");
      setNewQuestionExplanation("");
      await loadTeacherQuizzes(quizCourseId);
      await loadSelectedQuizDetail(selectedQuizId);
      setQuizManagerMsg("Question ajoutée avec succès.");
      scheduleClear(() => setQuizManagerMsg(""), 4000);
    } catch (err: any) {
      setQuizManagerError(getClientErrorMessage(err, "Ajout de la question impossible."));
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!window.confirm("Supprimer cette question ?")) return;
    try {
      await api.deleteQuizQuestion(questionId);
      await loadTeacherQuizzes(quizCourseId);
      await loadSelectedQuizDetail(selectedQuizId);
      setQuizManagerMsg("Question supprimée.");
      scheduleClear(() => setQuizManagerMsg(""), 3000);
    } catch (err: any) {
      setQuizManagerError(getClientErrorMessage(err, "Suppression impossible."));
    }
  };

  const handleUpdateCourseDetails = (course: Course) => {
    setEditingCourse(course);
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
    try {
      const updatedCourse = await api.updateCourseDetails(editingCourse.id, {
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
        setUploadSectionId("");
      }
      showCurriculumSuccess("Module supprimé.");
    } catch (err: any) {
      showCurriculumError(getClientErrorMessage(err, "Suppression du module impossible."));
    }
  };

  const handleUpdateSectionTitle = async (section: ContentSection) => {
    const title = window.prompt(
      section.parentId ? "Nouveau titre de la partie" : "Nouveau titre du chapitre",
      section.title,
    );
    if (!title || !title.trim()) return;
    try {
      if (!section.parentId && section.chapterId) {
        await api.updateChapter(section.chapterId, { title: title.trim() });
      } else {
        await api.putContentSection(section.id, { title: title.trim() });
      }
      await refreshCourseContent(section.courseId);
      showCurriculumSuccess(`${section.parentId ? "Partie" : "Chapitre"} « ${section.title} » modifié.`);
    } catch (err: any) {
      showCurriculumError(getClientErrorMessage(err, "Modification impossible."));
    }
  };

  const handleToggleSectionPublished = async (section: ContentSection) => {
    try {
      if (!section.parentId && section.chapterId) {
        await api.publishChapter(section.chapterId, !section.published);
      } else {
        await api.updateContentSection(section.id, { published: !section.published });
      }
      await refreshCourseContent(section.courseId);
      showCurriculumSuccess(
        `${section.parentId ? "Partie" : "Chapitre"} ${!section.published ? "publié" : "dépublié"}.`,
      );
    } catch (err: any) {
      showCurriculumError(getClientErrorMessage(err, "Publication impossible."));
    }
  };

  const handleDeleteSection = async (section: ContentSection) => {
    if (!window.confirm(`Supprimer "${section.title}" et tout son contenu ?`)) return;
    try {
      if (!section.parentId && section.chapterId) {
        await api.deleteChapter(section.chapterId);
      } else {
        await api.deleteContentSection(section.id);
      }
      await refreshCourseContent(section.courseId);
      if (uploadSectionId === section.id) setUploadSectionId("");
      showCurriculumSuccess(`${section.parentId ? "Partie" : "Chapitre"} « ${section.title} » supprimé.`);
    } catch (err: any) {
      showCurriculumError(getClientErrorMessage(err, "Suppression impossible."));
    }
  };

  const handleAddChildSection = (section: ContentSection) => {
    setNewSectionCourseId(section.courseId);
    setUploadCourseId(section.courseId);
    setNewSectionParentId(section.id);
    setNewSectionTitle("");
    setUploadSectionId(section.id);
    showCurriculumSuccess(`Section sélectionnée : ${section.title}.`);
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
  const selectedManagedSection = managedSections.find((section) => section.id === uploadSectionId) || null;
  const uploadPartOptions = managedSections.filter((section) => section.parentId === uploadChapterId);

  const handleSetUploadSectionId = (sectionId: string) => {
    setUploadSectionId(sectionId);
    if (!sectionId) {
      setUploadChapterId("");
      setUploadPartId("");
      setUploadSubpartId("");
      return;
    }
    const sec = managedSections.find((s) => s.id === sectionId);
    if (!sec) return;

    if (!sec.parentId) {
      setUploadChapterId(sec.id);
      setUploadPartId("");
      setUploadSubpartId("");
    } else {
      const parent = managedSections.find((s) => s.id === sec.parentId);
      if (parent && !parent.parentId) {
        setUploadChapterId(parent.id);
        setUploadPartId(sec.id);
        setUploadSubpartId("");
      } else if (parent && parent.parentId) {
        setUploadChapterId(parent.parentId);
        setUploadPartId(parent.id);
        setUploadSubpartId(sec.id);
      }
    }
  };

  const selectedManagedContents = selectedManagedSection?.contents || [];
  const managedLiveReplays = managedSections
    .flatMap((section) => section.contents || [])
    .filter((content) => content.type === "VIDEO" && !content.published && isLiveReplayContent(content.body));

  return {
    newSectionCourseId,
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
    uploadPartOptions,
    selectedManagedContents,
    managedLiveReplays,
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
    handleDeleteLessonContent,
  };
}
