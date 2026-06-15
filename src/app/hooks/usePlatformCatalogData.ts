import { useEffect, useMemo, useState, useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import { api } from "../../api";
import { useAsyncEffectGuard } from "../../hooks/useAsyncEffectGuard";
import type { Course, FacultyDomain } from "../../types";

export function usePlatformCatalogData(
  isAuthReady: boolean,
  courses: Course[],
  domains: FacultyDomain[],
  setCourses: Dispatch<SetStateAction<Course[]>>,
  setDomains: Dispatch<SetStateAction<FacultyDomain[]>>,
  setIsLoading: Dispatch<SetStateAction<boolean>>,
) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDomainId, setSelectedDomainId] = useState<number | null>(null);
  const [selectedDisciplineId, setSelectedDisciplineId] = useState<number | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const { startRequest: startCatalogRequest } = useAsyncEffectGuard();

  const loadCatalog = useCallback(() => {
    if (!isAuthReady) return;
    const request = startCatalogRequest();
    setCatalogError(null);
    setIsLoading(true);
    Promise.all([api.getCourses(), api.getDomains()])
      .then(([courseData, domainData]) => {
        if (!request.isActive()) return;
        setCourses(courseData);
        setDomains(domainData);
        setCatalogError(null);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!request.isActive()) return;
        console.error("Failed to fetch academic catalog:", err);
        const message =
          err instanceof Error && err.message
            ? err.message
            : "Impossible de charger les données académiques. Réessayez dans un instant.";
        setCatalogError(message);
        setIsLoading(false);
      });
  }, [isAuthReady, setCourses, setDomains, setIsLoading, startCatalogRequest]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const allDisciplines = useMemo(() => domains.flatMap((domain) => domain.disciplines), [domains]);
  const selectedDomain = useMemo(
    () => domains.find((domain) => domain.id === selectedDomainId) || null,
    [domains, selectedDomainId],
  );
  const selectedDiscipline = useMemo(
    () => allDisciplines.find((discipline) => discipline.id === selectedDisciplineId) || null,
    [allDisciplines, selectedDisciplineId],
  );

  const catalogCourses = useMemo(() => {
    const searchLower = searchQuery.toLowerCase();
    return courses.filter((c) => {
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
  }, [courses, searchQuery, selectedDisciplineId, selectedDomainId]);

  return {
    searchQuery,
    setSearchQuery,
    selectedDomainId,
    setSelectedDomainId,
    selectedDisciplineId,
    setSelectedDisciplineId,
    allDisciplines,
    selectedDomain,
    selectedDiscipline,
    catalogCourses,
    catalogError,
    retryCatalogLoad: loadCatalog,
  };
}
