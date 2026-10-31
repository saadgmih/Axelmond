import React from "react";
import { ShieldCheck } from "lucide-react";
import type { UniOfficeWatermarkInfo } from "./types";
import { isNativeApp } from "../../utils/platform-app";

interface UniOfficeWatermarkProps {
  info: UniOfficeWatermarkInfo;
  isPro?: boolean;
}

export const UniOfficeWatermark: React.FC<UniOfficeWatermarkProps> = ({ info, isPro = false }) => {
  // Sur le site web, aucun filigrane n'est affiché.
  if (isPro || !isNativeApp()) return null;

  const displayName = info.studentName || info.studentEmail || "Étudiant Certifié";
  const emailSub = info.studentEmail ? ` (${info.studentEmail})` : "";
  const timeSub = info.sessionTimestamp || new Date().toLocaleDateString("fr-FR");
  const watermarkText = `PERFORMANCE ACADÉMIQUE • UNIOFFICE SECUR • ${displayName}${emailSub} • ${timeSub} • COPIE PERSONNELLE`;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* Diagonal repeating pattern */}
      <div className="absolute -inset-[50%] flex flex-col justify-around opacity-[0.07] rotate-[-28deg] scale-125">
        {Array.from({ length: 8 }).map((_, rowIndex) => (
          <div
            key={`wm-row-${rowIndex}`}
            className="flex whitespace-nowrap text-[12px] sm:text-[14px] font-black tracking-widest text-slate-900 uppercase gap-8"
          >
            {Array.from({ length: 3 }).map((_, colIndex) => (
              <span key={`wm-col-${rowIndex}-${colIndex}`}>
                {watermarkText}
              </span>
            ))}
          </div>
        ))}
      </div>

      {/* Official certified stamp at bottom right */}
      <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 rounded-md border border-slate-400/20 bg-white/70 px-2 py-1 text-[9px] font-bold text-slate-500 shadow-sm backdrop-blur-[2px]">
        <ShieldCheck className="h-3 w-3 text-emerald-600" />
        <span className="truncate max-w-[180px]">
          UniOfficeSecur • {displayName}
        </span>
      </div>
    </div>
  );
};

export default UniOfficeWatermark;
