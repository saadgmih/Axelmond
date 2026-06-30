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
  const [selectedDisciplineId, setSelectedDisciplineId] = useState<number | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const { startRequest } = useAsyncEffectGuard();
  const autoRetryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

        lastError =
          coursesResult.status === "rejected"
            ? coursesResult.reason
            : domainsResult.status === "rejected"
              ? domainsResult.reason
              : lastError;

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
    catalogError,
    catalogHasData,
    retryCatalogLoad,
  };
}
