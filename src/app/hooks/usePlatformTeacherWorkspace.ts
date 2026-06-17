import { useEffect, useMemo } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useTeacherCurriculum } from "../../hooks/useTeacherCurriculum";
import { useTeacherDashboard } from "../../hooks/useTeacherDashboard";
import type { AppUser } from "../../shared/app-user";
import type { ContentSection, Course, Discipline } from "../../types";
import type { flattenSections } from "../../hooks/useCourseContent";

type CourseContentApi = {
  courseContentSections: ContentSection[];
  setCourseContentSections: Dispatch<SetStateAction<ContentSection[]>>;
  flattenSections: typeof flattenSections;
  refreshCourseContent: (courseId: number) => Promise<ContentSection[]>;
};

export function usePlatformTeacherWorkspace(options: {
  role: string;
  courses: Course[];
  setCourses: Dispatch<SetStateAction<Course[]>>;
  allDisciplines: Discipline[];
  currentUser: AppUser | null;
  courseContent: CourseContentApi;
  setActiveLiveCourse: Dispatch<SetStateAction<Course | null>>;
  setLiveCourseId: Dispatch<SetStateAction<number>>;
}) {
  const {
    role,
    courses,
    setCourses,
    allDisciplines,
    currentUser,
    courseContent,
    setActiveLiveCourse,
    setLiveCourseId,
  } = options;

  const managedCourses = useMemo(
    () =>
      role === "teacher" && currentUser?.role !== "ADMIN"
        ? courses.filter((course) => course.createdById === currentUser?.id)
        : courses,
    [role, currentUser?.role, currentUser?.id, courses],
  );
  const managedCourseIds = useMemo(() => managedCourses.map((course) => course.id).join(","), [managedCourses]);

  const teacherCurriculum = useTeacherCurriculum({
    courses,
    setCourses,
    managedCourses,
    managedCourseIds,
    allDisciplines,
    currentUser,
    role,
    courseContent,
  });

  const curriculumBindings = useMemo(
    () => ({
      ...teacherCurriculum,
      allDisciplines,
      managedCourses,
    }),
    [teacherCurriculum, allDisciplines, managedCourses],
  );

  const { newSectionCourseId, quizCourseId } = curriculumBindings;

  const teacherDashboard = useTeacherDashboard({
    role,
    courses,
    setCourses,
    managedCourses,
    currentUser,
    setActiveLiveCourse,
  });

  const teacherDashboardBindings = useMemo(
    () => ({
      ...teacherDashboard,
      managedCourses,
      courses,
    }),
    [teacherDashboard, managedCourses, courses],
  );

  const { setGradesCourseId, handleToggleCourseLive, handleUpdateCourseLiveSubject } = teacherDashboardBindings;

  useEffect(() => {
    if (role !== "teacher") return;
    if (managedCourses.length === 0) return;
    if (!managedCourses.some((course) => course.id === newSectionCourseId)) {
      const firstManagedCourseId = managedCourses[0].id;
      setLiveCourseId(firstManagedCourseId);
      setGradesCourseId(firstManagedCourseId);
    }
  }, [role, managedCourseIds, newSectionCourseId, managedCourses, setLiveCourseId, setGradesCourseId]);

  return {
    curriculumBindings,
    quizCourseId,
    teacherDashboardBindings,
    handleToggleCourseLive,
    handleUpdateCourseLiveSubject,
    managedCourses,
  };
}
