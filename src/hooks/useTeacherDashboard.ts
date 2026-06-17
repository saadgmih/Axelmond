import { useEffect, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { getClientErrorMessage } from "../client-errors";
import { api } from "../api";
import type { AppUser } from "../components/AuthScreen";
import type { Course, CourseGrade } from "../types";

export interface ProfessorAccessKey {
  code: string;
  createdAt: string;
  usedAt?: string | null;
  revokedAt?: string | null;
  usedBy?: string | null;
  usedByEmail?: string | null;
  usedByName?: string | null;
}

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
  const [professorInvites, setProfessorInvites] = useState<ProfessorAccessKey[]>([]);
  const [accessKeyStatusMsg, setAccessKeyStatusMsg] = useState("");
  const [isLoadingAccessKeys, setIsLoadingAccessKeys] = useState(false);
  const [isCreatingAccessKey, setIsCreatingAccessKey] = useState(false);

  useEffect(() => {
    if (courses.length && !courses.some((course) => course.id === gradesCourseId)) {
      setGradesCourseId(courses[0].id);
    }
  }, [courses, gradesCourseId]);

  useEffect(() => {
    if (role !== "teacher" || !gradesCourseId) return;
    let disposed = false;
    setGradesStatusMsg("Chargement des notes réelles...");
    api
      .getCourseGrades(gradesCourseId)
      .then((grades) => {
        if (disposed) return;
        setCourseGrades(grades);
        setGradesStatusMsg(grades.length ? "" : "Aucun étudiant inscrit à ce module.");
      })
      .catch((err) => {
        if (disposed) return;
        console.error("Failed to fetch course grades:", err);
        setCourseGrades([]);
        setGradesStatusMsg(getClientErrorMessage(err, "Notes indisponibles."));
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
      setEmailDeliveryStatusMsg(getClientErrorMessage(err, "Résumé e-mail indisponible"));
    }
  };

  const refreshProfessorInvites = async () => {
    if (currentUser?.role !== "ADMIN") return;
    setIsLoadingAccessKeys(true);
    try {
      const invites = await api.getProfessorInvites();
      setProfessorInvites(invites);
      setAccessKeyStatusMsg("");
    } catch (err: any) {
      setAccessKeyStatusMsg(getClientErrorMessage(err, "Clés d'accès indisponibles"));
    } finally {
      setIsLoadingAccessKeys(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === "ADMIN") {
      refreshEmailDeliverySummary();
      refreshProfessorInvites();
    } else {
      setEmailDeliverySummary(null);
      setEmailDeliveryStatusMsg("");
      setProfessorInvites([]);
      setAccessKeyStatusMsg("");
    }
  }, [currentUser?.id, currentUser?.role]);

  const handleUpdateCoursePrice = async (id: number, newPrice: number) => {
    const normalized = Number(newPrice.toFixed(2));
    setCourses((prev) => prev.map((c) => (c.id === id ? { ...c, price: normalized } : c)));
    try {
      const updatedCourse = await api.updateCourse(id, { price: normalized });
      setCourses((prev) => prev.map((c) => (c.id === id ? updatedCourse : c)));
    } catch (err) {
      console.error("Failed to update course price:", err);
    }
  };

  const handleToggleCourseLive = async (id: number): Promise<Course | null> => {
    const course = courses.find((c) => c.id === id);
    if (!course) return null;
    const nextState = !course.isLiveNow;
    try {
      const updatedCourse = await api.updateCourse(id, {
        isLiveNow: nextState,
        liveSubject: nextState ? course.liveSubject || "Rotation d'arbres AVL & complexités algorithmiques" : null,
      });
      setCourses((prev) => prev.map((c) => (c.id === id ? updatedCourse : c)));
      setActiveLiveCourse((current) => {
        if (current?.id !== id) return current;
        return nextState ? updatedCourse : null;
      });
      return updatedCourse;
    } catch (err) {
      console.error("Failed to toggle course live:", err);
      return null;
    }
  };

  const handleUpdateCourseLiveSubject = async (id: number, liveSubject: string) => {
    try {
      const updatedCourse = await api.updateCourse(id, { liveSubject: liveSubject.trim() || null });
      setCourses((prev) => prev.map((c) => (c.id === id ? updatedCourse : c)));
      setActiveLiveCourse((current) => (current?.id === id ? updatedCourse : current));
    } catch (err) {
      console.error("Failed to update course live subject:", err);
    }
  };

  const handleSendTestEmail = async (e: FormEvent) => {
    e.preventDefault();
    if (!testEmailTo.trim()) return;
    setIsSendingTestEmail(true);
    setTestEmailStatusMsg("Envoi de l'e-mail de test...");
    try {
      const response = await api.sendTestEmail(testEmailTo.trim());
      setTestEmailStatusMsg(response.message || "E-mail de test envoyé");
      refreshEmailDeliverySummary();
    } catch (err: any) {
      setTestEmailStatusMsg(getClientErrorMessage(err, "Échec d'envoi de l'e-mail de test"));
      refreshEmailDeliverySummary();
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  const handleCreateProfessorInvite = async () => {
    setIsCreatingAccessKey(true);
    setAccessKeyStatusMsg("Génération de la clé d'accès...");
    try {
      const invite = await api.createProfessorInvite();
      setProfessorInvites((prev) => [invite, ...prev.filter((item) => item.code !== invite.code)]);
      setAccessKeyStatusMsg(`Clé d'accès générée : ${invite.code}`);
    } catch (err: any) {
      setAccessKeyStatusMsg(getClientErrorMessage(err, "Création de la clé impossible"));
      await refreshProfessorInvites();
    } finally {
      setIsCreatingAccessKey(false);
    }
  };

  const handleDeleteProfessorInvite = async (code: string) => {
    if (!code) return;
    setAccessKeyStatusMsg("Suppression de la clé d'accès...");
    try {
      await api.deleteProfessorInvite(code);
      setProfessorInvites((prev) => prev.filter((item) => item.code !== code));
      setAccessKeyStatusMsg("Clé d'accès supprimée.");
    } catch (err: any) {
      setAccessKeyStatusMsg(getClientErrorMessage(err, "Suppression de la clé impossible"));
      await refreshProfessorInvites();
    }
  };

  const formatEmailLogDate = (value?: string) => {
    if (!value) return "Aucun envoi";
    return new Date(value).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
  };

  const selectedGradesCourse =
    managedCourses.find((course) => course.id === gradesCourseId) || managedCourses[0] || null;

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
    professorInvites,
    accessKeyStatusMsg,
    isLoadingAccessKeys,
    isCreatingAccessKey,
    formatEmailLogDate,
    handleSendTestEmail,
    refreshProfessorInvites,
    handleCreateProfessorInvite,
    handleDeleteProfessorInvite,
    handleUpdateCoursePrice,
    handleToggleCourseLive,
    handleUpdateCourseLiveSubject,
    selectedGradesCourse,
    getGradeBadgeClass,
  };
}
