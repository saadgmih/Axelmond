import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../api";
import { useLiveKitSession } from "../context/livekit-session-context";
import { useNotifications } from "../hooks/useNotifications";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { useMessagingSocket } from "../hooks/useMessagingSocket";
import { scrollAppToTopDeferred } from "../utils/scroll-app-to-top";
import { applyForceDesktopMode } from "../utils/force-desktop-mode";
import { useCourseContent } from "../hooks/useCourseContent";
import { useAppSession } from "../hooks/useAppSession";
import { usePlatformNavigation } from "../hooks/usePlatformNavigation";
import { useAcademicProfile } from "../hooks/useAcademicProfile";
import { useStudentCourseSession } from "../hooks/useStudentCourseSession";
import { isStudentRole } from "../rbac";
import type { AppNotification } from "../types/messaging";
import type { Course, CourseModule, FacultyDomain } from "../types";
import { getInitials } from "./catalogIcons";
import { usePlatformCatalogData } from "./hooks/usePlatformCatalogData";
import { useEnrolledCoursesHydration } from "./hooks/useEnrolledCoursesHydration";
import { usePlatformAvatarActions } from "./hooks/usePlatformAvatarActions";
import { usePlatformKeyboardShortcuts } from "./hooks/usePlatformKeyboardShortcuts";
import { usePlatformNotificationHandlers } from "./hooks/usePlatformNotificationHandlers";
import { usePlatformTeacherWorkspace } from "./hooks/usePlatformTeacherWorkspace";
import { useSidebarLayout } from "../hooks/useSidebarLayout";

function readInitialSidebarCollapsed() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem("axelmond_sidebar_collapsed") === "1";
}

