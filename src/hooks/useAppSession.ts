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
        const nextEnrolledCourses = currentUser.enrolledCourses ?? [];
        const nextInvoices = currentUser.invoices ?? [];
        setEnrolledCourses(nextEnrolledCourses);
        setInvoices(nextInvoices);
      } else {
        setEnrolledCourses([1, 2, 3, 4]);
      }
    }
  }, [currentUser?.id, currentUser?.role, currentUser?.enrolledCourses, currentUser?.invoices]);

  const updateSessionUser = useCallback((user: AppUser) => {
    setCurrentUser(user);
  }, []);

  const handleLoginSuccess = useCallback(
    (user: AppUser & { csrfToken?: string }) => {
      const { token, csrfToken, ...sessionUser } = user;
      if (token) setSessionToken(token, csrfToken);
      setCurrentUser(sessionUser);

      if (isStudentRole(user.role)) {
        setEnrolledCourses(user.enrolledCourses ?? []);
        setInvoices(user.invoices ?? []);
      }

      onAfterLogin?.(user);
      setIsLoginDataLoading(true);
      api
        .getCourses()
        .then(setCourses)
        .catch((err) => console.error("Failed to refresh courses after login:", err))
        .finally(() => setIsLoginDataLoading(false));
    },
    [onAfterLogin, setCourses],
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
            setCurrentUser(user);
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
    window.location.href = "/";
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
