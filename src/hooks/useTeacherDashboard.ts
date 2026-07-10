import { useEffect, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { getClientErrorMessage } from "../client-errors";
import { api, getFreshSessionToken, type SiteSettings } from "../api";
import type { AppUser } from "../components/AuthScreen";
import type { Course, CourseGrade, FacultyDomain } from "../types";
import { findLiveCourse } from "../utils/live-course-selection";
import { normalizeCoursePrice } from "../utils/course-pricing";
import { applyForceDesktopMode } from "../utils/force-desktop-mode";

export interface AcademicDomainInput {
  name: string;
  slug?: string;
  iconName?: string;
  color?: string;
  description?: string;
  order?: number;
}

export interface AcademicDisciplineInput {
  name: string;
  slug?: string;
  order?: number;
  domainId?: number;
}

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
  domains: FacultyDomain[];
  setDomains: Dispatch<SetStateAction<FacultyDomain[]>>;
  managedCourses: Course[];
  currentUser: AppUser | null;
  setActiveLiveCourse: Dispatch<SetStateAction<Course | null>>;
}

export function useTeacherDashboard({
  role,
  courses,
  setCourses,
  domains,
  setDomains,
  managedCourses,
  currentUser,
  setActiveLiveCourse,
}: UseTeacherDashboardOptions) {
  const [teacherChartTab, setTeacherChartTab] = useState<"revenue" | "engagement">("revenue");
  const [gradesCourseId, setGradesCourseId] = useState<number>(1);
  const [courseGrades, setCourseGrades] = useState<CourseGrade[]>([]);
  const [gradesStatusMsg, setGradesStatusMsg] = useState("");
  const [gradesRefreshKey, setGradesRefreshKey] = useState(0);
  const [removingEnrollmentKey, setRemovingEnrollmentKey] = useState<string | null>(null);
  const [testEmailTo, setTestEmailTo] = useState("");
  const [testEmailStatusMsg, setTestEmailStatusMsg] = useState("");
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [emailDeliverySummary, setEmailDeliverySummary] = useState<any | null>(null);
  const [emailDeliveryStatusMsg, setEmailDeliveryStatusMsg] = useState("");
  const [professorInvites, setProfessorInvites] = useState<ProfessorAccessKey[]>([]);
  const [accessKeyStatusMsg, setAccessKeyStatusMsg] = useState("");
  const [isLoadingAccessKeys, setIsLoadingAccessKeys] = useState(false);
  const [isCreatingAccessKey, setIsCreatingAccessKey] = useState(false);
  const [taxonomyStatusMsg, setTaxonomyStatusMsg] = useState("");
  const [isSavingTaxonomy, setIsSavingTaxonomy] = useState(false);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({ forceDesktopMode: false });
  const [siteSettingsStatusMsg, setSiteSettingsStatusMsg] = useState("");
  const [isLoadingSiteSettings, setIsLoadingSiteSettings] = useState(false);
  const [isSavingSiteSettings, setIsSavingSiteSettings] = useState(false);

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

  const refreshCourseGrades = async (courseId = gradesCourseId, options?: { quiet?: boolean }) => {
    if (role !== "teacher" || !courseId) return [];
    if (!options?.quiet) setGradesStatusMsg("Chargement des notes réelles...");
    try {
      const grades = await api.getCourseGrades(courseId);
      if (courseId === gradesCourseId) {
        setCourseGrades(grades);
        setGradesStatusMsg(grades.length ? "" : "Aucun étudiant inscrit à ce module.");
      }
      return grades;
    } catch (err: any) {
      if (courseId === gradesCourseId) {
        setCourseGrades([]);
        setGradesStatusMsg(getClientErrorMessage(err, "Notes indisponibles."));
      }
      throw err;
    }
  };

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

  const refreshSiteSettings = async () => {
    if (currentUser?.role !== "ADMIN") return;
    setIsLoadingSiteSettings(true);
    try {
      const settings = await api.getAdminSiteSettings();
      setSiteSettings(settings);
      setSiteSettingsStatusMsg("");
    } catch (err: any) {
      setSiteSettingsStatusMsg(getClientErrorMessage(err, "Réglage d'affichage indisponible"));
    } finally {
      setIsLoadingSiteSettings(false);
    }
  };

  const refreshAcademicTaxonomy = async (options?: { quiet?: boolean }) => {
    if (currentUser?.role !== "ADMIN") return;
    if (!options?.quiet) setTaxonomyStatusMsg("Synchronisation de la taxonomie...");
    try {
      const token = await getFreshSessionToken();
      if (!token) throw new Error("Session administrateur indisponible pour charger la taxonomie.");
      const [domainData, courseData] = await Promise.all([api.getDomains(), api.getCourses()]);
      setDomains(domainData);
      setCourses(courseData);
      if (!options?.quiet) setTaxonomyStatusMsg("");
    } catch (err: any) {
      setTaxonomyStatusMsg(getClientErrorMessage(err, "Taxonomie académique indisponible"));
    }
  };

  useEffect(() => {
    if (currentUser?.role === "ADMIN") {
      refreshEmailDeliverySummary();
      refreshProfessorInvites();
      refreshSiteSettings();
      refreshAcademicTaxonomy({ quiet: true });
    } else {
      setEmailDeliverySummary(null);
      setEmailDeliveryStatusMsg("");
      setProfessorInvites([]);
      setAccessKeyStatusMsg("");
      setTaxonomyStatusMsg("");
      setSiteSettings({ forceDesktopMode: false });
      setSiteSettingsStatusMsg("");
    }
  }, [currentUser?.id, currentUser?.role]);

  const handleUpdateCoursePrice = async (id: number, newPrice: number) => {
    const normalized = normalizeCoursePrice(newPrice);
    setCourses((prev) => prev.map((c) => (c.id === id ? { ...c, price: normalized } : c)));
    try {
      const updatedCourse = await api.updateCourse(id, { price: normalized });
      setCourses((prev) => prev.map((c) => (c.id === id ? updatedCourse : c)));
    } catch (err) {
      console.error("Failed to update course price:", err);
    }
  };

  const handleToggleCourseLive = async (id: number): Promise<Course | null> => {
    let course = findLiveCourse(courses, id);
    if (!course) {
      try {
        course = await api.getCourse(id);
        setCourses((prev) => [...prev.filter((item) => item.id !== course!.id), course!]);
      } catch (err) {
        console.error("Failed to resolve course before live toggle:", err);
        throw new Error(getClientErrorMessage(err, "Module introuvable pour lancer le live."));
      }
    }

    const nextState = !course.isLiveNow;
    try {
      const updatedCourse = await api.updateCourse(course.id, {
        isLiveNow: nextState,
        liveSubject: nextState ? course.liveSubject?.trim() || "Session live en cours" : null,
      });
      setCourses((prev) => prev.map((c) => (c.id === course!.id ? updatedCourse : c)));
      setActiveLiveCourse((current) => {
        if (current?.id !== course!.id) return current;
        return nextState ? updatedCourse : null;
      });
      return updatedCourse;
    } catch (err) {
      console.error("Failed to toggle course live:", err);
      throw new Error(getClientErrorMessage(err, "Impossible de modifier l'état du live."));
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

  const handleUpdateForceDesktopMode = async (forceDesktopMode: boolean) => {
    if (currentUser?.role !== "ADMIN") return;
    setIsSavingSiteSettings(true);
    setSiteSettingsStatusMsg(forceDesktopMode ? "Activation du mode ordinateur..." : "Retour au mode responsive...");
    try {
      const settings = await api.updateAdminSiteSettings({ forceDesktopMode });
      setSiteSettings(settings);
      applyForceDesktopMode(settings.forceDesktopMode);
      setSiteSettingsStatusMsg(
        settings.forceDesktopMode ? "Mode ordinateur forcé activé." : "Mode responsive restauré.",
      );
    } catch (err: any) {
      setSiteSettingsStatusMsg(getClientErrorMessage(err, "Modification du réglage impossible"));
      await refreshSiteSettings();
    } finally {
      setIsSavingSiteSettings(false);
    }
  };

  const runTaxonomyMutation = async (
    pendingMessage: string,
    successMessage: string,
    mutation: () => Promise<unknown>,
  ) => {
    if (currentUser?.role !== "ADMIN") return;
    setIsSavingTaxonomy(true);
    setTaxonomyStatusMsg(pendingMessage);
    try {
      await mutation();
      await refreshAcademicTaxonomy({ quiet: true });
      setTaxonomyStatusMsg(successMessage);
    } catch (err: any) {
      setTaxonomyStatusMsg(getClientErrorMessage(err, "Action taxonomie impossible"));
      await refreshAcademicTaxonomy({ quiet: true });
    } finally {
      setIsSavingTaxonomy(false);
    }
  };

  const handleCreateAcademicDomain = (data: AcademicDomainInput) =>
    runTaxonomyMutation("Création du domaine...", "Domaine créé.", () => api.createAcademicDomain(data));

  const handleUpdateAcademicDomain = (domainId: number, data: AcademicDomainInput) =>
    runTaxonomyMutation("Modification du domaine...", "Domaine modifié.", () =>
      api.updateAcademicDomain(domainId, data),
    );

  const handleDeleteAcademicDomain = (domainId: number, domainName: string) => {
    const domain = domains.find((item) => item.id === domainId);
    const confirmed =
      typeof window === "undefined" ||
      window.confirm(
        `Supprimer le domaine "${domainName}" ?\n\nLa suppression est refusée s'il contient encore des sous-domaines.`,
      );
    if (!confirmed) return;
    return runTaxonomyMutation("Suppression du domaine...", "Domaine supprimé.", () =>
      api.deleteAcademicDomain(domain?.id || domainId),
    );
  };

  const handleCreateAcademicDiscipline = (domainId: number, data: AcademicDisciplineInput) =>
    runTaxonomyMutation("Création du sous-domaine...", "Sous-domaine créé.", () =>
      api.createAcademicDiscipline(domainId, data),
    );

  const handleUpdateAcademicDiscipline = (disciplineId: number, data: AcademicDisciplineInput) =>
    runTaxonomyMutation("Modification du sous-domaine...", "Sous-domaine modifié.", () =>
      api.updateAcademicDiscipline(disciplineId, data),
    );

  const handleDeleteAcademicDiscipline = (disciplineId: number, disciplineName: string) => {
    const confirmed =
      typeof window === "undefined" ||
      window.confirm(
        `Supprimer le sous-domaine "${disciplineName}" ?\n\nLa suppression est refusée si des modules sont encore rattachés.`,
      );
    if (!confirmed) return;
    return runTaxonomyMutation("Suppression du sous-domaine...", "Sous-domaine supprimé.", () =>
      api.deleteAcademicDiscipline(disciplineId),
    );
  };

  const handleRemoveStudentEnrollment = async (courseId: number, studentId: string, studentName: string) => {
    if (currentUser?.role !== "ADMIN") return;
    const course = courses.find((item) => item.id === courseId);
    const courseTitle = course?.title || "ce module";
    const confirmed =
      typeof window === "undefined" ||
      window.confirm(
        `Retirer ${studentName} de "${courseTitle}" ?\n\nL'étudiant perdra l'accès au module même s'il l'a déjà payé. Les paiements et factures restent conservés.`,
      );
    if (!confirmed) return;

    const key = `${courseId}:${studentId}`;
    setRemovingEnrollmentKey(key);
    setGradesStatusMsg(`Retrait de ${studentName} du module...`);
    try {
      await api.removeStudentFromCourse(courseId, studentId);
      setCourseGrades((prev) => prev.filter((grade) => grade.studentId !== studentId));
      setGradesStatusMsg(`${studentName} a été retiré du module.`);
      setGradesRefreshKey((value) => value + 1);
      await refreshCourseGrades(courseId, { quiet: true });
    } catch (err: any) {
      setGradesStatusMsg(getClientErrorMessage(err, "Retrait de l'étudiant impossible"));
      await refreshCourseGrades(courseId, { quiet: true }).catch(() => undefined);
    } finally {
      setRemovingEnrollmentKey(null);
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
    if (score >= 10) return "text-emerald-700 bg-emerald-50";
    return "text-red-700 bg-red-50";
  };

  return {
    teacherChartTab,
    setTeacherChartTab,
    gradesCourseId,
    setGradesCourseId,
    courseGrades,
    gradesStatusMsg,
    gradesRefreshKey,
    removingEnrollmentKey,
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
    siteSettings,
    siteSettingsStatusMsg,
    isLoadingSiteSettings,
    isSavingSiteSettings,
    taxonomyStatusMsg,
    isSavingTaxonomy,
    formatEmailLogDate,
    handleSendTestEmail,
    refreshProfessorInvites,
    handleCreateProfessorInvite,
    handleDeleteProfessorInvite,
    refreshSiteSettings,
    handleUpdateForceDesktopMode,
    refreshAcademicTaxonomy,
    handleCreateAcademicDomain,
    handleUpdateAcademicDomain,
    handleDeleteAcademicDomain,
    handleCreateAcademicDiscipline,
    handleUpdateAcademicDiscipline,
    handleDeleteAcademicDiscipline,
    handleRemoveStudentEnrollment,
    handleUpdateCoursePrice,
    handleToggleCourseLive,
    handleUpdateCourseLiveSubject,
    selectedGradesCourse,
    getGradeBadgeClass,
  };
}
