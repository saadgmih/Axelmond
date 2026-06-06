import { useEffect, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { api } from "../api";
import type { AppUser } from "../components/AuthScreen";
import type { Course, CourseGrade } from "../types";

export interface UseTeacherDashboardOptions {
  role: string;
  courses: Course[];
  setCourses: Dispatch<SetStateAction<Course[]>>;
  managedCourses: Course[];
  currentUser: AppUser | null;
  setActiveLiveCourse: Dispatch<SetStateAction<Course | null>>;
}

export function useTeacherDashboard({
  role,
  courses,
  setCourses,
  managedCourses,
  currentUser,
  setActiveLiveCourse,
}: UseTeacherDashboardOptions) {
  const [teacherChartTab, setTeacherChartTab] = useState<"revenue" | "engagement">("revenue");
  const [gradesCourseId, setGradesCourseId] = useState<number>(1);
  const [courseGrades, setCourseGrades] = useState<CourseGrade[]>([]);
  const [gradesStatusMsg, setGradesStatusMsg] = useState("");
  const [testEmailTo, setTestEmailTo] = useState("");
  const [testEmailStatusMsg, setTestEmailStatusMsg] = useState("");
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [emailDeliverySummary, setEmailDeliverySummary] = useState<any | null>(null);
  const [emailDeliveryStatusMsg, setEmailDeliveryStatusMsg] = useState("");

  useEffect(() => {
    if (courses.length && !courses.some((course) => course.id === gradesCourseId)) {
      setGradesCourseId(courses[0].id);
    }
  }, [courses, gradesCourseId]);

  useEffect(() => {
    if (role !== "teacher" || !gradesCourseId) return;
    let disposed = false;
    setGradesStatusMsg("Chargement des notes réelles...");
    api.getCourseGrades(gradesCourseId)
      .then((grades) => {
        if (disposed) return;
        setCourseGrades(grades);
        setGradesStatusMsg(grades.length ? "" : "Aucun étudiant inscrit à ce module.");
      })
      .catch((err) => {
        if (disposed) return;
        console.error("Failed to fetch course grades:", err);
        setCourseGrades([]);
        setGradesStatusMsg(err.message || "Notes indisponibles.");
      });
    return () => {
      disposed = true;
    };
  }, [role, gradesCourseId, courses.length]);

  const refreshEmailDeliverySummary = async () => {
    if (currentUser?.role !== "ADMIN") return;
    try {
      const summary = await api.getEmailDeliverySummary();
      setEmailDeliverySummary(summary);
      setEmailDeliveryStatusMsg("");
    } catch (err: any) {
      setEmailDeliveryStatusMsg(err.message || "Diagnostic SMTP indisponible");
    }
  };

  useEffect(() => {
    if (currentUser?.role === "ADMIN") {
      refreshEmailDeliverySummary();
    } else {
      setEmailDeliverySummary(null);
      setEmailDeliveryStatusMsg("");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, currentUser?.role]);

  const handleUpdateCoursePrice = async (id: number, newPrice: number) => {
    try {
      const updatedCourse = await api.updateCourse(id, { price: Number(newPrice.toFixed(2)) });
      setCourses((prev) =>
        prev.map((c) => (c.id === id ? updatedCourse : c))
      );
    } catch (err) {
      console.error("Failed to update course price:", err);
    }
  };

  const handleToggleCourseLive = async (id: number) => {
    const course = courses.find((c) => c.id === id);
    if (!course) return;
    const nextState = !course.isLiveNow;
    try {
      const updatedCourse = await api.updateCourse(id, {
        isLiveNow: nextState,
        liveSubject: nextState
          ? course.liveSubject || "Rotation d'arbres AVL & complexités algorithmiques"
          : null,
      });
      setCourses((prev) =>
        prev.map((c) => (c.id === id ? updatedCourse : c))
      );
      setActiveLiveCourse((current) => (current?.id === id ? updatedCourse : current));
    } catch (err) {
      console.error("Failed to toggle course live:", err);
    }
  };

  const handleUpdateCourseLiveSubject = async (id: number, liveSubject: string) => {
    try {
      const updatedCourse = await api.updateCourse(id, { liveSubject: liveSubject.trim() || null });
      setCourses((prev) =>
        prev.map((c) => (c.id === id ? updatedCourse : c))
      );
      setActiveLiveCourse((current) => (current?.id === id ? updatedCourse : current));
    } catch (err) {
      console.error("Failed to update course live subject:", err);
    }
  };

  const handleSendTestEmail = async (e: FormEvent) => {
    e.preventDefault();
    if (!testEmailTo.trim()) return;
    setIsSendingTestEmail(true);
    setTestEmailStatusMsg("Envoi du diagnostic SMTP...");
    try {
      const response = await api.sendTestEmail(testEmailTo.trim());
      setTestEmailStatusMsg(response.message || "E-mail de diagnostic envoyé");
      refreshEmailDeliverySummary();
    } catch (err: any) {
      setTestEmailStatusMsg(err.message || "Échec d'envoi SMTP");
      refreshEmailDeliverySummary();
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  const formatEmailLogDate = (value?: string) => {
    if (!value) return "Aucun envoi";
    return new Date(value).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
  };

  const selectedGradesCourse = managedCourses.find((course) => course.id === gradesCourseId) || managedCourses[0] || null;

  const getGradeBadgeClass = (score: number | null) => {
    if (score === null) return "text-slate-500 bg-slate-100";
    if (score >= 16) return "text-emerald-700 bg-emerald-50";
    if (score >= 10) return "text-indigo-700 bg-indigo-50";
    return "text-red-700 bg-red-50";
  };

  return {
    teacherChartTab,
    setTeacherChartTab,
    gradesCourseId,
    setGradesCourseId,
    courseGrades,
    gradesStatusMsg,
    testEmailTo,
    setTestEmailTo,
    testEmailStatusMsg,
    isSendingTestEmail,
    emailDeliverySummary,
    emailDeliveryStatusMsg,
    formatEmailLogDate,
    handleSendTestEmail,
    handleUpdateCoursePrice,
    handleToggleCourseLive,
    handleUpdateCourseLiveSubject,
    selectedGradesCourse,
    getGradeBadgeClass,
  };
}
