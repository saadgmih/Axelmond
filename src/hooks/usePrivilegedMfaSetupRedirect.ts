import { useEffect } from "react";
import { fetchPrivilegedMfaSetupRequired, shouldCheckPrivilegedMfaSetup } from "../mfa-client";

export function usePrivilegedMfaSetupRedirect(
  role: string | undefined,
  teacherView: string,
  setTeacherView: (view: string) => void,
) {
  useEffect(() => {
    if (!shouldCheckPrivilegedMfaSetup(role) || teacherView === "account-security") return;

    let disposed = false;
    void fetchPrivilegedMfaSetupRequired()
      .then((needsSetup) => {
        if (!disposed && needsSetup) {
          setTeacherView("account-security");
        }
      })
      .catch(() => {});

    return () => {
      disposed = true;
    };
  }, [role, teacherView, setTeacherView]);
}
