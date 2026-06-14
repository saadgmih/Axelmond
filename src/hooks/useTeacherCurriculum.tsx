import { useCallback, useEffect, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { getClientErrorMessage } from "../client-errors";
import { uploadFiles, getUploadErrorMessage, validateUploadFile } from "../uploadthing-client";
import { api, getFreshSessionToken } from "../api";
import type { AppUser } from "../components/AuthScreen";
import type { Course, ContentSection, FacultyDomain, LessonContent } from "../types";
import { flattenSections } from "./useCourseContent";
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
  const [newCourseDisciplineId, setNewCourseDisciplineId] = useState(601);
  const [newCourseLevel, setNewCourseLevel] = useState("Licence 1");
  const [newCourseCredits, setNewCourseCredits] = useState(3);
  const [newCourseDuration, setNewCourseDuration] = useState("20 heures");
  const [newCoursePrice, setNewCoursePrice] = useState(0);
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
    credits: 0,
    disciplineId: 0,
    price: 0,
  });
  const [teacherQuizzes, setTeacherQuizzes] = useState<any[]>([]);
  const [quizCourseId, setQuizCourseId] = useState<number>(1);
  const [newQuizTitle, setNewQuizTitle] = useState("");
  const [selectedQuizId, setSelectedQuizId] = useState<string>("");
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionOptions, setNewQuestionOptions] = useState(["Option A", "Option B", "Option C", "Option D"]);
  const [newQuestionAnswer, setNewQuestionAnswer] = useState("");
  const [newQuestionExplanation, setNewQuestionExplanation] = useState("");
  const [quizManagerMsg, setQuizManagerMsg] = useState("");
  const [quizManagerError, setQuizManagerError] = useState("");

  const { startRequest } = useAsyncEffectGuard();
  const scheduleClear = useAutoClearTimeout();

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

  useEffect(() => {
    if (allDisciplines.length > 0 && !allDisciplines.some((discipline) => discipline.id === newCourseDisciplineId)) {
      setNewCourseDisciplineId(allDisciplines[0].id);
    }
  }, [allDisciplines.length, newCourseDisciplineId]);

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
    if (role !== "teacher" || activeCurriculumStep !== 5 || !quizCourseId) return;
    const request = startRequest();
    void loadTeacherQuizzes(quizCourseId, request);
  }, [role, activeCurriculumStep, quizCourseId, loadTeacherQuizzes, startRequest]);

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
    if (!discipline) return;

    try {
      const course = await api.createCourse({
        title: newCourseTitle,
        level: newCourseLevel,
        credits: newCourseCredits,
        duration: newCourseDuration,
        category: discipline.name,
        disciplineId: discipline.id,
        price: newCoursePrice,
        instructor: currentUser?.fullName,
        description: newCourseDescription,
        published: newCoursePublished,
      });
      setCourses((prev) => [...prev, course]);
      setNewSectionCourseId(course.id);
      setUploadCourseId(course.id);
      setUploadSectionId("");
      setNewCourseTitle("");
      setNewCourseDescription("");
      setCourseContentSections([]);
      showCurriculumSuccess(`Module créé : ID ${course.id} — "${course.title}".`);
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
      showCurriculumSuccess(
        newSectionParentId
          ? `Partie créée : ID ${result.id}.`
          : `Chapitre créé : ID ${result.chapter?.id} — section racine ${result.section?.id}.`,
      );
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
      setUploadStatusMsg("Téléversement UploadThing en cours...");
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
        onUploadProgress: ({ progress }: { progress: number }) =>
          setUploadStatusMsg(`Téléversement UploadThing : ${progress}%`),
      });
      await refreshCourseContent(uploadCourseId);
      setUploadFile(null);
      setUploadTitle("");
      setUploadStatusMsg("Fichier envoyé et contenu enregistré en base.");
      showCurriculumSuccess("Média envoyé et enregistré en base.");
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
      credits: course.credits,
      disciplineId: course.disciplineId ?? allDisciplines[0]?.id ?? 0,
      price: course.price,
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
        credits: Number(editCourseForm.credits),
        disciplineId: Number(editCourseForm.disciplineId),
        price: Number(editCourseForm.price),
      });
      setCourses((prev) => prev.map((item) => (item.id === updatedCourse.id ? updatedCourse : item)));
      setEditingCourse(null);
      showCurriculumSuccess(`Module modifié : "${updatedCourse.title}" (ID ${updatedCourse.id}).`);
    } catch (err: any) {
      showCurriculumError(getClientErrorMessage(err, "Modification du module impossible."));
    }
  };

  const handleToggleCoursePublished = async (course: Course) => {
    try {
      const updatedCourse = await api.updateCourse(course.id, { published: !course.published });
      setCourses((prev) => prev.map((item) => (item.id === updatedCourse.id ? updatedCourse : item)));
      showCurriculumSuccess(`Module ${updatedCourse.published ? "publié" : "dépublié"} : ID ${updatedCourse.id}.`);
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
      showCurriculumSuccess(`Module supprimé : ID ${course.id}.`);
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
      showCurriculumSuccess(
        `${section.parentId ? "Section" : "Chapitre"} modifié : ID ${section.parentId ? section.id : section.chapterId}.`,
      );
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
        `${section.parentId ? "Section" : "Chapitre"} ${!section.published ? "publié" : "dépublié"} : ID ${section.parentId ? section.id : section.chapterId}.`,
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
      showCurriculumSuccess(
        `${section.parentId ? "Section" : "Chapitre"} supprimé : ID ${section.parentId ? section.id : section.chapterId}.`,
      );
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
    showCurriculumSuccess(`Parent sélectionné : ${section.title} (${section.id}).`);
  };

  const handleToggleContentPublished = async (content: LessonContent) => {
    try {
      await api.updateLessonContent(content.id, { published: !content.published });
      await refreshCourseContent(content.courseId);
      showCurriculumSuccess(`Média ${!content.published ? "publié" : "dépublié"} : ID ${content.id}.`);
    } catch (err: any) {
      showCurriculumError(getClientErrorMessage(err, "Publication du média impossible."));
    }
  };

  const handleDeleteLessonContent = async (content: LessonContent) => {
    if (!window.confirm(`Supprimer le média "${content.title}" ?`)) return;
    try {
      await api.deleteLessonContent(content.id);
      await refreshCourseContent(content.courseId);
      showCurriculumSuccess(`Média supprimé : ID ${content.id}.`);
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
