import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { api } from "../api";
import type { AppUser } from "../components/AuthScreen";
import type { Course, CourseModule, Invoice } from "../types";

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
  invoices,
  setCurrentView,
  setIsMobileMenuOpen,
}: UseStudentCourseSessionOptions) {
  const [quizQuestions, setQuizQuestions] = useState<any[] | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [quizSubmitError, setQuizSubmitError] = useState("");
  const [showAITutor, setShowAITutor] = useState(false);

  useEffect(() => {
    if (selectedModule && selectedModule.type === "quiz") {
      api.getQuiz(selectedModule.id)
        .then((data) => setQuizQuestions(data))
        .catch((err) => { console.error("Failed to fetch quiz:", err); setQuizQuestions(null); });
    } else {
      setQuizQuestions(null);
    }
  }, [selectedModule]);

  useEffect(() => {
    if (!currentUser || currentView !== "course" || !selectedCourse) return;
    refreshCourseContent(selectedCourse.id);
  }, [currentUser?.id, currentView, selectedCourse?.id, refreshCourseContent]);

  const markModuleCompleted = async (modId: number) => {
    if (!selectedCourse) return;
    try {
      const updatedCourse = await api.completeModule(selectedCourse.id, modId);
      setCourses((prev) => prev.map((c) => (c.id === updatedCourse.id ? updatedCourse : c)));
      setSelectedCourse(updatedCourse);
      const mod = updatedCourse.modules.find((m: CourseModule) => m.id === modId);
      if (mod) setSelectedModule(mod);
    } catch (err) {
      console.error("Failed to mark module as completed:", err);
    }
  };

  const handlePaymentSuccess = async (courseId: number, _amountPaid: number, syncedUser?: AppUser) => {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;

    if (!syncedUser) {
      throw new Error("Inscription non confirmée par le serveur. Contactez le support.");
    }
    if (!syncedUser.enrolledCourses?.includes(courseId)) {
      throw new Error("Inscription non confirmée pour ce module.");
    }

    updateSessionUser(syncedUser);
    setEnrolledCourses(syncedUser.enrolledCourses || []);
    setInvoices(syncedUser.invoices || []);
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
    } catch (err) {
      console.error("Failed to persist quiz attempt:", err);
      setQuizSubmitError(err instanceof Error ? err.message : "Enregistrement du quiz impossible.");
      return;
    }

    setQuizScore(correctCount);
    setQuizSubmitted(true);

    const updatedCourses = courses.map((c) => {
      if (c.id === selectedCourse.id) {
        const updatedModules = c.modules.map((m) => {
          if (m.id === selectedModule.id) {
            return {
              ...m,
              completed: true,
              score: `${correctCount}/${questions.length}`,
            };
          }
          return m;
        });

        const completedCount = updatedModules.filter((m) => m.completed).length;
        const totalCount = updatedModules.length;
        const progressPercentage = Math.round((completedCount / totalCount) * 100);

        return {
          ...c,
          modules: updatedModules,
          progress: progressPercentage,
        };
      }
      return c;
    });

    setCourses(updatedCourses);
    const activeC = updatedCourses.find((c) => c.id === selectedCourse.id);
    if (activeC) {
      setSelectedCourse(activeC);
      const activeMod = activeC.modules.find((m) => m.id === selectedModule.id);
      if (activeMod) setSelectedModule(activeMod);
    }
  };

  const resetQuiz = () => {
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(null);
    setQuizSubmitError("");
  };

  return {
    quizQuestions,
    quizAnswers,
    setQuizAnswers,
    quizSubmitted,
    setQuizSubmitted,
    quizScore,
    setQuizScore,
    quizSubmitError,
    setQuizSubmitError,
    showAITutor,
    setShowAITutor,
    markModuleCompleted,
    handleQuizAnswerSelect,
    handleQuizSubmit,
    resetQuiz,
    handlePaymentSuccess,
  };
}
