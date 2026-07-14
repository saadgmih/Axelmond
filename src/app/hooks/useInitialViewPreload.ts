import { useEffect, useState } from "react";
import type { AppUser } from "../../components/AuthScreen";
import { INSTITUTIONAL_VIEWS } from "../../navigation/platformPaths";
import { isStudentRole } from "../../rbac";
import {
  prefetchInstitutionalView,
  prefetchStudentView,
  prefetchTeacherView,
  prefetchTeacherWorkspace,
} from "../../utils/prefetch";

const INITIAL_VIEW_PRELOAD_TIMEOUT_MS = 12_000;

export function useInitialViewPreload(currentUser: AppUser | null, currentView: string, teacherView: string) {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    const preload = INSTITUTIONAL_VIEWS.has(currentView)
      ? prefetchInstitutionalView(currentView)
      : isStudentRole(currentUser.role)
        ? prefetchStudentView(currentView)
        : Promise.all([prefetchTeacherWorkspace(), prefetchTeacherView(teacherView)]);

    const timeoutId = window.setTimeout(() => {
      if (!cancelled) {
        console.warn("[navigation] Initial view preload timed out");
        setIsLoading(false);
      }
    }, INITIAL_VIEW_PRELOAD_TIMEOUT_MS);

    void preload
      .catch((err) => console.warn("[navigation] Initial view preload failed", err))
      .finally(() => {
        window.clearTimeout(timeoutId);
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [currentUser?.id, currentUser?.role, currentView, teacherView]);

  return isLoading;
}
