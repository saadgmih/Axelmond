import { useMemo } from "react";
import AccountSecurityView from "../shared/AccountSecurityView";
import type { AppUser } from "../../components/AuthScreen";
import { getRoleLabel, type UserRole } from "../../rbac";
import { getProfileRoleTheme } from "./academic-profile-theme";

interface TeacherAccountSecurityViewProps {
  currentUser: AppUser | null;
}

export default function TeacherAccountSecurityView({ currentUser }: TeacherAccountSecurityViewProps) {
  const role = (currentUser?.role || "PROFESSOR") as UserRole;
  const theme = useMemo(() => getProfileRoleTheme(role), [role]);
  const roleLabel = getRoleLabel(role);

  const iconClassName =
    role === "ADMIN"
      ? "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 shadow-lg shadow-violet-900/40"
      : "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-600 to-rose-600 shadow-lg shadow-pink-900/40";

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#020617] p-3 shadow-2xl shadow-black/20 sm:rounded-3xl sm:p-5 md:p-6">
      <AccountSecurityView
        currentUser={currentUser}
        audienceLabel={`${roleLabel} · Espace académique`}
        headerClassName={`relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br ${theme.heroGradient} bg-[#020617] p-6 text-white shadow-xl md:p-8`}
        iconClassName={iconClassName}
        badgeClassName={`text-[10px] font-bold uppercase tracking-[0.2em] ${theme.badgeText}`}
      />
    </div>
  );
}
