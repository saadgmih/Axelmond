import { useCallback, useEffect, useState } from "react";
import type { Course } from "../types";
import { api } from "../services/api";

export function useCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCourses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getCourses();
      setCourses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les cours");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  return { courses, loading, error, reload: loadCourses };
}

export function useCourse(courseId: number | null) {
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(Boolean(courseId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) return;
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getCourse(courseId);
        if (active) setCourse(data);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Cours introuvable");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [courseId]);

  return { course, loading, error };
}
