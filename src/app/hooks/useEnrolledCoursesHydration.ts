import { useEffect, useMemo, useState } from "react";
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

export function mergeCoursesById(previous: Course[], incoming: Course[]): Course[] {
  const merged = new Map(previous.map((course) => [course.id, course]));
  for (const course of incoming) {
    merged.set(course.id, course);
  }
  return [...merged.values()].sort((left, right) => left.id - right.id);
}

export async function hydrateEnrolledCourses(
  missingIds: number[],
): Promise<{ courses: Course[]; failedIds: number[] }> {
  if (missingIds.length === 0) {
    return { courses: [], failedIds: [] };
  }

  const results = await Promise.allSettled(missingIds.map((courseId) => api.getCourse(courseId)));
  const courses: Course[] = [];
  const failedIds: number[] = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled" && result.value) {
      courses.push(result.value as Course);
      return;
    }
    failedIds.push(missingIds[index]);
  });

  return { courses, failedIds };
}

export function useEnrolledCoursesHydration(
  isAuthReady: boolean,
  currentUser: AppUser | null,
  enrolledCourses: number[],
  courses: Course[],
  setCourses: Dispatch<SetStateAction<Course[]>>,
) {
  const [unresolvedIds, setUnresolvedIds] = useState<number[]>([]);
  const [isEnrolledCatalogSyncing, setIsEnrolledCatalogSyncing] = useState(false);
  const enrolledKey = enrolledCourses.join(",");

  useEffect(() => {
    setUnresolvedIds([]);
  }, [currentUser?.id, enrolledKey]);

  const missingEnrolledCourseIds = useMemo(
    () =>
      findMissingEnrolledCourseIds(enrolledCourses, courses).filter((courseId) => !unresolvedIds.includes(courseId)),
    [enrolledCourses, courses, unresolvedIds],
  );

  useEffect(() => {
    if (!isAuthReady || !currentUser || !isStudentRole(currentUser.role)) {
      setIsEnrolledCatalogSyncing(false);
      return;
    }
    if (missingEnrolledCourseIds.length === 0) {
      setIsEnrolledCatalogSyncing(false);
      return;
    }

    let cancelled = false;
    setIsEnrolledCatalogSyncing(true);
    const pendingIds = [...missingEnrolledCourseIds];

    void (async () => {
      try {
        const { courses: fetchedCourses, failedIds } = await hydrateEnrolledCourses(pendingIds);
        if (cancelled) return;

        if (fetchedCourses.length > 0) {
          setCourses((previous) => mergeCoursesById(previous, fetchedCourses));
        }
        if (failedIds.length > 0) {
          setUnresolvedIds((previous) => [...new Set([...previous, ...failedIds])]);
        }
      } catch (err) {
        console.warn("Failed to hydrate enrolled courses for student dashboard:", err);
        if (!cancelled) {
          setUnresolvedIds((previous) => [...new Set([...previous, ...pendingIds])]);
        }
      } finally {
        if (!cancelled) {
          setIsEnrolledCatalogSyncing(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthReady, currentUser?.id, currentUser?.role, missingEnrolledCourseIds, setCourses]);

  return {
    missingEnrolledCourseIds,
    unresolvedEnrolledCourseIds: unresolvedIds,
    isEnrolledCatalogSyncing,
  };
}
