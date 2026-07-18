import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import { getClientErrorMessage, isMfaSetupRequiredError, isTransientCatalogError } from "../../client-errors";
import { api, getFreshSessionToken } from "../../api";
import { useAsyncEffectGuard } from "../../hooks/useAsyncEffectGuard";
import type { Course, FacultyDomain } from "../../types";
import type { AppUser } from "../../components/AuthScreen";

const CATALOG_RETRY_DELAYS_MS = [0, 2_000, 5_000, 10_000];
const CATALOG_AUTO_RETRY_INTERVAL_MS = 60_000;

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function mergeCatalogCourseRows(previous: Course[], courseData: Course[]): Course[] {
  const byId = new Map(previous.map((course) => [course.id, course]));
  courseData.forEach((course) => byId.set(course.id, course));
  return [...byId.values()].sort((a, b) => a.id - b.id);
}

export function courseMatchesSelectedDiscipline(
  course: Course,
  selectedDisciplineId: number,
  selectedDisciplineName?: string,
): boolean {
  const selectedId = Number(selectedDisciplineId);
  const disciplineName = selectedDisciplineName?.trim().toLowerCase() || "";
  const courseDisciplineName = course.discipline?.name?.trim().toLowerCase() || course.category.trim().toLowerCase();
  return (
    Number(course.disciplineId) === selectedId ||
    Number(course.discipline?.id) === selectedId ||
    (disciplineName.length > 0 && courseDisciplineName === disciplineName)
  );
}

export function filterCatalogCoursesBySearch(courses: Course[], searchQuery: string): Course[] {
  const searchLower = searchQuery.trim().toLowerCase();
  if (!searchLower) return courses;

  return courses.filter((course) => {
    const fields = [
      course.title,
      course.category,
      course.level,
      course.discipline?.name,
      course.discipline?.domain?.name,
    ];
    return fields.some((value) => (value || "").toLowerCase().includes(searchLower));
  });
}

export function resolveCatalogSourceCourses(
  selectedDisciplineId: number | null,
  disciplineCoursesById: Record<number, Course[]>,
  courses: Course[],
  selectedDisciplineName?: string,
): Course[] {
  if (!selectedDisciplineId) return courses;

  const disciplineName = selectedDisciplineName?.trim().toLowerCase() || "";
  const globalMatches = courses.filter((course) =>
    courseMatchesSelectedDiscipline(course, selectedDisciplineId, disciplineName),
  );

  if (!(selectedDisciplineId in disciplineCoursesById)) {
    return globalMatches;
  }

  const fetched = disciplineCoursesById[selectedDisciplineId];
  if (!Array.isArray(fetched) || fetched.length === 0) {
    return globalMatches;
  }

  const byId = new Map(globalMatches.map((course) => [course.id, course]));
  fetched.forEach((course) => byId.set(course.id, course));
  return [...byId.values()].sort((a, b) => a.id - b.id);
}

