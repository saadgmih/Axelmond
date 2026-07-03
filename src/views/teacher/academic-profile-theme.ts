import type { LucideIcon } from "lucide-react";
import { GraduationCap, Shield } from "lucide-react";
import type { UserRole } from "../../rbac";

/** Dark profile studio — unified green palette */
export const profileUi = {
  page: "space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-8",
  hero: "relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/[0.08] bg-[#031512] text-white shadow-2xl shadow-black/40",
  heroGradient:
    "pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-600/25 via-teal-600/15 to-transparent",
  heroGlowIndigo: "pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl",
  heroGlowViolet: "pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-teal-500/15 blur-3xl",
  heroInner: "relative z-10 p-5 sm:p-6 md:p-8",
  refreshBtn:
    "inline-flex items-center justify-center gap-2 self-center rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-200 backdrop-blur-md transition-all hover:border-white/20 hover:bg-white/10 active:scale-[0.98] lg:self-auto",
  avatarFrame:
    "relative shrink-0 overflow-hidden rounded-2xl border-2 border-white/15 shadow-xl shadow-emerald-900/30 ring-2 ring-emerald-500/25 backdrop-blur-sm",
  avatarSize: "h-[90px] w-[90px]",
  badge:
    "inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-200 backdrop-blur-sm",
  heroName: "text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white",
  heroTitle: "text-sm font-semibold text-slate-300",
  heroSubtitle: "text-xs text-slate-500",
  alertSuccess:
    "rounded-2xl border border-emerald-500/25 bg-emerald-950/40 px-5 py-4 text-xs font-semibold text-emerald-300 backdrop-blur-sm",
  alertError:
    "rounded-2xl border border-red-500/25 bg-red-950/40 px-5 py-4 text-xs font-semibold text-red-300 backdrop-blur-sm",
  adminBanner:
    "rounded-2xl border border-teal-500/20 bg-teal-950/30 p-5 backdrop-blur-md shadow-lg shadow-teal-950/20",
  card: "overflow-hidden rounded-2xl sm:rounded-3xl border border-white/[0.08] bg-[#0b241f]/80 shadow-xl shadow-black/25 backdrop-blur-xl transition-shadow duration-300 hover:shadow-2xl hover:shadow-black/30",
  cardHeader: "border-b border-white/[0.06] px-5 py-4 sm:px-6 sm:py-5 md:px-8",
  cardTitle: "flex items-center gap-2.5 text-base sm:text-lg font-black text-white",
  cardSubtitle: "mt-1 text-xs text-slate-400 leading-relaxed",
  cardBody: "p-5 sm:p-6 md:p-8",
  sectionIcon: "h-5 w-5 text-emerald-400 shrink-0",
  label: "text-[10px] font-black uppercase tracking-widest text-slate-500",
  input:
    "w-full rounded-xl border border-white/[0.08] bg-[#031512]/80 px-4 py-3 text-xs font-semibold text-slate-100 placeholder:text-slate-600 transition-all focus:border-emerald-500/50 focus:bg-[#031512] focus:outline-none focus:ring-4 focus:ring-emerald-500/15",
  inputReadonly:
    "w-full cursor-not-allowed rounded-xl border border-white/[0.06] bg-[#031512]/50 px-4 py-3 text-xs font-bold text-slate-500",
  inputIcon: "pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400/80",
  saveBtnWrap: "flex justify-center pt-2",
  saveBtn:
    "inline-flex min-w-[220px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-3.5 text-xs font-bold text-white shadow-lg shadow-emerald-900/40 transition-all hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-emerald-500/25",
  secondaryBtn:
    "w-full rounded-xl border border-white/[0.08] bg-[#031512]/60 py-3 text-xs font-bold text-slate-200 transition-all hover:border-white/15 hover:bg-[#031512] active:scale-[0.98]",
  passwordBtn:
    "w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3 text-xs font-bold text-white shadow-md shadow-emerald-900/30 transition-all hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98]",
  statCard:
    "rounded-xl border border-white/[0.08] bg-[#031512]/60 p-3 text-center backdrop-blur-sm transition-colors hover:border-emerald-500/20 hover:bg-[#031512]/80",
  statIcon: "mx-auto h-4 w-4 text-emerald-400",
  statValue: "mt-1.5 text-xl font-black text-white",
  statLabel: "text-[9px] font-bold uppercase tracking-wide text-slate-500",
  listItem:
    "flex items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-[#031512]/50 px-3 py-2.5 text-xs transition-colors hover:border-white/10",
  listItemTitle: "truncate font-bold text-slate-200",
  listItemMeta: "text-[10px] text-slate-500",
  divider: "border-t border-white/[0.06]",
  published: "shrink-0 font-black text-emerald-400",
  draft: "shrink-0 font-black text-slate-500",
} as const;

export type ProfileRoleTheme = {
  heroGradient: string;
  badge: string;
  badgeText: string;
  accentRing: string;
  icon: LucideIcon;
  subtitle: string;
  uploadAccent: "teal" | "emerald";
  focusRing: string;
  sectionIcon: string;
};

export function getProfileRoleTheme(role: UserRole): ProfileRoleTheme {
  if (role === "ADMIN") {
    return {
      heroGradient: "from-teal-600/30 via-emerald-600/15 to-transparent",
      badge: "border-teal-400/30 bg-teal-500/15",
      badgeText: "text-teal-200",
      accentRing: "ring-teal-500/30",
      icon: Shield,
      subtitle: "Administration de la plateforme Performance Académique",
      uploadAccent: "teal",
      focusRing: "focus:ring-teal-500/15 focus:border-teal-500/50",
      sectionIcon: "text-teal-400",
    };
  }
  return {
    heroGradient: "from-emerald-600/25 via-teal-600/15 to-transparent",
    badge: "border-emerald-400/30 bg-emerald-500/15",
    badgeText: "text-emerald-200",
    accentRing: "ring-emerald-500/30",
    icon: GraduationCap,
    subtitle: "Identité académique et enseignement",
    uploadAccent: "teal",
    focusRing: "focus:ring-emerald-500/15 focus:border-emerald-500/50",
    sectionIcon: "text-emerald-400",
  };
}