export function usePlatformApp() {
  const [currentView, setCurrentView] = useState<string>("dashboard");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [activeLiveCourse, setActiveLiveCourse] = useState<Course | null>(null);
  const [selectedModule, setSelectedModule] = useState<CourseModule | null>(null);
  const [teacherView, setTeacherView] = useState<string>("dashboard");

  const {
    courseContentSections,
    setCourseContentSections,
    selectedLessonContent,
    setSelectedLessonContent,
    flattenSections,
    refreshCourseContent,
  } = useCourseContent();

  const onSessionExpiredRef = useRef<() => void>(() => {});

  const [courses, setCourses] = useState<Course[]>([]);
  const [domains, setDomains] = useState<FacultyDomain[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSiteSettingsReady, setIsSiteSettingsReady] = useState(false);

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
    isLoginDataLoading,
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

  const {
    searchQuery,
    setSearchQuery,
    setSelectedDomainId,
    setSelectedDisciplineId,
    allDisciplines,
    selectedDomain,
    selectedDiscipline,
    catalogCourses,
    catalogError,
    catalogHasData,
    retryCatalogLoad,
  } = usePlatformCatalogData(isAuthReady, currentUser, courses, domains, setCourses, setDomains, setIsLoading);

  const { isEnrolledCatalogSyncing } = useEnrolledCoursesHydration(
    isAuthReady,
    currentUser,
    enrolledCourses,
    courses,
    setCourses,
  );

  useEffect(() => {
    document.documentElement.classList.add("dark");
    localStorage.removeItem("axelmond_theme");
  }, []);

  useEffect(() => {
    let disposed = false;
    api
      .getSiteSettings()
      .then((settings) => {
        if (disposed) return;
        applyForceDesktopMode(settings.forceDesktopMode);
      })
      .catch((err) => {
        console.warn("[site-settings] Failed to load display settings", err);
        if (!disposed) applyForceDesktopMode(false);
      })
      .finally(() => {
        if (!disposed) setIsSiteSettingsReady(true);
      });

    return () => {
      disposed = true;
    };
  }, []);

  const [liveCourseId, setLiveCourseId] = useState<number>(1);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(readInitialSidebarCollapsed);
  const [isTopbarCollapsed, setIsTopbarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("axelmond_topbar_collapsed") === "1";
  });
  const [courseToPurchase, setCourseToPurchase] = useState<Course | null>(null);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const catalogSearchRef = useRef<HTMLInputElement>(null);
  const liveKitRoomRef = useRef<{ closeTeacherLiveRoom: () => Promise<void> } | null>(null);
  const location = useLocation();

  const persistSidebarCollapsed = useCallback((collapsed: boolean) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("axelmond_sidebar_collapsed", collapsed ? "1" : "0");
  }, []);

  const toggleSidebarCollapsed = useCallback(() => {
    setIsSidebarCollapsed((previous) => {
      const next = !previous;
      persistSidebarCollapsed(next);
      return next;
    });
  }, [persistSidebarCollapsed]);

  const sidebarLayoutRef = useRef<boolean | null>(null);
  const { isDrawer } = useSidebarLayout();

  useLayoutEffect(() => {
    const wasDrawer = sidebarLayoutRef.current;
    if (wasDrawer !== null) {
      if (isDrawer && !wasDrawer) {
        setIsMobileMenuOpen(false);
      } else if (!isDrawer && wasDrawer) {
        setIsMobileMenuOpen(false);
        const stored = window.localStorage.getItem("axelmond_sidebar_collapsed");
        setIsSidebarCollapsed(stored === "1");
      }
    }
    sidebarLayoutRef.current = isDrawer;
  }, [isDrawer]);

  useLayoutEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const toggleTopbarCollapsed = useCallback(() => {
    setIsTopbarCollapsed((previous) => {
      const next = !previous;
      if (typeof window !== "undefined") {
        if (next) {
          window.localStorage.setItem("axelmond_topbar_collapsed", "1");
        } else {
          window.localStorage.removeItem("axelmond_topbar_collapsed");
        }
      }
      return next;
    });
  }, []);

  const {
    curriculumBindings,
    quizCourseId,
    teacherDashboardBindings,
    handleToggleCourseLive,
    handleUpdateCourseLiveSubject,
  } = usePlatformTeacherWorkspace({
    role,
    courses,
    setCourses,
    domains,
    setDomains,
    allDisciplines,
    currentUser,
    courseContent: {
      courseContentSections,
      setCourseContentSections,
      flattenSections,
      refreshCourseContent,
    },
    setActiveLiveCourse,
    setLiveCourseId,
  });

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

  const studentCourseBindings = useMemo(
    () => ({
      ...studentCourseSession,
      courseContentSections,
      flattenSections,
      selectedLessonContent,
      setSelectedLessonContent,
    }),
    [studentCourseSession, courseContentSections, flattenSections, selectedLessonContent, setSelectedLessonContent],
  );

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

  const markLiveCourseEnded = useCallback((courseId: number) => {
    setCourses((prev) => prev.map((c) => (c.id === courseId ? { ...c, isLiveNow: false, liveSubject: null } : c)));
    setSelectedCourse((current) =>
      current?.id === courseId ? { ...current, isLiveNow: false, liveSubject: null } : current,
    );
    setActiveLiveCourse((current) => (current?.id === courseId ? null : current));
  }, []);

  const refreshCourseSnapshot = useCallback(async (courseId: number) => {
    try {
      const refreshedCourse = await api.getCourse(courseId);
      setCourses((prev) => prev.map((course) => (course.id === courseId ? refreshedCourse : course)));
      setSelectedCourse((current) => (current?.id === courseId ? refreshedCourse : current));
      setSelectedModule((current) => {
        if (!current) return current;
        return refreshedCourse.modules.find((module: CourseModule) => module.id === current.id) ?? current;
      });
    } catch (err) {
      console.warn("[student] Failed to refresh course after quiz notification", err);
    }
  }, []);

  const {
    status: pushStatus,
    statusKind: pushStatusKind,
    subscribe: subscribePushNotifications,
  } = usePushNotifications(isAuthReady && !!currentUser);

  useMessagingSocket(isAuthReady && !!currentUser, {
    onNotification: (payload) => {
      if (payload && typeof payload === "object") {
        pushNotification(payload as AppNotification);

        const notification = payload as any;
        if (notification.type === "LIVE_FINISHED") {
          const courseId = Number(notification.metadata?.courseId);
          if (courseId) {
            markLiveCourseEnded(courseId);
            if (activeLiveCourse?.id === courseId) {
              disconnectLiveSession();
              setCurrentView("dashboard");
              alert("La session live a été terminée par le professeur.");
            }
          }
        } else if (notification.type === "NEW_QUIZ") {
          const courseId = Number(notification.metadata?.courseId);
          if (courseId) {
            void refreshCourseSnapshot(courseId);
          }
        } else if (notification.type === "LIVE_STARTED") {
          const courseId = Number(notification.metadata?.courseId);
          if (courseId) {
            const liveSubject = notification.body ? notification.body.replace(" est en direct", "") : null;
            setCourses((prev) =>
              prev.map((c) =>
                c.id === courseId
                  ? {
                      ...c,
                      isLiveNow: true,
                      liveSubject,
                    }
                  : c,
              ),
            );
            setSelectedCourse((current) =>
              current?.id === courseId ? { ...current, isLiveNow: true, liveSubject } : current,
            );
          }
        }
      }
    },
  });

  const { openNotificationsView, handleNotificationNavigate } = usePlatformNotificationHandlers({
    role,
    courses,
    enrolledCourses,
    navigateTo,
    handleTeacherViewChange,
  });

  const academicProfileBindings = useAcademicProfile({
    role,
    teacherView,
    currentUser,
  });

  const { setAcademicProfileForm } = academicProfileBindings;

  const { avatarStatusMsg, handleUploadAvatarFile, handleDeleteAvatar } = usePlatformAvatarActions(
    currentUser,
    updateSessionUser,
    setAcademicProfileForm,
  );

  const { disconnectLiveSession, renderLiveRoomInterface, classroomBindings } = useLiveKitSession();

  const toggleTeacherLiveSession = useCallback(
    async (courseId: number, toggleCourseLive: (id: number) => Promise<Course | null>) => {
      const course = courses.find((c) => c.id === courseId);
      if (!course) return;

      const isRoomOpen = activeLiveCourse?.id === courseId;

      if (course.isLiveNow) {
        if (isRoomOpen) {
          if (liveKitRoomRef.current) {
            await liveKitRoomRef.current.closeTeacherLiveRoom();
          } else {
            api.leaveLiveAttendance(courseId).catch((err) => console.warn("[livekit] Attendance leave failed", err));
            setActiveLiveCourse(null);
          }
          await toggleCourseLive(courseId);
        } else {
          setSelectedCourse(course);
          setActiveLiveCourse(course);
          setTeacherView("live-control");
        }
        return;
      }

      const updatedCourse = await toggleCourseLive(courseId);
      if (updatedCourse) {
        setSelectedCourse(updatedCourse);
        setActiveLiveCourse(updatedCourse);
        setTeacherView("live-control");
      }
    },
    [courses, activeLiveCourse?.id, setActiveLiveCourse, setSelectedCourse, setTeacherView, liveKitRoomRef],
  );

  onSessionExpiredRef.current = disconnectLiveSession;

  const needsLiveKitSession =
    (role === "teacher" && teacherView === "live-control") ||
    (role === "student" && currentView === "live" && !!activeLiveCourse);

  const isStudentLive = role === "student" && currentView === "live" && !!activeLiveCourse;
  const isTeacherLiveRoom = role === "teacher" && teacherView === "live-control" && !!activeLiveCourse;
  const isLiveSessionView = isStudentLive || isTeacherLiveRoom;
  const lockMainScroll = currentView === "course" || isStudentLive;
  const hideGlobalFooter = currentView === "course" || isLiveSessionView;

  usePlatformKeyboardShortcuts({
    showKeyboardHelp,
    setShowKeyboardHelp,
    courseToPurchase,
    setCourseToPurchase,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    currentView,
    role,
    isStudentLive,
    isTeacherLiveRoom,
    catalogSearchRef,
    currentUserId: currentUser?.id,
  });

  const handleLogout = useCallback(() => {
    logoutAuth();
    disconnectLiveSession();
  }, [logoutAuth, disconnectLiveSession]);

  const notificationsValue = useMemo(
    () => ({
      notifications,
      notificationUnreadCount,
      notificationsLoading,
      notificationsError,
      loadNotifications,
      markNotificationRead,
      markAllNotificationsRead: markAllNotificationsRead,
      handleNotificationNavigate,
      pushStatus,
      pushStatusKind,
      subscribePushNotifications,
    }),
    [
      notifications,
      notificationUnreadCount,
      notificationsLoading,
      notificationsError,
      loadNotifications,
      markNotificationRead,
      markAllNotificationsRead,
      handleNotificationNavigate,
      pushStatus,
      pushStatusKind,
      subscribePushNotifications,
    ],
  );

  const session = useMemo(
    () => ({
      currentUser,
      isLoading: isLoading || !isSiteSettingsReady,
      isAuthReady,
      role,
      enrolledCourses,
      setEnrolledCourses,
      invoices,
      setInvoices,
      updateSessionUser,
      handleLoginSuccess,
      handleLogout,
      catalogError,
      catalogHasData,
      retryCatalogLoad,
      notificationUnreadCount,
      openNotificationsView,
      isLoginDataLoading,
      isEnrolledCatalogSyncing,
    }),
    [
      currentUser,
      isLoading,
      isSiteSettingsReady,
      isAuthReady,
      role,
      enrolledCourses,
      setEnrolledCourses,
      invoices,
      setInvoices,
      updateSessionUser,
      handleLoginSuccess,
      handleLogout,
      catalogError,
      catalogHasData,
      retryCatalogLoad,
      notificationUnreadCount,
      openNotificationsView,
      isLoginDataLoading,
      isEnrolledCatalogSyncing,
    ],
  );

  const catalog = useMemo(
    () => ({
      courses,
      setCourses,
      domains,
      catalogCourses,
      selectedDomain,
      selectedDiscipline,
      setSelectedDomainId,
      setSelectedDisciplineId,
      searchQuery,
      setSearchQuery,
      catalogSearchRef,
      getInitials,
    }),
    [
      courses,
      setCourses,
      domains,
      catalogCourses,
      selectedDomain,
      selectedDiscipline,
      setSelectedDomainId,
      setSelectedDisciplineId,
      searchQuery,
      setSearchQuery,
      catalogSearchRef,
      getInitials,
    ],
  );

  const navigation = useMemo(
    () => ({
      currentView,
      teacherView,
      selectedCourse,
      setSelectedCourse,
      selectedModule,
      setSelectedModule,
      setSelectedLessonContent,
      navigateTo,
      handleTeacherViewChange,
      setTeacherView,
      setCurrentView,
    }),
    [
      currentView,
      teacherView,
      selectedCourse,
      setSelectedCourse,
      selectedModule,
      setSelectedModule,
      setSelectedLessonContent,
      navigateTo,
      handleTeacherViewChange,
      setTeacherView,
      setCurrentView,
    ],
  );

  const live = useMemo(
    () => ({
      activeLiveCourse,
      setActiveLiveCourse,
      liveCourseId,
      setLiveCourseId,
      toggleTeacherLiveSession,
      renderLiveRoomInterface,
      classroomBindings,
      needsLiveKitSession,
      isStudentLive,
      isTeacherLiveRoom,
      isLiveSessionView,
      handleToggleCourseLive,
      handleUpdateCourseLiveSubject,
      handleStudentLiveEnded: markLiveCourseEnded,
      roomRef: liveKitRoomRef,
    }),
    [
      activeLiveCourse,
      setActiveLiveCourse,
      liveCourseId,
      setLiveCourseId,
      toggleTeacherLiveSession,
      renderLiveRoomInterface,
      classroomBindings,
      needsLiveKitSession,
      isStudentLive,
      isTeacherLiveRoom,
      isLiveSessionView,
      handleToggleCourseLive,
      handleUpdateCourseLiveSubject,
      markLiveCourseEnded,
    ],
  );

  const bindings = useMemo(
    () => ({
      curriculumBindings,
      quizCourseId,
      teacherDashboardBindings,
      studentCourseBindings,
      academicProfileBindings,
      handlePaymentSuccess,
    }),
    [
      curriculumBindings,
      quizCourseId,
      teacherDashboardBindings,
      studentCourseBindings,
      academicProfileBindings,
      handlePaymentSuccess,
    ],
  );

  const ui = useMemo(
    () => ({
      isMobileMenuOpen,
      setIsMobileMenuOpen,
      isSidebarCollapsed,
      setIsSidebarCollapsed,
      toggleSidebarCollapsed,
      isTopbarCollapsed,
      setIsTopbarCollapsed,
      toggleTopbarCollapsed,
      courseToPurchase,
      setCourseToPurchase,
      showKeyboardHelp,
      setShowKeyboardHelp,
      lockMainScroll,
      hideGlobalFooter,
      avatarStatusMsg,
      handleUploadAvatarFile,
      handleDeleteAvatar,
    }),
    [
      isMobileMenuOpen,
      setIsMobileMenuOpen,
      isSidebarCollapsed,
      setIsSidebarCollapsed,
      toggleSidebarCollapsed,
      isTopbarCollapsed,
      setIsTopbarCollapsed,
      toggleTopbarCollapsed,
      courseToPurchase,
      setCourseToPurchase,
      showKeyboardHelp,
      setShowKeyboardHelp,
      lockMainScroll,
      hideGlobalFooter,
      avatarStatusMsg,
      handleUploadAvatarFile,
      handleDeleteAvatar,
    ],
  );

  return { session, catalog, navigation, live, bindings, ui, notifications: notificationsValue };
}
