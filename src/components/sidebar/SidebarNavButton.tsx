import type { LucideIcon } from "lucide-react";

interface SidebarNavButtonProps {
  id?: string;
  label: string;
  icon: LucideIcon;
  iconClassName?: string;
  active: boolean;
  accent: "student" | "teacher";
  compact?: boolean;
  badge?: number;
  onMouseEnter?: () => void;
  onClick: () => void;
}

export function SidebarNavButton({
  id,
  label,
  icon: Icon,
  iconClassName,
  active,
  accent,
  compact = false,
  badge,
  onMouseEnter,
  onClick,
}: SidebarNavButtonProps) {
  const activeClass =
    accent === "student"
      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950/40"
      : "bg-emerald-600 text-white shadow-lg shadow-emerald-950/40";

  return (
    <button
      id={id}
      type="button"
      data-tv-focusable
      tabIndex={0}
      aria-label={compact ? label : undefined}
      aria-current={active ? "page" : undefined}
      title={compact ? label : undefined}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      className={`kbd-nav-focus touch-target relative flex w-full items-center rounded-xl text-sm font-semibold transition-all ${
        compact ? "justify-center px-0 py-3 min-h-[44px]" : "gap-3 px-4 py-3 min-h-[44px]"
      } ${active ? activeClass : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
    >
      <Icon className={`h-5 w-5 shrink-0 ${active ? "text-white" : iconClassName || ""}`} />
      {!compact && <span className="truncate text-left">{label}</span>}
      {!compact && badge != null && badge > 0 && (
        <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
      {compact && badge != null && badge > 0 && (
        <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" aria-hidden />
      )}
    </button>
  );
}
