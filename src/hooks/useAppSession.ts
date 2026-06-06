import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { api, getFreshSessionToken, getStoredRefreshToken, setSessionToken } from "../api";
import type { AppUser } from "../components/AuthScreen";
import { getAllowedUiRole, isStudentRole } from "../rbac";
import type { Course, Invoice } from "../types";

export interface UseAppSessionOptions {
  setCourses: Dispatch<SetStateAction<Course[]>>;
  onAfterLogin?: (user: AppUser) => void;
  onSessionExpired?: () => void;
}

export function useAppSession({ setCourses, onAfterLogin, onSessionExpired }: UseAppSessionOptions) {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    const saved = localStorage.getItem("axelmond_session_user");
    const token = localStorage.getItem("axelmond_session_token");
    if (saved && token) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    localStorage.removeItem("axelmond_session_user");
    return null;
  });
  const [isAuthReady, setIsAuthReady] = useState(() => !localStorage.getItem("axelmond_session_token"));
  const [enrolledCourses, setEnrolledCourses] = useState<number[]>([1]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const lastSyncedUserStateRef = useRef("");

  const role = currentUser ? getAllowedUiRole(currentUser.role) : "student";

  const clearAuthState = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem("axelmond_session_user");
    setSessionToken(undefined);
    setEnrolledCourses([]);
    setInvoices([]);
  }, []);

  useEffect(() => {
    if (currentUser) {
      if (isStudentRole(currentUser.role)) {
        const nextEnrolledCourses = currentUser.enrolledCourses || [1];
        const nextInvoices = currentUser.invoices || [];
        lastSyncedUserStateRef.current = JSON.stringify({ enrolledCourses: nextEnrolledCourses, invoices: nextInvoices });
        setEnrolledCourses(nextEnrolledCourses);
        setInvoices(nextInvoices);
      } else {
        setEnrolledCourses([1, 2, 3, 4]);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, currentUser?.role]);

  useEffect(() => {
    if (currentUser && isStudentRole(currentUser.role)) {
      const nextSignature = JSON.stringify({ enrolledCourses, invoices });
      if (lastSyncedUserStateRef.current === nextSignature) return;

      const isEnrolledDiff = JSON.stringify(currentUser.enrolledCourses) !== JSON.stringify(enrolledCourses);
      const isInvoicesDiff = JSON.stringify(currentUser.invoices) !== JSON.stringify(invoices);

      if (isEnrolledDiff || isInvoicesDiff) {
        lastSyncedUserStateRef.current = nextSignature;
        const updatedUser: AppUser = {
          ...currentUser,
          enrolledCourses,
          invoices,
        };
        setCurrentUser(updatedUser);
        localStorage.setItem("axelmond_session_user", JSON.stringify(updatedUser));
      }
    }
  }, [enrolledCourses, invoices]);

  const updateSessionUser = useCallback((user: AppUser) => {
    setCurrentUser(user);
    const { token, ...sessionUser } = user;
    localStorage.setItem("axelmond_session_user", JSON.stringify(sessionUser));
  }, []);

  const handleLoginSuccess = useCallback((user: AppUser & { refreshToken?: string }) => {
    setCurrentUser(user);
    const { token, refreshToken, ...sessionUser } = user;
    if (token) setSessionToken(token, refreshToken);
    localStorage.setItem("axelmond_session_user", JSON.stringify(sessionUser));

    if (isStudentRole(user.role)) {
      setEnrolledCourses(user.enrolledCourses || [1]);
      setInvoices(user.invoices || []);
    }

    onAfterLogin?.(user);
    api.getCourses().then(setCourses).catch((err) => console.error("Failed to refresh courses after login:", err));
  }, [onAfterLogin, setCourses]);

  useEffect(() => {
    getFreshSessionToken()
      .then((token) => {
        if (!token) {
          setIsAuthReady(true);
          return;
        }
        return api.me()
          .then((user) => {
            setCurrentUser(user);
            localStorage.setItem("axelmond_session_user", JSON.stringify(user));
          })
          .catch((err) => {
            console.warn("[rbac] Session validation failed", err);
            setCurrentUser(null);
            localStorage.removeItem("axelmond_session_user");
            setSessionToken(undefined);
          });
      })
      .finally(() => setIsAuthReady(true));
  }, []);

  const handleLogout = useCallback(() => {
    const refreshToken = getStoredRefreshToken();
    if (refreshToken) {
      api.logout(refreshToken).catch((err) => console.warn("[auth] Logout request failed", err));
    }
    clearAuthState();
  }, [clearAuthState]);

  useEffect(() => {
    const handleSessionExpired = () => {
      onSessionExpired?.();
      clearAuthState();
    };

    window.addEventListener("axelmond:session-expired", handleSessionExpired);
    return () => window.removeEventListener("axelmond:session-expired", handleSessionExpired);
  }, [onSessionExpired, clearAuthState]);

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
  };
}