export function usePlatformCatalogData(
  isAuthReady: boolean,
  currentUser: AppUser | null,
  courses: Course[],
  domains: FacultyDomain[],
  setCourses: Dispatch<SetStateAction<Course[]>>,
  setDomains: Dispatch<SetStateAction<FacultyDomain[]>>,
  setIsLoading: Dispatch<SetStateAction<boolean>>,
) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDomainId, setSelectedDomainId] = useState<number | null>(null);
  const [selectedDisciplineId, setSelectedDisciplineIdState] = useState<number | null>(null);
  const [loadingDisciplineId, setLoadingDisciplineId] = useState<number | null>(null);
  const [disciplineCoursesById, setDisciplineCoursesById] = useState<Record<number, Course[]>>({});
  const [disciplineLoadError, setDisciplineLoadError] = useState<string | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const { startRequest } = useAsyncEffectGuard();
  const autoRetryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const disciplineLoadSeqRef = useRef(0);
  const selectedDomainIdRef = useRef<number | null>(null);

  useEffect(() => {
    selectedDomainIdRef.current = selectedDomainId;
  }, [selectedDomainId]);

  const mergeCatalogCourses = useCallback(
    (courseData: Course[]) => {
      setCourses((previous) => mergeCatalogCourseRows(previous, courseData));
    },
    [setCourses],
  );

  const loadCatalog = useCallback(
    async (options?: { silent?: boolean }) => {
      // The public authentication screen does not consume catalog data. Waiting
      // for a real session removes two database-backed requests from first paint.
      if (!isAuthReady || !currentUser) return;
      const request = startRequest();
      if (!options?.silent) {
        setCatalogError(null);
        setIsLoading(true);
      }

      let lastError: unknown = null;

      for (let attempt = 0; attempt < CATALOG_RETRY_DELAYS_MS.length; attempt++) {
        if (attempt > 0) {
          await sleep(CATALOG_RETRY_DELAYS_MS[attempt]);
          if (!request.isActive()) return;
        }

        try {
          const token = await getFreshSessionToken();
          if (!request.isActive()) return;
          if (!token) {
            console.warn("[catalog] Session token unavailable — loading public catalog as fallback.");
          }
        } catch (err) {
          console.warn("[catalog] Session refresh failed — loading public catalog as fallback.", err);
        }

        const [coursesResult, domainsResult] = await Promise.allSettled([api.getCourses(), api.getDomains()]);
        if (!request.isActive()) return;

        const courseData = coursesResult.status === "fulfilled" ? coursesResult.value : null;
        const domainData = domainsResult.status === "fulfilled" ? domainsResult.value : null;

        if (courseData) setCourses(courseData);
        if (domainData) setDomains(domainData);

        if (courseData && domainData) {
          setCatalogError(null);
          setIsLoading(false);
          return;
        }

        if (domainData && !courseData) {
          lastError =
            coursesResult.status === "rejected" ? coursesResult.reason : new Error("Catalogue des modules incomplet");
        } else {
          lastError =
            coursesResult.status === "rejected"
              ? coursesResult.reason
              : domainsResult.status === "rejected"
                ? domainsResult.reason
                : lastError;
        }

        if (!isTransientCatalogError(lastError)) break;
      }

      if (!request.isActive()) return;

      console.error("Failed to fetch academic catalog:", lastError);
      if (isMfaSetupRequiredError(lastError)) {
        setCatalogError(null);
        setIsLoading(false);
        return;
      }

      const message = getClientErrorMessage(
        lastError,
        "Impossible de charger les données académiques. Réessayez dans un instant.",
      );
      setCatalogError(message || null);
      setIsLoading(false);
    },
    [isAuthReady, currentUser?.id, setCourses, setDomains, setIsLoading, startRequest],
  );

  const retryCatalogLoad = useCallback(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    if (autoRetryTimerRef.current) {
      clearInterval(autoRetryTimerRef.current);
      autoRetryTimerRef.current = null;
    }
    if (!catalogError || !isAuthReady) return;

    autoRetryTimerRef.current = setInterval(() => {
      void loadCatalog({ silent: true });
    }, CATALOG_AUTO_RETRY_INTERVAL_MS);

    return () => {
      if (autoRetryTimerRef.current) {
        clearInterval(autoRetryTimerRef.current);
        autoRetryTimerRef.current = null;
      }
    };
  }, [catalogError, isAuthReady, loadCatalog]);

  const allDisciplines = useMemo(() => domains.flatMap((domain) => domain.disciplines), [domains]);
  const selectedDomain = useMemo(
    () => domains.find((domain) => domain.id === selectedDomainId) || null,
    [domains, selectedDomainId],
  );
  const selectedDiscipline = useMemo(
    () => allDisciplines.find((discipline) => discipline.id === selectedDisciplineId) || null,
    [allDisciplines, selectedDisciplineId],
  );

  const loadCatalogDiscipline = useCallback(
    async (disciplineId: number, domainId?: number | null) => {
      if (!Number.isFinite(disciplineId) || disciplineId <= 0) return;
      const requestId = ++disciplineLoadSeqRef.current;
      setLoadingDisciplineId(disciplineId);
      setDisciplineLoadError(null);

      try {
        if (currentUser) {
          try {
            const token = await getFreshSessionToken();
            if (disciplineLoadSeqRef.current !== requestId) return;
            if (!token) {
              console.warn("[catalog] Session token unavailable for discipline load — using public fallback.");
            }
          } catch (err) {
            if (disciplineLoadSeqRef.current !== requestId) return;
            console.warn("[catalog] Session refresh failed for discipline load — using public fallback.", err);
          }
        }

        const courseData = await api.getCourses({
          disciplineId,
          domainId: domainId || undefined,
          fresh: true,
        });
        if (disciplineLoadSeqRef.current !== requestId) return;

        setDisciplineCoursesById((previous) => ({ ...previous, [disciplineId]: courseData }));
        mergeCatalogCourses(courseData);
        setDisciplineLoadError(null);
        setCatalogError(null);

        try {
          const domainData = await api.getDomains({ fresh: true });
          if (disciplineLoadSeqRef.current === requestId) {
            setDomains(domainData);
          }
        } catch (domainErr) {
          console.warn("Failed to refresh domain counts after discipline sync:", domainErr);
        }
      } catch (err) {
        if (disciplineLoadSeqRef.current !== requestId) return;
        console.error("Failed to fetch discipline catalog:", err);
        setDisciplineCoursesById((previous) => {
          const next = { ...previous };
          delete next[disciplineId];
          return next;
        });
        setDisciplineLoadError(getClientErrorMessage(err, "Impossible de charger les modules de cette discipline."));
      } finally {
        if (disciplineLoadSeqRef.current === requestId) {
          setLoadingDisciplineId((current) => (current === disciplineId ? null : current));
        }
      }
    },
    [currentUser?.id, mergeCatalogCourses, setDomains],
  );

  const retryDisciplineLoad = useCallback(() => {
    if (!selectedDisciplineId) return;
    void loadCatalogDiscipline(selectedDisciplineId, selectedDomainIdRef.current);
  }, [loadCatalogDiscipline, selectedDisciplineId]);

  const setSelectedDisciplineId = useCallback(
    (disciplineId: number | null) => {
      setSelectedDisciplineIdState(disciplineId);
      setDisciplineLoadError(null);
      if (disciplineId) void loadCatalogDiscipline(disciplineId, selectedDomainIdRef.current);
    },
    [loadCatalogDiscipline],
  );

  const catalogCourses = useMemo(() => {
    const selectedDisciplineName = selectedDiscipline?.name || "";
    const sourceCourses = resolveCatalogSourceCourses(
      selectedDisciplineId,
      disciplineCoursesById,
      courses,
      selectedDisciplineName,
    );

    const scopedCourses = selectedDisciplineId
      ? sourceCourses
      : selectedDomainId
        ? sourceCourses.filter((course) => Number(course.discipline?.domainId) === Number(selectedDomainId))
        : sourceCourses;

    return filterCatalogCoursesBySearch(scopedCourses, searchQuery);
  }, [disciplineCoursesById, courses, searchQuery, selectedDisciplineId, selectedDomainId, selectedDiscipline?.name]);

  const catalogHasData = courses.length > 0 || domains.length > 0;

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
    isDisciplineCoursesLoading: loadingDisciplineId === selectedDisciplineId && selectedDisciplineId !== null,
    disciplineLoadError,
    catalogError,
    catalogHasData,
    retryCatalogLoad,
    retryDisciplineLoad,
  };
}
