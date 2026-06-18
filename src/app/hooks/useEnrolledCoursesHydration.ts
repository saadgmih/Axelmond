import { useEffect, useMemo } from "react";
import type { Dispatch, SetStateAction } from "react";
import { api } from "../../api";
import { isStudentRole } from "../../rbac";
import type { Course } from "../../types";
import type { AppUser } from "../../components/AuthScreen";

export function findMissingEnrolledCourseIds(enrolledCourses: number[], courses: Course[]): number[] {
  if (enrolledCourses.length === 0) return [];
  const enrolledSet = new Set(enrolledCourses);
  const loadedIds = new Set(courses.map((course) => course.id));
  return [...enrolledSet].filter((courseId) => !loadedIds.has(courseId));
}

export function useEnrolledCoursesHydration(
  isAuthReady: boolean,
  currentUser: AppUser | null,
  enrolledCourses: number[],
  courses: Course[],
  setCourses: Dispatch<SetStateAction<Course[]>>,
) {
  const missingEnrolledCourseIds = useMemo(
    () => findMissingEnrolledCourseIds(enrolledCourses, courses),
    [enrolledCourses, courses],
  );

  useEffect(() => {
    if (!isAuthReady || !currentUser || !isStudentRole(currentUser.role)) return;
    if (missingEnrolledCourseIds.length === 0) return;

    let cancelled = false;

    void (async () => {
      try {
        const fetchedCourses = (
          await Promise.all(missingEnrolledCourseIds.map((courseId) => api.getCourse(courseId)))
        ).filter((course): course is Course => Boolean(course));

        if (cancelled || fetchedCourses.length === 0) return;

        setCourses((previous) => {
          const merged = new Map(previous.map((course) => [course.id, course]));
          for (const course of fetchedCourses) {
            merged.set(course.id, course);
          }
          return [...merged.values()].sort((left, right) => left.id - right.id);
        });
      } catch (err) {
        console.warn("Failed to hydrate enrolled courses for student dashboard:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthReady, currentUser?.id, currentUser?.role, missingEnrolledCourseIds, setCourses]);

  return {
    missingEnrolledCourseIds,
    isEnrolledCatalogSyncing: missingEnrolledCourseIds.length > 0,
  };
}
