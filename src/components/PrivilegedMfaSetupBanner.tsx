import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { fetchPrivilegedMfaSetupRequired, shouldShowPrivilegedMfaRecommendation } from "../mfa-client";

interface PrivilegedMfaSetupBannerProps {
  role?: string | null;
}

export default function PrivilegedMfaSetupBanner({ role }: PrivilegedMfaSetupBannerProps) {
  const [showRecommendation, setShowRecommendation] = useState(false);

  useEffect(() => {
    if (!shouldShowPrivilegedMfaRecommendation(role)) {
      setShowRecommendation(false);
      return;
    }

    let disposed = false;
    void fetchPrivilegedMfaSetupRequired()
      .then((needsSetup) => {
        if (!disposed) setShowRecommendation(needsSetup);
      })
      .catch(() => {
        if (!disposed) setShowRecommendation(false);
      });

    return () => {
      disposed = true;
    };
  }, [role]);

  if (!showRecommendation) return null;

  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-950/30 px-4 py-3 text-sm text-amber-100 shadow-lg shadow-amber-950/10"
    >
      <Shield className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" aria-hidden />
      <p>
        Renforcez la sécurité de votre compte en activant l&apos;authentification multi-facteurs (TOTP ou Passkey)
        ci-dessous, quand vous le souhaitez.
      </p>
    </div>
  );
}
