import type { LucideIcon } from "lucide-react";

interface LiveMediaControlProps {
  label: string;
  enabledLabel: string;
  disabledLabel: string;
  enabled: boolean;
  enabledIcon: LucideIcon;
  disabledIcon: LucideIcon;
  onClick: () => void;
  ariaLabel: string;
}

export default function LiveMediaControl({
  label,
  enabledLabel,
  disabledLabel,
  enabled,
  enabledIcon: EnabledIcon,
  disabledIcon: DisabledIcon,
  onClick,
  ariaLabel,
}: LiveMediaControlProps) {
  const Icon = enabled ? EnabledIcon : DisabledIcon;

  return (
    <button
      type="button"
      data-tv-focusable
      tabIndex={0}
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={enabled}
      className={`kbd-nav-focus flex min-h-[56px] min-w-[72px] flex-col items-center justify-center rounded-2xl border px-3 py-2 transition-all sm:min-h-[60px] sm:min-w-[80px] ${
        enabled
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15"
          : "border-red-500/40 bg-red-600/15 text-red-300 hover:bg-red-600/25"
      }`}
    >
      <Icon className="mb-1.5 h-5 w-5" />
      <span className="text-[10px] font-black uppercase tracking-wide">{label}</span>
      <span className={`text-[9px] font-bold ${enabled ? "text-emerald-200/90" : "text-red-200/90"}`}>
        {enabled ? enabledLabel : disabledLabel}
      </span>
    </button>
  );
}
