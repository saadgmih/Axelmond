import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import {
  api,
  getFreshSessionToken,
  getSessionRefreshState,
  sessionAvailabilityEvents,
  setSessionToken,
  takeRefreshedSessionUser,
} from "../api";
import { TEMPORARY_SERVICE_MESSAGE } from "../api-response";
import type { AppUser } from "../components/AuthScreen";
import { getAllowedUiRole, isStudentRole } from "../rbac";
import { purgeLegacySessionUserStorage } from "../session-storage";
import type { Course, Invoice } from "../types";

export interface UseAppSessionOptions {
  setCourses: Dispatch<SetStateAction<Course[]>>;
  onAfterLogin?: (user: AppUser) => void;
  onLogout?: () => void;
  onSessionExpired?: () => void;
}

export function useAppSession({ setCourses, onAfterLogin, onLogout, onSessionExpired }: UseAppSessionOptions) {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [enrolledCourses, setEnrolledCourses] = useState<number[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoginDataLoading, setIsLoginDataLoading] = useState(false);
  const [sessionUnavailable, setSessionUnavailable] = useState<string | null>(null);

  const role = currentUser ? getAllowedUiRole(currentUser.role) : "student";

  const normalizeEnrolledCourseIds = useCallback((courseIds?: unknown[]) => {
    if (!Array.isArray(courseIds)) return [];
    return [...new Set(courseIds.map(Number).filter(Number.isFinite))];
  }, []);

  const applySessionUser = useCallback(
    (user: AppUser) => {
      setCurrentUser(user);
      if (isStudentRole(user.role)) {
        setEnrolledCourses(normalizeEnrolledCourseIds(user.enrolledCourses));
        setInvoices(user.invoices ?? []);
      } else {
        setEnrolledCourses([1, 2, 3, 4]);
        setInvoices([]);
      }
    },
    [normalizeEnrolledCourseIds],
  );

  const clearAuthState = useCallback(() => {
    setCurrentUser(null);
    purgeLegacySessionUserStorage();
    setSessionToken(undefined);
    setEnrolledCourses([]);
    setInvoices([]);
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.clear();
    }
  }, []);

  useEffect(() => {
    purgeLegacySessionUserStorage();
  }, []);

  useEffect(() => {
    if (currentUser) {
      if (isStudentRole(currentUser.role)) {
        const nextEnrolledCourses = normalizeEnrolledCourseIds(currentUser.enrolledCourses);
        const nextInvoices = currentUser.invoices ?? [];
        setEnrolledCourses(nextEnrolledCourses);
        setInvoices(nextInvoices);
      } else {
        setEnrolledCourses([1, 2, 3, 4]);
      }
    }
  }, [
    currentUser?.id,
    currentUser?.role,
    currentUser?.enrolledCourses,
    currentUser?.invoices,
    normalizeEnrolledCourseIds,
  ]);

  const updateSessionUser = useCallback(
    (user: AppUser) => {
      applySessionUser(user);
    },
    [applySessionUser],
  );

  const handleLoginSuccess = useCallback(
    (user: AppUser & { csrfToken?: string }) => {
      const { token, csrfToken, ...sessionUser } = user;
      if (token) setSessionToken(token, csrfToken);
      setSessionUnavailable(null);

      setIsLoginDataLoading(true);
      void (async () => {
        let syncedUser: AppUser = sessionUser;
        try {
          syncedUser = await api.me();
        } catch (err) {
          console.warn("Failed to refresh user session after login:", err);
        }

        applySessionUser(syncedUser);
        onAfterLogin?.(syncedUser);

        try {
          await Promise.race([
            api.getCourses().then((courseData) => {
              setCourses(courseData);
            }),
            new Promise<void>((_, reject) => {
              setTimeout(() => reject(new Error("Course refresh timed out")), 20_000);
            }),
          ]);
        } catch (err) {
          console.error("Failed to refresh courses after login:", err);
        } finally {
          setIsLoginDataLoading(false);
        }
      })();
    },
    [applySessionUser, onAfterLogin, setCourses],
  );

  const recoverSession = useCallback(async () => {
    setSessionUnavailable(null);
    const token = await getFreshSessionToken();
    if (!token) {
      if (getSessionRefreshState() === "temporarily-unavailable") {
        setSessionUnavailable(TEMPORARY_SERVICE_MESSAGE);
      }
      return;
    }

    const refreshedUser = takeRefreshedSessionUser<AppUser>();
    if (refreshedUser) {
      applySessionUser(refreshedUser);
      setSessionUnavailable(null);
      return;
    }

    try {
      const user = await api.me();
      applySessionUser(user);
      setSessionUnavailable(null);
    } catch (error: unknown) {
      const isTransient = Boolean(error && typeof error === "object" && "isTransient" in error && error.isTransient);
      if (isTransient || getSessionRefreshState() === "temporarily-unavailable") {
        setSessionUnavailable(error instanceof Error ? error.message : TEMPORARY_SERVICE_MESSAGE);
        return;
      }
      if (getSessionRefreshState() === "expired") clearAuthState();
    }
  }, [applySessionUser, clearAuthState]);

  useEffect(() => {
    recoverSession().finally(() => setIsAuthReady(true));
  }, [recoverSession]);

  const retrySessionRecovery = useCallback(async () => {
    setIsAuthReady(false);
    try {
      await recoverSession();
    } finally {
      setIsAuthReady(true);
    }
  }, [recoverSession]);

  const handleLogout = useCallback(async () => {
    try {
      await api.logout();
    } catch (err) {
      console.warn("[auth] Logout failed", err);
    }
    clearAuthState();
    onLogout?.();
    window.location.href = "/";
  }, [clearAuthState, onLogout]);

  const handleSessionExpired = useCallback(() => {
    setSessionUnavailable(null);
    clearAuthState();
    onLogout?.();
    onSessionExpired?.();
    window.history.replaceState(null, "", "/");
  }, [clearAuthState, onLogout, onSessionExpired]);

  useEffect(() => {
    const handleSessionUnavailable = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string }>).detail;
      setSessionUnavailable(detail?.message || TEMPORARY_SERVICE_MESSAGE);
    };
    window.addEventListener(sessionAvailabilityEvents.expired, handleSessionExpired);
    window.addEventListener(sessionAvailabilityEvents.unavailable, handleSessionUnavailable);
    return () => {
      window.removeEventListener(sessionAvailabilityEvents.expired, handleSessionExpired);
      window.removeEventListener(sessionAvailabilityEvents.unavailable, handleSessionUnavailable);
    };
  }, [handleSessionExpired]);

  return {
    currentUser,
    setCurrentUser,
    isAuthReady,
    role,
    enrolledCourses,
    setEnrolledCourses,
    invoices,
    setInvoices,
    updateSessionUser,
    handleLoginSuccess,
    handleLogout,
    handleSessionExpired,
    sessionUnavailable,
    retrySessionRecovery,
    isLoginDataLoading,
  };
}
