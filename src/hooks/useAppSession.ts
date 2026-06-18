import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { api, getFreshSessionToken, setSessionToken } from "../api";
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

  useEffect(() => {
    getFreshSessionToken()
      .then((token) => {
        if (!token) {
          setIsAuthReady(true);
          return;
        }
        return api
          .me()
          .then((user) => {
            applySessionUser(user);
          })
          .catch((err) => {
            console.warn("[rbac] Session validation failed", err);
            clearAuthState();
          });
      })
      .finally(() => setIsAuthReady(true));
  }, [clearAuthState]);

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
    clearAuthState();
    onLogout?.();
    onSessionExpired?.();
    window.history.replaceState(null, "", "/");
  }, [clearAuthState, onLogout, onSessionExpired]);

  useEffect(() => {
    window.addEventListener("axelmond:session-expired", handleSessionExpired);
    return () => window.removeEventListener("axelmond:session-expired", handleSessionExpired);
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
    isLoginDataLoading,
  };
}
