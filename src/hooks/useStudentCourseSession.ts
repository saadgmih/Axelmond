import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { getClientErrorMessage } from "../client-errors";
import { api } from "../api";
import type { AppUser } from "../components/AuthScreen";
import type { Course, CourseModule, Invoice } from "../types";
import { getCourseContentProgress } from "../utils/course-content-metrics";

function withModuleCompletion(course: Course, moduleId: number, completed: boolean): Course {
  const modules = course.modules.map((module) => (module.id === moduleId ? { ...module, completed } : module));

  return {
    ...course,
    modules,
    progress: getCourseContentProgress(modules).progressPercent,
  };
}

export interface UseStudentCourseSessionOptions {
  courses: Course[];
  setCourses: Dispatch<SetStateAction<Course[]>>;
  selectedCourse: Course | null;
  setSelectedCourse: Dispatch<SetStateAction<Course | null>>;
  selectedModule: CourseModule | null;
  setSelectedModule: Dispatch<SetStateAction<CourseModule | null>>;
  currentUser: AppUser | null;
  currentView: string;
  refreshCourseContent: (courseId: number) => void | Promise<unknown>;
  updateSessionUser: (user: AppUser) => void;
  setEnrolledCourses: Dispatch<SetStateAction<number[]>>;
  setInvoices: Dispatch<SetStateAction<Invoice[]>>;
  invoices: Invoice[];
  setCurrentView: Dispatch<SetStateAction<string>>;
  setIsMobileMenuOpen: Dispatch<SetStateAction<boolean>>;
}

