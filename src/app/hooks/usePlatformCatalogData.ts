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
  if (fetched.length === 0) {
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
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const { startRequest } = useAsyncEffectGuard();
  const autoRetryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const disciplineLoadSeqRef = useRef(0);

  const mergeCatalogCourses = useCallback(
    (courseData: Course[]) => {
      setCourses((previous) => mergeCatalogCourseRows(previous, courseData));
    },
    [setCourses],
  );

  const loadCatalog = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!isAuthReady) return;
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

        if (currentUser) {
          try {
            const token = await getFreshSessionToken();
            if (!request.isActive()) return;
            if (!token) throw new Error("Session authentifiée indisponible pour charger le catalogue.");
          } catch (err) {
            lastError = err;
            break;
          }
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
            coursesResult.status === "rejected"
              ? coursesResult.reason
              : new Error("Catalogue des modules incomplet");
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
    async (disciplineId: number) => {
      if (!Number.isFinite(disciplineId) || disciplineId <= 0) return;
      const requestId = ++disciplineLoadSeqRef.current;
      setLoadingDisciplineId(disciplineId);

      try {
        if (currentUser) {
          const token = await getFreshSessionToken();
          if (disciplineLoadSeqRef.current !== requestId) return;
          if (!token) throw new Error("Session authentifiée indisponible pour charger la discipline.");
        }

        const courseData = await api.getCourses({ disciplineId, fresh: true });
        if (disciplineLoadSeqRef.current !== requestId) return;
        setDisciplineCoursesById((previous) => ({ ...previous, [disciplineId]: courseData }));
        mergeCatalogCourses(courseData);
        try {
          const domainData = await api.getDomains({ fresh: true });
          if (disciplineLoadSeqRef.current === requestId) {
            setDomains(domainData);
          }
        } catch (domainErr) {
          console.warn("Failed to refresh domain counts after discipline sync:", domainErr);
        }
        setCatalogError(null);
      } catch (err) {
        if (disciplineLoadSeqRef.current !== requestId) return;
        console.error("Failed to fetch discipline catalog:", err);
        setCatalogError(getClientErrorMessage(err, "Impossible de charger les modules de cette discipline."));
      } finally {
        if (disciplineLoadSeqRef.current === requestId) {
          setLoadingDisciplineId((current) => (current === disciplineId ? null : current));
        }
      }
    },
    [currentUser?.id, mergeCatalogCourses],
  );

  const setSelectedDisciplineId = useCallback(
    (disciplineId: number | null) => {
      setSelectedDisciplineIdState(disciplineId);
      if (disciplineId) void loadCatalogDiscipline(disciplineId);
    },
    [loadCatalogDiscipline],
  );

  const catalogCourses = useMemo(() => {
    const searchLower = searchQuery.toLowerCase();
    const selectedDisciplineName = selectedDiscipline?.name || "";
    const sourceCourses = resolveCatalogSourceCourses(
      selectedDisciplineId,
      disciplineCoursesById,
      courses,
      selectedDisciplineName,
    );

    return sourceCourses.filter((course) => {
      const matchesSearch =
        course.title.toLowerCase().includes(searchLower) ||
        course.category.toLowerCase().includes(searchLower) ||
        course.level.toLowerCase().includes(searchLower) ||
        course.discipline?.name.toLowerCase().includes(searchLower) ||
        course.discipline?.domain?.name.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
      if (selectedDisciplineId) return true;
      if (selectedDomainId) return Number(course.discipline?.domainId) === Number(selectedDomainId);
      return true;
    });
  }, [courses, disciplineCoursesById, searchQuery, selectedDisciplineId, selectedDomainId, selectedDiscipline?.name]);

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
    catalogError,
    catalogHasData,
    retryCatalogLoad,
  };
}
