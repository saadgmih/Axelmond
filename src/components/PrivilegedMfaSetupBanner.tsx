import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { api } from "../api";
import { isTeacherSpaceRole } from "../rbac";

interface PrivilegedMfaSetupBannerProps {
  role?: string | null;
}

export default function PrivilegedMfaSetupBanner({ role }: PrivilegedMfaSetupBannerProps) {
  const [needsSetup, setNeedsSetup] = useState(false);
  const privileged = isTeacherSpaceRole(role);
  const enforced = import.meta.env.PROD;

  useEffect(() => {
    if (!privileged || !enforced) {
      setNeedsSetup(false);
      return;
    }

    let disposed = false;
    void api
      .getMfaStatus()
      .then((data) => {
        if (disposed) return;
        const protectedAccount = Boolean(data.totpEnabled) || Number(data.passkeyCount || 0) > 0;
        setNeedsSetup(!protectedAccount);
      })
      .catch(() => {
        if (!disposed) setNeedsSetup(false);
      });

    return () => {
      disposed = true;
    };
  }, [privileged, enforced, role]);

  if (!needsSetup) return null;

  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-100 shadow-lg shadow-rose-950/20"
    >
      <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" aria-hidden />
      <p>L&apos;authentification multi-facteurs est obligatoire pour ce compte.</p>
    </div>
  );
}
