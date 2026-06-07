import type { LucideIcon } from "lucide-react";
import { GraduationCap, Shield } from "lucide-react";
import type { UserRole } from "../../rbac";

/** Dark profile studio — Notion / Stripe / Linear palette */
export const profileUi = {
  page: "space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-8",
  hero:
    "relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/[0.08] bg-[#020617] text-white shadow-2xl shadow-black/40",
  heroGradient:
    "pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-600/25 via-violet-600/15 to-transparent",
  heroGlowIndigo:
    "pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl",
  heroGlowViolet:
    "pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-violet-500/15 blur-3xl",
  heroInner: "relative z-10 p-5 sm:p-6 md:p-8",
  refreshBtn:
    "inline-flex items-center justify-center gap-2 self-center rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-200 backdrop-blur-md transition-all hover:border-white/20 hover:bg-white/10 active:scale-[0.98] lg:self-auto",
  avatarFrame:
    "relative shrink-0 overflow-hidden rounded-2xl border-2 border-white/15 shadow-xl shadow-indigo-900/30 ring-2 ring-indigo-500/25 backdrop-blur-sm",
  avatarSize: "h-[90px] w-[90px]",
  badge:
    "inline-flex items-center gap-1.5 rounded-full border border-indigo-400/30 bg-indigo-500/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-indigo-200 backdrop-blur-sm",
  heroName: "text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white",
  heroTitle: "text-sm font-semibold text-slate-300",
  heroSubtitle: "text-xs text-slate-500",
  alertSuccess:
    "rounded-2xl border border-emerald-500/25 bg-emerald-950/40 px-5 py-4 text-xs font-semibold text-emerald-300 backdrop-blur-sm",
  alertError:
    "rounded-2xl border border-red-500/25 bg-red-950/40 px-5 py-4 text-xs font-semibold text-red-300 backdrop-blur-sm",
  adminBanner:
    "rounded-2xl border border-violet-500/20 bg-violet-950/30 p-5 backdrop-blur-md shadow-lg shadow-violet-950/20",
  card:
    "overflow-hidden rounded-2xl sm:rounded-3xl border border-white/[0.08] bg-[#0f172a]/80 shadow-xl shadow-black/25 backdrop-blur-xl transition-shadow duration-300 hover:shadow-2xl hover:shadow-black/30",
  cardHeader: "border-b border-white/[0.06] px-5 py-4 sm:px-6 sm:py-5 md:px-8",
  cardTitle: "flex items-center gap-2.5 text-base sm:text-lg font-black text-white",
  cardSubtitle: "mt-1 text-xs text-slate-400 leading-relaxed",
  cardBody: "p-5 sm:p-6 md:p-8",
  sectionIcon: "h-5 w-5 text-indigo-400 shrink-0",
  label: "text-[10px] font-black uppercase tracking-widest text-slate-500",
  input:
    "w-full rounded-xl border border-white/[0.08] bg-[#020617]/80 px-4 py-3 text-xs font-semibold text-slate-100 placeholder:text-slate-600 transition-all focus:border-indigo-500/50 focus:bg-[#020617] focus:outline-none focus:ring-4 focus:ring-indigo-500/15",
  inputReadonly:
    "w-full cursor-not-allowed rounded-xl border border-white/[0.06] bg-[#020617]/50 px-4 py-3 text-xs font-bold text-slate-500",
  inputIcon:
    "pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-400/80",
  saveBtnWrap: "flex justify-center pt-2",
  saveBtn:
    "inline-flex min-w-[220px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-3.5 text-xs font-bold text-white shadow-lg shadow-indigo-900/40 transition-all hover:from-indigo-500 hover:to-violet-500 active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-indigo-500/25",
  secondaryBtn:
    "w-full rounded-xl border border-white/[0.08] bg-[#020617]/60 py-3 text-xs font-bold text-slate-200 transition-all hover:border-white/15 hover:bg-[#020617] active:scale-[0.98]",
  passwordBtn:
    "w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 text-xs font-bold text-white shadow-md shadow-indigo-900/30 transition-all hover:from-indigo-500 hover:to-violet-500 active:scale-[0.98]",
  statCard:
    "rounded-xl border border-white/[0.08] bg-[#020617]/60 p-3 text-center backdrop-blur-sm transition-colors hover:border-indigo-500/20 hover:bg-[#020617]/80",
  statIcon: "mx-auto h-4 w-4 text-indigo-400",
  statValue: "mt-1.5 text-xl font-black text-white",
  statLabel: "text-[9px] font-bold uppercase tracking-wide text-slate-500",
  listItem:
    "flex items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-[#020617]/50 px-3 py-2.5 text-xs transition-colors hover:border-white/10",
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
  uploadAccent: "indigo" | "violet" | "teal";
  focusRing: string;
  sectionIcon: string;
};

export function getProfileRoleTheme(role: UserRole): ProfileRoleTheme {
  if (role === "ADMIN") {
    return {
      heroGradient: "from-violet-600/30 via-purple-600/15 to-transparent",
      badge: "border-violet-400/30 bg-violet-500/15",
      badgeText: "text-violet-200",
      accentRing: "ring-violet-500/30",
      icon: Shield,
      subtitle: "Administration de la plateforme Axelmond",
      uploadAccent: "violet",
      focusRing: "focus:ring-violet-500/15 focus:border-violet-500/50",
      sectionIcon: "text-violet-400",
    };
  }
  if (role === "RESEARCHER") {
    return {
      heroGradient: "from-cyan-600/25 via-teal-600/15 to-transparent",
      badge: "border-cyan-400/30 bg-cyan-500/15",
      badgeText: "text-cyan-200",
      accentRing: "ring-cyan-500/30",
      icon: GraduationCap,
      subtitle: "Profil chercheur et publications",
      uploadAccent: "teal",
      focusRing: "focus:ring-cyan-500/15 focus:border-cyan-500/50",
      sectionIcon: "text-cyan-400",
    };
  }
  return {
    heroGradient: "from-indigo-600/25 via-violet-600/15 to-transparent",
    badge: "border-indigo-400/30 bg-indigo-500/15",
    badgeText: "text-indigo-200",
    accentRing: "ring-indigo-500/30",
    icon: GraduationCap,
    subtitle: "Identité académique et enseignement",
    uploadAccent: "indigo",
    focusRing: "focus:ring-indigo-500/15 focus:border-indigo-500/50",
    sectionIcon: "text-indigo-400",
  };
}
