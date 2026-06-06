import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
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
  refreshCourseContent: (courseId: number) => void | Promise<void>;
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
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoProgress, setVideoProgress] = useState(30);
  const [videoSpeed, setVideoSpeed] = useState("1.0x");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isVideoPlaying) {
      intervalRef.current = setInterval(() => {
        setVideoProgress((prev) => {
          if (prev >= 100) {
            setIsVideoPlaying(false);
            return 100;
          }
          return prev + 1;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isVideoPlaying]);

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

  const handlePaymentSuccess = async (courseId: number, amountPaid: number) => {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;

    let enrollmentUser: AppUser | null = null;
    let enrollmentInvoice: Invoice | undefined;

    try {
      const enrollment = await api.enrollMock(courseId);
      if (enrollment.user) {
        enrollmentUser = enrollment.user;
        enrollmentInvoice = enrollment.invoice;
      }
    } catch (err: any) {
      if (err?.status !== 403) throw err;
    }

    const user = enrollmentUser || await api.me();
    updateSessionUser(user);
    setEnrolledCourses(user.enrolledCourses || []);
    setInvoices(user.invoices || []);

    const newInvoice: Invoice = {
      id: enrollmentInvoice?.id || `INV-2026-00${invoices.length + 1}`,
      date: new Date().toLocaleDateString("fr-FR"),
      courseTitle: course.title,
      amount: enrollmentInvoice?.amount ?? amountPaid,
      status: "Payé",
    };

    if (!enrollmentUser) setInvoices((prev) => [newInvoice, ...prev]);

    console.info("[student] Enrollment synchronized with backend", { courseId, invoiceId: newInvoice.id });
    setSelectedCourse(course);
    setSelectedModule(course.modules?.[0] || null);
    setIsVideoPlaying(false);
    setVideoProgress(15);
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
    isVideoPlaying,
    setIsVideoPlaying,
    videoProgress,
    setVideoProgress,
    videoSpeed,
    setVideoSpeed,
    markModuleCompleted,
    handleQuizAnswerSelect,
    handleQuizSubmit,
    resetQuiz,
    handlePaymentSuccess,
  };
}
