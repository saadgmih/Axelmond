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

    void preload
      .catch((err) => console.warn("[navigation] Initial view preload failed", err))
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, currentUser?.role, currentView, teacherView]);

  return isLoading;
}
