import { ShieldCheck } from "lucide-react";
import AccountPasswordChangeForm from "../../components/AccountPasswordChangeForm";
import PrivilegedMfaSetupBanner from "../../components/PrivilegedMfaSetupBanner";
import SecuritySettingsPanel from "../../components/SecuritySettingsPanel";
import type { AppUser } from "../../components/AuthScreen";

interface AccountSecurityViewProps {
  currentUser: AppUser | null;
  audienceLabel: string;
  headerClassName?: string;
  iconClassName?: string;
  badgeClassName?: string;
}

const defaultHeaderClassName =
  "relative overflow-hidden rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-6 text-white shadow-xl md:p-8";
const defaultIconClassName =
  "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-600 shadow-lg shadow-teal-900/40";
const defaultBadgeClassName = "text-[10px] font-bold uppercase tracking-[0.2em] text-teal-300/80";

export default function AccountSecurityView({
  currentUser,
  audienceLabel,
  headerClassName = defaultHeaderClassName,
  iconClassName = defaultIconClassName,
  badgeClassName = defaultBadgeClassName,
}: AccountSecurityViewProps) {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 duration-300 animate-in fade-in md:p-8">
      <header className={headerClassName}>
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/5 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className={iconClassName}>
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className={badgeClassName}>{audienceLabel}</p>
              <h1 className="text-2xl font-black tracking-tight md:text-3xl">Sécurité du compte</h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-400">
                Gérez votre mot de passe, l&apos;authentification à deux facteurs et vos Passkeys.
              </p>
            </div>
          </div>
        </div>
      </header>

      <PrivilegedMfaSetupBanner role={currentUser?.role} />

      <AccountPasswordChangeForm variant="dark" />

      <SecuritySettingsPanel layout="wide" emailVerified={Boolean(currentUser?.emailVerified)} />
    </div>
  );
}
