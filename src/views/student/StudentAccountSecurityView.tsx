import { ShieldCheck } from "lucide-react";
import AccountPasswordChangeForm from "../../components/AccountPasswordChangeForm";
import SecuritySettingsPanel from "../../components/SecuritySettingsPanel";
import type { AppUser } from "../../components/AuthScreen";

interface StudentAccountSecurityViewProps {
  currentUser: AppUser | null;
}

export default function StudentAccountSecurityView({ currentUser }: StudentAccountSecurityViewProps) {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 duration-300 animate-in fade-in md:p-8">
      <header className="relative overflow-hidden rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-6 text-white shadow-xl md:p-8">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-900/40">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300/80">Compte étudiant</p>
              <h1 className="text-2xl font-black tracking-tight md:text-3xl">Sécurité du compte</h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-400">
                Gérez votre mot de passe, l&apos;authentification à deux facteurs et vos Passkeys.
              </p>
            </div>
          </div>
        </div>
      </header>

      <AccountPasswordChangeForm variant="dark" />

      <SecuritySettingsPanel layout="wide" emailVerified={Boolean(currentUser?.emailVerified)} />
    </div>
  );
}
