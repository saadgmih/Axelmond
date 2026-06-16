import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { fetchPrivilegedMfaSetupRequired, shouldCheckPrivilegedMfaSetup } from "../mfa-client";

interface PrivilegedMfaSetupBannerProps {
  role?: string | null;
}

export default function PrivilegedMfaSetupBanner({ role }: PrivilegedMfaSetupBannerProps) {
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    if (!shouldCheckPrivilegedMfaSetup(role)) {
      setNeedsSetup(false);
      return;
    }

    let disposed = false;
    void fetchPrivilegedMfaSetupRequired()
      .then((required) => {
        if (!disposed) setNeedsSetup(required);
      })
      .catch(() => {
        if (!disposed) setNeedsSetup(false);
      });

    return () => {
      disposed = true;
    };
  }, [role]);

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
