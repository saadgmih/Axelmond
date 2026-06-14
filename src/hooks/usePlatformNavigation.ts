import { useCallback, useEffect, type Dispatch, type SetStateAction } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { AppUser } from "../components/AuthScreen";
import { buildPlatformPath, parsePlatformPath, INSTITUTIONAL_VIEWS } from "../navigation/platformPaths";
import { getAllowedUiRole, getRedirectPathForRole, isStudentRole } from "../rbac";
import { scrollAppToTopDeferred } from "../utils/scroll-app-to-top";
import type { Course, CourseModule } from "../types";

export interface UsePlatformNavigationOptions {
  currentUser: AppUser | null;
  currentView: string;
  setCurrentView: Dispatch<SetStateAction<string>>;
  teacherView: string;
  setTeacherView: Dispatch<SetStateAction<string>>;
  enrolledCourses: number[];
  courses: Course[];
  setSelectedCourse: Dispatch<SetStateAction<Course | null>>;
  setSelectedModule: Dispatch<SetStateAction<CourseModule | null>>;
  setActiveLiveCourse: Dispatch<SetStateAction<Course | null>>;
  setCourseToPurchase: Dispatch<SetStateAction<Course | null>>;
  setIsMobileMenuOpen: Dispatch<SetStateAction<boolean>>;
  setQuizAnswers: Dispatch<SetStateAction<Record<string, string>>>;
  setQuizSubmitted: Dispatch<SetStateAction<boolean>>;
  setQuizScore: Dispatch<SetStateAction<number | null>>;
  setQuizSubmitError: Dispatch<SetStateAction<string>>;
}

export function usePlatformNavigation({
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
}: UsePlatformNavigationOptions) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!currentUser) return;
    const redirectPath = getRedirectPathForRole(currentUser.role, location.pathname);
    if (redirectPath) {
      console.info("[rbac] Client route redirected", {
        role: currentUser.role,
        from: location.pathname,
        to: redirectPath,
      });
      navigate(redirectPath, { replace: true });
      if (isStudentRole(currentUser.role)) {
        setCurrentView("dashboard");
      } else {
        setTeacherView("dashboard");
      }
    }
  }, [currentUser, location.pathname, navigate, setCurrentView, setTeacherView]);

  useEffect(() => {
    if (!currentUser) return;
    const parsed = parsePlatformPath(location.pathname);
    if (parsed.institutionalView) {
      setCurrentView(parsed.institutionalView);
      return;
    }
    if (isStudentRole(currentUser.role)) {
      setCurrentView(parsed.studentView);

      if (parsed.studentView === "course") {
        const enrolled = courses.filter((course) => enrolledCourses.includes(course.id));
        if (enrolled.length > 0) {
          setSelectedCourse((current) => current ?? enrolled[0] ?? null);
          setSelectedModule((current) => {
            if (current) return current;
            const course = enrolled[0];
            return course?.modules?.[0] ?? null;
          });
        }
      }

      if (parsed.studentView === "live") {
        const liveCourse =
          courses.find((course) => enrolledCourses.includes(course.id) && course.isLiveNow) ??
          courses.find((course) => enrolledCourses.includes(course.id)) ??
          null;
        if (liveCourse) {
          setActiveLiveCourse((current) => current ?? liveCourse);
          setSelectedCourse((current) => current ?? liveCourse);
        }
      }
      return;
    }

    setTeacherView(parsed.teacherView);
    setCurrentView("dashboard");
  }, [
    location.pathname,
    currentUser,
    courses,
    enrolledCourses,
    setCurrentView,
    setTeacherView,
    setSelectedCourse,
    setSelectedModule,
    setActiveLiveCourse,
  ]);

  const navigateTo = useCallback(
    (view: string, targetCourse: Course | null = null) => {
      if (INSTITUTIONAL_VIEWS.has(view)) {
        setCurrentView(view);
        setIsMobileMenuOpen(false);
        navigate(`/${view}`);
        scrollAppToTopDeferred();
        return;
      }

      if (currentUser && !isStudentRole(currentUser.role)) {
        console.info("[rbac] Blocked student navigation for teacher-space user", {
          role: currentUser.role,
          view,
        });
        setTeacherView("dashboard");
        window.history.replaceState(null, "", "/teacher");
        return;
      }

      if (view === "course" && targetCourse) {
        if (!enrolledCourses.includes(targetCourse.id)) {
          setCourseToPurchase(targetCourse);
          return;
        }
        setSelectedCourse(targetCourse);
        if (targetCourse.modules && targetCourse.modules.length > 0) {
          setSelectedModule(targetCourse.modules[0]);
        } else {
          setSelectedModule(null);
        }
        setQuizAnswers({});
        setQuizSubmitted(false);
        setQuizScore(null);
        setQuizSubmitError("");
      }

      if (view === "live" && targetCourse) {
        if (!enrolledCourses.includes(targetCourse.id)) {
          setCourseToPurchase(targetCourse);
          return;
        }
        setSelectedCourse(targetCourse);
        setActiveLiveCourse(targetCourse);
      }

      setCurrentView(view);
      setIsMobileMenuOpen(false);
      if (currentUser) {
        const uiRole = getAllowedUiRole(currentUser.role);
        navigate(buildPlatformPath(uiRole, view, uiRole === "teacher" ? teacherView : undefined));
      }
      scrollAppToTopDeferred();
    },
    [
      currentUser,
      enrolledCourses,
      teacherView,
      navigate,
      setTeacherView,
      setCourseToPurchase,
      setSelectedCourse,
      setSelectedModule,
      setQuizAnswers,
      setQuizSubmitted,
      setQuizScore,
      setQuizSubmitError,
      setCurrentView,
      setIsMobileMenuOpen,
      setActiveLiveCourse,
    ],
  );

  const handleTeacherViewChange = useCallback(
    (view: string) => {
      setTeacherView(view);
      setCurrentView("dashboard");
      setIsMobileMenuOpen(false);
      navigate(buildPlatformPath("teacher", "dashboard", view));
      scrollAppToTopDeferred();
    },
    [navigate, setTeacherView, setCurrentView, setIsMobileMenuOpen],
  );

  return { navigateTo, handleTeacherViewChange };
}