export function useStudentCourseSession({
  courses,
  setCourses,
  selectedCourse,
  setSelectedCourse,
  selectedModule,
  setSelectedModule,
  currentUser,
  currentView,
  refreshCourseContent,
  updateSessionUser,
  setEnrolledCourses,
  setInvoices,
  invoices: _invoices,
  setCurrentView,
  setIsMobileMenuOpen,
}: UseStudentCourseSessionOptions) {
  const [quizQuestions, setQuizQuestions] = useState<any[] | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [quizSubmitError, setQuizSubmitError] = useState("");
  const [moduleProgressPendingId, setModuleProgressPendingId] = useState<number | null>(null);
  const [moduleProgressError, setModuleProgressError] = useState("");
  const moduleProgressRequestRef = useRef<number | null>(null);
  const [showAITutor, setShowAITutor] = useState(false);

  const hasAiTutorAccess = useMemo(() => {
    if (!selectedCourse || !currentUser?.aiTutorCourseIds?.length) return false;
    return currentUser.aiTutorCourseIds.includes(selectedCourse.id);
  }, [currentUser?.aiTutorCourseIds, selectedCourse?.id]);

  useEffect(() => {
    if (!hasAiTutorAccess) {
      setShowAITutor(false);
    }
  }, [hasAiTutorAccess, selectedCourse?.id]);

  useEffect(() => {
    if (selectedCourse && selectedModule && selectedModule.type === "quiz") {
      api
        .getQuiz(selectedCourse.id, selectedModule.id)
        .then((data) => setQuizQuestions(data))
        .catch((err) => {
          console.error("Failed to fetch quiz:", err);
          setQuizQuestions(null);
        });
    } else {
      setQuizQuestions(null);
    }
  }, [selectedModule?.id, selectedModule?.type, selectedCourse?.id]);

  useEffect(() => {
    if (!currentUser || currentView !== "course" || !selectedCourse) return;
    refreshCourseContent(selectedCourse.id);
  }, [currentUser?.id, currentView, selectedCourse?.id, refreshCourseContent]);

  useEffect(() => {
    setModuleProgressError("");
  }, [selectedCourse?.id, selectedModule?.id]);

  const markModuleCompleted = async (modId: number, completed = true) => {
    if (!selectedCourse || moduleProgressRequestRef.current !== null) return;

    const courseId = selectedCourse.id;
    const previousModule = selectedCourse.modules.find((module) => module.id === modId);
    if (!previousModule) return;

    const previousCompleted = previousModule.completed;
    const applyCourseState = (course: Course) => {
      setCourses((current) => current.map((item) => (item.id === course.id ? course : item)));
      setSelectedCourse((current) => (current?.id === course.id ? course : current));
      const activeModule = course.modules.find((module) => module.id === modId);
      if (activeModule) {
        setSelectedModule((current) => (current?.id === modId ? activeModule : current));
      }
    };

    moduleProgressRequestRef.current = modId;
    setModuleProgressPendingId(modId);
    setModuleProgressError("");
    applyCourseState(withModuleCompletion(selectedCourse, modId, completed));

    try {
      await api.setModuleProgress(courseId, modId, completed);
    } catch (err) {
      console.error("Failed to mark module as completed:", err);
      let reconciled = false;

      try {
        const refreshedCourse = (await api.getCourse(courseId)) as Course;
        const refreshedModule = refreshedCourse.modules.find((module) => module.id === modId);
        if (refreshedModule) {
          applyCourseState(refreshedCourse);
          reconciled = refreshedModule.completed === completed;
        }
      } catch (refreshErr) {
        console.error("Failed to reconcile module progress:", refreshErr);
      }

      if (!reconciled) {
        setCourses((current) =>
          current.map((course) =>
            course.id === courseId ? withModuleCompletion(course, modId, previousCompleted) : course,
          ),
        );
        setSelectedCourse((current) =>
          current?.id === courseId ? withModuleCompletion(current, modId, previousCompleted) : current,
        );
        setSelectedModule((current) =>
          current?.id === modId ? { ...current, completed: previousCompleted } : current,
        );
        setModuleProgressError(
          getClientErrorMessage(err, "La progression n'a pas pu être enregistrée. Veuillez réessayer."),
        );
      }
    } finally {
      if (moduleProgressRequestRef.current === modId) {
        moduleProgressRequestRef.current = null;
      }
      setModuleProgressPendingId((current) => (current === modId ? null : current));
    }
  };

  const handlePaymentSuccess = async (courseId: number, _amountPaid: number, syncedUser?: AppUser) => {
    if (!syncedUser) {
      throw new Error("Inscription non confirmée par le serveur. Contactez le support.");
    }
    if (!syncedUser.enrolledCourses?.includes(courseId)) {
      throw new Error("Inscription non confirmée pour ce module.");
    }

    updateSessionUser(syncedUser);
    setEnrolledCourses(syncedUser.enrolledCourses || []);
    setInvoices(syncedUser.invoices || []);

    let course = courses.find((c) => c.id === courseId) ?? null;
    try {
      const refreshedCourse = await api.getCourse(courseId);
      course = refreshedCourse;
      setCourses((prev) => prev.map((item) => (item.id === courseId ? refreshedCourse : item)));
    } catch (err) {
      console.error("Failed to refresh enrolled course after payment:", err);
    }

    if (!course) return;

    setSelectedCourse(course);
    setSelectedModule(course.modules?.[0] || null);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(null);
    setQuizSubmitError("");
    setCurrentView("course");
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleQuizAnswerSelect = (index: number, optionValue: string) => {
    if (quizSubmitted) return;
    setQuizSubmitError("");
    setQuizAnswers((prev) => ({
      ...prev,
      [index]: optionValue,
    }));
  };

  const handleQuizSubmit = async () => {
    if (!selectedModule || !quizQuestions || !selectedCourse) return;
    const questions = quizQuestions;

    let correctCount = 0;
    questions.forEach((q, i) => {
      if (quizAnswers[i] === q.answer) {
        correctCount++;
      }
    });

    try {
      const attempt = await api.submitQuizAttempt(selectedCourse.id, selectedModule.id, quizAnswers);
      correctCount = Number(attempt.score);

      const corrections = Array.isArray(attempt.questions) ? attempt.questions : [];
      const correctedQuestions = questions.map((question, index) => {
        const correction =
          corrections.find(
            (item) => item?.id != null && question?.id != null && String(item.id) === String(question.id),
          ) ?? corrections[index];

        if (!correction) return question;

        return {
          ...question,
          answer: typeof correction.answer === "string" ? correction.answer : question.answer,
          explanation: typeof correction.explanation === "string" ? correction.explanation : question.explanation,
        };
      });

      setQuizQuestions(correctedQuestions);
    } catch (err) {
      console.error("Failed to persist quiz attempt:", err);
      setQuizSubmitError(getClientErrorMessage(err, "Enregistrement du quiz impossible."));
      return;
    }

    setQuizScore(correctCount);
    setQuizSubmitted(true);

    // The attempt endpoint persists module completion before returning. Reflect that
    // confirmed state locally instead of issuing a second, redundant progress request.
    const updatedCourse = {
      ...selectedCourse,
      modules: selectedCourse.modules.map((module: CourseModule) =>
        module.id === selectedModule.id
          ? { ...module, completed: true, score: `${correctCount}/${questions.length}` }
          : module,
      ),
    };
    setCourses((current) => current.map((course) => (course.id === updatedCourse.id ? updatedCourse : course)));
    setSelectedCourse(updatedCourse);
    const activeMod = updatedCourse.modules.find((module: CourseModule) => module.id === selectedModule.id);
    if (activeMod) setSelectedModule(activeMod);
  };

  const resetQuiz = () => {
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(null);
    setQuizSubmitError("");
  };

  return {
    quizQuestions,
    setQuizQuestions,
    quizAnswers,
    setQuizAnswers,
    quizSubmitted,
    setQuizSubmitted,
    quizScore,
    setQuizScore,
    quizSubmitError,
    setQuizSubmitError,
    moduleProgressPendingId,
    moduleProgressError,
    showAITutor,
    setShowAITutor,
    hasAiTutorAccess,
    markModuleCompleted,
    handleQuizAnswerSelect,
    handleQuizSubmit,
    resetQuiz,
    handlePaymentSuccess,
  };
}
