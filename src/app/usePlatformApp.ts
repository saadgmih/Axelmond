import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { getClientErrorMessage } from "../client-errors";
import { useLocation } from "react-router-dom";
import { api, getFreshSessionToken } from "../api";
import type { AppUser } from "../components/AuthScreen";
import { uploadFiles, getUploadedFileUrl, getUploadErrorMessage, validateUploadFile } from "../uploadthing-client";
import { useLiveKitSession } from "../context/livekit-session-context";
import { useNotifications } from "../hooks/useNotifications";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { useMessagingSocket } from "../hooks/useMessagingSocket";
import { scrollAppToTopDeferred } from "../utils/scroll-app-to-top";
import { useCourseContent } from "../hooks/useCourseContent";
import { useTeacherCurriculum } from "../hooks/useTeacherCurriculum";
import { useAppSession } from "../hooks/useAppSession";
import { usePlatformNavigation } from "../hooks/usePlatformNavigation";
import { useAcademicProfile } from "../hooks/useAcademicProfile";
import { useAsyncEffectGuard } from "../hooks/useAsyncEffectGuard";
import { useTeacherDashboard } from "../hooks/useTeacherDashboard";
import { useStudentCourseSession } from "../hooks/useStudentCourseSession";
import { isStudentRole } from "../rbac";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import type { AppNotification } from "../types/messaging";
import type { Course, CourseModule, FacultyDomain } from "../types";
import { getInitials } from "./catalogIcons";

export function usePlatformApp() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [domains, setDomains] = useState<FacultyDomain[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<string>("dashboard"); // 'dashboard', 'catalog', 'course', 'profile', 'live'
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedDomainId, setSelectedDomainId] = useState<number | null>(null);
  const [selectedDisciplineId, setSelectedDisciplineId] = useState<number | null>(null);
  const [activeLiveCourse, setActiveLiveCourse] = useState<Course | null>(null);
  const [selectedModule, setSelectedModule] = useState<CourseModule | null>(null);
  const [teacherView, setTeacherView] = useState<string>("dashboard"); // 'dashboard', 'curriculum', 'live-control'

  const {
    courseContentSections,
    setCourseContentSections,
    selectedLessonContent,
    setSelectedLessonContent,
    flattenSections,
    refreshCourseContent,
  } = useCourseContent();

  const onSessionExpiredRef = useRef<() => void>(() => {});

  const {
    currentUser,
    isAuthReady,
    role,
    enrolledCourses,
    setEnrolledCourses,
    invoices,
    setInvoices,
    updateSessionUser,
    handleLoginSuccess,
    handleLogout: logoutAuth,
  } = useAppSession({
    setCourses,
    onAfterLogin: (user) => {
      if (!isStudentRole(user.role)) {
        setTeacherView("dashboard");
      } else {
        setCurrentView("dashboard");
      }
    },
    onSessionExpired: () => onSessionExpiredRef.current(),
  });

  // Fetch courses from API on mount
  const { startRequest: startCatalogRequest } = useAsyncEffectGuard();

  useEffect(() => {
    const request = startCatalogRequest();
    Promise.all([api.getCourses(), api.getDomains()])
      .then(([courseData, domainData]) => {
        if (!request.isActive()) return;
        setCourses(courseData);
        setDomains(domainData);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!request.isActive()) return;
        console.error("Failed to fetch academic catalog:", err);
        setIsLoading(false);
      });
  }, [startCatalogRequest]);

  useEffect(() => {
    document.documentElement.classList.add("dark");
    localStorage.removeItem("axelmond_theme");
  }, []);

  const [avatarStatusMsg, setAvatarStatusMsg] = useState("");

  // Live broadcast controls (Teacher side — course selection stays in App)
  const [liveCourseId, setLiveCourseId] = useState<number>(1);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [courseToPurchase, setCourseToPurchase] = useState<Course | null>(null);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const catalogSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileMenuOpen]);

  const allDisciplines = domains.flatMap((domain) => domain.disciplines);
  const selectedDomain = domains.find((domain) => domain.id === selectedDomainId) || null;
  const selectedDiscipline = allDisciplines.find((discipline) => discipline.id === selectedDisciplineId) || null;
  const managedCourses =
    role === "teacher" && currentUser?.role !== "ADMIN"
      ? courses.filter((course) => course.createdById === currentUser?.id)
      : courses;
  const managedCourseIds = managedCourses.map((course) => course.id).join(",");

  const curriculumBindings = {
    ...useTeacherCurriculum({
      courses,
      setCourses,
      managedCourses,
      managedCourseIds,
      allDisciplines,
      currentUser,
      role,
      courseContent: {
        courseContentSections,
        setCourseContentSections,
        flattenSections,
        refreshCourseContent,
      },
    }),
    allDisciplines,
    managedCourses,
  };

  const { newSectionCourseId, quizCourseId } = curriculumBindings;

  const teacherDashboardBindings = {
    ...useTeacherDashboard({
      role,
      courses,
      setCourses,
      managedCourses,
      currentUser,
      setActiveLiveCourse,
    }),
    managedCourses,
    courses,
  };

  const { setGradesCourseId, handleToggleCourseLive, handleUpdateCourseLiveSubject } = teacherDashboardBindings;

  useEffect(() => {
    if (role !== "teacher") return;
    if (managedCourses.length === 0) return;
    if (!managedCourses.some((course) => course.id === newSectionCourseId)) {
      const firstManagedCourseId = managedCourses[0].id;
      setLiveCourseId(firstManagedCourseId);
      setGradesCourseId(firstManagedCourseId);
    }
  }, [role, managedCourseIds, newSectionCourseId, managedCourses]);

  const studentCourseSession = useStudentCourseSession({
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
  });

  const { setQuizAnswers, setQuizSubmitted, setQuizScore, setQuizSubmitError, handlePaymentSuccess } =
    studentCourseSession;

  const studentCourseBindings = {
    ...studentCourseSession,
    courseContentSections,
    flattenSections,
    selectedLessonContent,
    setSelectedLessonContent,
  };

  useEffect(() => {
    if (!isAuthReady || !currentUser || !isStudentRole(currentUser.role)) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("canceled") !== "true") return;

    params.delete("canceled");
    const nextQuery = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`);
  }, [isAuthReady, currentUser?.id]);

  const { navigateTo, handleTeacherViewChange } = usePlatformNavigation({
    currentUser,
    currentView,
    setCurrentView,
    teacherView,
    setTeacherView,
    enrolledCourses,
    courses,
    setSelectedCourse,
    setSelectedModule,
    setActiveLiveCourse,
    setCourseToPurchase,
    setIsMobileMenuOpen,
    setQuizAnswers,
    setQuizSubmitted,
    setQuizScore,
    setQuizSubmitError,
  });

  const location = useLocation();
  useLayoutEffect(() => {
    if (!currentUser) return;
    scrollAppToTopDeferred();
  }, [currentUser, location.pathname, location.key, currentView, teacherView]);

  const {
    notifications,
    unreadCount: notificationUnreadCount,
    loading: notificationsLoading,
    error: notificationsError,
    loadNotifications,
    markRead: markNotificationRead,
    markAllRead: markAllNotificationsRead,
    pushNotification,
  } = useNotifications(isAuthReady && !!currentUser);

  const {
    status: pushStatus,
    statusKind: pushStatusKind,
    subscribe: subscribePushNotifications,
  } = usePushNotifications(isAuthReady && !!currentUser);

  useMessagingSocket(isAuthReady && !!currentUser, {
    onNotification: (payload) => {
      if (payload && typeof payload === "object") {
        pushNotification(payload as AppNotification);
      }
    },
  });

  const openNotificationsView = () => {
    if (role === "teacher") handleTeacherViewChange("notifications");
    else navigateTo("notifications");
  };

  const handleNotificationNavigate = (notification: AppNotification) => {
    const { actionUrl, metadata } = notification;

    if (actionUrl.includes("messages")) {
      const conversationId =
        typeof metadata.conversationId === "string"
          ? metadata.conversationId
          : new URL(actionUrl, window.location.origin).searchParams.get("conversation");
      const messagesPath = role === "teacher" ? "/teacher/messages" : "/student/messages";
      if (conversationId) {
        window.history.replaceState(null, "", `${messagesPath}?conversation=${encodeURIComponent(conversationId)}`);
      }
      if (role === "teacher") handleTeacherViewChange("messages");
      else navigateTo("messages");
      return;
    }

    if (actionUrl.includes("live")) {
      const courseId = Number(metadata.courseId);
      const liveCourse =
        (Number.isFinite(courseId)
          ? courses.find((course) => course.id === courseId && enrolledCourses.includes(course.id))
          : null) ??
        courses.find((course) => enrolledCourses.includes(course.id) && course.isLiveNow) ??
        null;
      if (liveCourse) navigateTo("live", liveCourse);
      return;
    }

    if (actionUrl.includes("course")) {
      const courseId = Number(metadata.courseId);
      const targetCourse =
        (Number.isFinite(courseId)
          ? courses.find((course) => course.id === courseId && enrolledCourses.includes(course.id))
          : null) ??
        courses.find((course) => enrolledCourses.includes(course.id)) ??
        null;
      if (targetCourse) navigateTo("course", targetCourse);
      else navigateTo("catalog");
    }
  };

  const academicProfileBindings = useAcademicProfile({
    role,
    teacherView,
    currentUser,
    updateSessionUser,
  });

  const { setAcademicProfileForm } = academicProfileBindings;

  const { toggleTeacherLiveSession, disconnectLiveSession, renderLiveRoomInterface, classroomBindings } =
    useLiveKitSession();

  onSessionExpiredRef.current = disconnectLiveSession;

  const needsLiveKitSession =
    (role === "teacher" && teacherView === "live-control") ||
    (role === "student" && currentView === "live" && !!activeLiveCourse);

  const isStudentLive = role === "student" && currentView === "live" && !!activeLiveCourse;
  const isTeacherLiveRoom = role === "teacher" && teacherView === "live-control" && !!activeLiveCourse;
  const isLiveSessionView = isStudentLive || isTeacherLiveRoom;
  const lockMainScroll = currentView === "course" || isStudentLive;
  const hideGlobalFooter = currentView === "course" || isLiveSessionView;

  useKeyboardShortcuts(
    [
      {
        key: "Escape",
        handler: () => {
          if (showKeyboardHelp) {
            setShowKeyboardHelp(false);
            return;
          }
          if (courseToPurchase) {
            setCourseToPurchase(null);
            return;
          }
          if (isMobileMenuOpen) {
            setIsMobileMenuOpen(false);
            return;
          }
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => undefined);
          }
        },
      },
      {
        key: "/",
        when: () => role === "student" && currentView === "catalog" && !isStudentLive,
        handler: () => {
          catalogSearchRef.current?.focus();
        },
      },
      {
        key: "?",
        when: () => !isStudentLive && !isTeacherLiveRoom,
        handler: () => setShowKeyboardHelp(true),
      },
      {
        key: "/",
        shift: true,
        when: () => !isStudentLive && !isTeacherLiveRoom,
        handler: () => setShowKeyboardHelp(true),
      },
    ],
    Boolean(currentUser),
    [
      showKeyboardHelp,
      courseToPurchase,
      isMobileMenuOpen,
      currentView,
      role,
      isStudentLive,
      isTeacherLiveRoom,
      currentUser,
    ],
  );

  const handleLogout = () => {
    logoutAuth();
    disconnectLiveSession();
  };

  const handleUploadAvatarFile = async (file: File) => {
    const token = await getFreshSessionToken();
    if (!currentUser || !token) {
      setAvatarStatusMsg("Session expirée. Reconnectez-vous.");
      return;
    }

    const validationError = validateUploadFile(file, "AVATAR");
    if (validationError) {
      setAvatarStatusMsg(validationError);
      return;
    }

    try {
      setAvatarStatusMsg("Téléversement de la photo...");
      const result = await (uploadFiles as any)("avatarImage", {
        files: [file],
        headers: { Authorization: `Bearer ${token}` },
        onUploadProgress: ({ progress }: { progress: number }) =>
          setAvatarStatusMsg(`Téléversement de la photo : ${progress}%`),
      });
      const avatarUrl = getUploadedFileUrl(result?.[0]);
      if (!avatarUrl) throw new Error("URL de photo introuvable après téléversement");
      const updatedUser = { ...currentUser, avatarUrl };
      updateSessionUser(updatedUser);
      setAcademicProfileForm((prev) => ({ ...prev, avatarUrl }));
      setAvatarStatusMsg("Photo de profil mise à jour.");
    } catch (err: any) {
      console.error("Failed to upload avatar:", err);
      setAvatarStatusMsg(getUploadErrorMessage(err));
      throw err;
    }
  };

  const handleDeleteAvatar = async () => {
    if (!currentUser) return;
    try {
      const response = await api.deleteAvatar();
      const updatedUser = response.user ? (response.user as AppUser) : { ...currentUser, avatarUrl: undefined };
      updateSessionUser(updatedUser);
      setAcademicProfileForm((prev) => ({ ...prev, avatarUrl: "" }));
      setAvatarStatusMsg(response.message || "Photo de profil supprimée.");
    } catch (err: any) {
      setAvatarStatusMsg(getClientErrorMessage(err, "Suppression de la photo impossible."));
    }
  };

  const catalogCourses = courses.filter((c) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      c.title.toLowerCase().includes(searchLower) ||
      c.category.toLowerCase().includes(searchLower) ||
      c.level.toLowerCase().includes(searchLower) ||
      c.discipline?.name.toLowerCase().includes(searchLower) ||
      c.discipline?.domain?.name.toLowerCase().includes(searchLower);
    if (!matchesSearch) return false;
    if (selectedDisciplineId) return c.disciplineId === selectedDisciplineId;
    if (selectedDomainId) return c.discipline?.domainId === selectedDomainId;
    return true;
  });
  return {
    courses,
    setCourses,
    domains,
    isLoading,
    isAuthReady,
    currentUser,
    role,
    enrolledCourses,
    invoices,
    handleLoginSuccess,
    currentView,
    teacherView,
    selectedCourse,
    setSelectedCourse,
    selectedModule,
    setSelectedModule,
    setSelectedLessonContent,
    activeLiveCourse,
    setActiveLiveCourse,
    liveCourseId,
    setLiveCourseId,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    searchQuery,
    setSearchQuery,
    courseToPurchase,
    setCourseToPurchase,
    showKeyboardHelp,
    setShowKeyboardHelp,
    catalogSearchRef,
    selectedDomain,
    selectedDiscipline,
    setSelectedDomainId,
    setSelectedDisciplineId,
    catalogCourses,
    curriculumBindings,
    quizCourseId,
    teacherDashboardBindings,
    handleToggleCourseLive,
    handleUpdateCourseLiveSubject,
    studentCourseBindings,
    handlePaymentSuccess,
    navigateTo,
    handleTeacherViewChange,
    notifications,
    notificationUnreadCount,
    notificationsLoading,
    notificationsError,
    loadNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    openNotificationsView,
    handleNotificationNavigate,
    pushStatus,
    pushStatusKind,
    subscribePushNotifications,
    academicProfileBindings,
    avatarStatusMsg,
    handleUploadAvatarFile,
    handleDeleteAvatar,
    toggleTeacherLiveSession,
    renderLiveRoomInterface,
    classroomBindings,
    needsLiveKitSession,
    isStudentLive,
    isTeacherLiveRoom,
    isLiveSessionView,
    lockMainScroll,
    hideGlobalFooter,
    handleLogout,
    updateSessionUser,
    setEnrolledCourses,
    setInvoices,
    setTeacherView,
    setCurrentView,
    getInitials,
  };
}
