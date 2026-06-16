import type { LucideIcon } from "lucide-react";
import { BookOpen, FolderTree, HelpCircle, Layers, Video } from "lucide-react";

export type CurriculumStepId = 1 | 2 | 3 | 4 | 5;

export interface CurriculumStepConfig {
  step: CurriculumStepId;
  label: string;
  desc: string;
  icon: LucideIcon;
  active: string;
  completed: string;
  badgeActive: string;
  badgeCompleted: string;
  button: string;
  focus: string;
  panel: string;
  chip: string;
  listActive: string;
}

export const CURRICULUM_STEPS: CurriculumStepConfig[] = [
  {
    step: 1,
    label: "Modules",
    desc: "Création & catalogue",
    icon: BookOpen,
    active: "border-indigo-400/70 bg-indigo-950/50 text-white shadow-lg shadow-indigo-500/15 ring-1 ring-indigo-500/40",
    completed: "border-emerald-500/40 bg-emerald-950/30 text-emerald-200",
    badgeActive: "bg-indigo-500 text-white shadow-md shadow-indigo-500/40",
    badgeCompleted: "bg-emerald-600 text-white",
    button:
      "bg-gradient-to-r from-pink-600 to-violet-600 hover:from-pink-500 hover:to-violet-500 text-white shadow-lg shadow-pink-900/25",
    focus: "focus:border-indigo-400 focus:ring-indigo-500/20",
    panel: "border-l-4 border-l-indigo-500",
    chip: "bg-violet-950/80 text-violet-300 border-violet-500/30",
    listActive: "border-indigo-500/50 bg-indigo-950/30 shadow-lg shadow-indigo-900/20 ring-1 ring-indigo-500/25",
  },
  {
    step: 2,
    label: "Syllabus",
    desc: "Syllabus principal",
    icon: Layers,
    active: "border-cyan-400/70 bg-cyan-950/40 text-white shadow-lg shadow-cyan-500/15 ring-1 ring-cyan-500/35",
    completed: "border-emerald-500/40 bg-emerald-950/30 text-emerald-200",
    badgeActive: "bg-cyan-500 text-white shadow-md shadow-cyan-500/40",
    badgeCompleted: "bg-emerald-600 text-white",
    button: "bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-900/25",
    focus: "focus:border-cyan-400 focus:ring-cyan-500/20",
    panel: "border-l-4 border-l-cyan-500",
    chip: "bg-cyan-950/80 text-cyan-300 border-cyan-500/30",
    listActive: "border-cyan-500/50 bg-cyan-950/30 shadow-lg shadow-cyan-900/20",
  },
  {
    step: 3,
    label: "Structure",
    desc: "Parties & arborescence",
    icon: FolderTree,
    active:
      "border-emerald-400/70 bg-emerald-950/40 text-white shadow-lg shadow-emerald-500/15 ring-1 ring-emerald-500/35",
    completed: "border-emerald-500/40 bg-emerald-950/30 text-emerald-200",
    badgeActive: "bg-emerald-500 text-white shadow-md shadow-emerald-500/40",
    badgeCompleted: "bg-emerald-600 text-white",
    button: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/25",
    focus: "focus:border-emerald-400 focus:ring-emerald-500/20",
    panel: "border-l-4 border-l-emerald-500",
    chip: "bg-emerald-950/80 text-emerald-300 border-emerald-500/30",
    listActive: "border-emerald-500/50 bg-emerald-950/30 shadow-lg shadow-emerald-900/20",
  },
  {
    step: 4,
    label: "Médias",
    desc: "Vidéos, PDF & images",
    icon: Video,
    active: "border-amber-400/70 bg-amber-950/40 text-white shadow-lg shadow-amber-500/15 ring-1 ring-amber-500/35",
    completed: "border-emerald-500/40 bg-emerald-950/30 text-emerald-200",
    badgeActive: "bg-amber-500 text-white shadow-md shadow-amber-500/40",
    badgeCompleted: "bg-emerald-600 text-white",
    button: "bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/25",
    focus: "focus:border-amber-400 focus:ring-amber-500/20",
    panel: "border-l-4 border-l-amber-500",
    chip: "bg-amber-950/80 text-amber-300 border-amber-500/30",
    listActive: "border-amber-500/50 bg-amber-950/30 shadow-lg shadow-amber-900/20",
  },
  {
    step: 5,
    label: "Quiz",
    desc: "QCM de validation",
    icon: HelpCircle,
    active: "border-violet-400/70 bg-violet-950/40 text-white shadow-lg shadow-violet-500/15 ring-1 ring-violet-500/35",
    completed: "border-emerald-500/40 bg-emerald-950/30 text-emerald-200",
    badgeActive: "bg-violet-500 text-white shadow-md shadow-violet-500/40",
    badgeCompleted: "bg-emerald-600 text-white",
    button: "bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/25",
    focus: "focus:border-violet-400 focus:ring-violet-500/20",
    panel: "border-l-4 border-l-violet-500",
    chip: "bg-violet-950/80 text-violet-300 border-violet-500/30",
    listActive: "border-violet-500/50 bg-violet-950/30 shadow-lg shadow-violet-900/20",
  },
];

export function getStepTheme(step: number): CurriculumStepConfig {
  return CURRICULUM_STEPS.find((item) => item.step === step) ?? CURRICULUM_STEPS[0];
}

/** Dark studio layout — matches Axelmond curriculum mockup */
export const curriculumUi = {
  page: "space-y-6 animate-in fade-in duration-300",
  hero: "relative overflow-hidden rounded-3xl border border-slate-800 bg-[#0b0e14] p-6 md:p-8 shadow-xl shadow-black/30",
  heroGlow: "pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-violet-600/20 blur-3xl",
  studioBadge:
    "inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-950/60 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-violet-300",
  heroTitle: "text-2xl md:text-3xl font-black tracking-tight text-white",
  heroDesc: "text-sm text-slate-400 leading-relaxed",
  progressLabel: "text-[10px] font-black uppercase tracking-widest text-slate-500",
  progressTrack: "h-1.5 w-full overflow-hidden rounded-full bg-slate-800",
  progressFill:
    "h-full rounded-full bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-400 transition-all duration-500 shadow-[0_0_12px_rgba(139,92,246,0.45)]",
  stepIdle:
    "border-slate-800 bg-slate-900/50 text-slate-500 hover:border-slate-700 hover:bg-slate-900/80 hover:text-slate-300",
  panel: "rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-black/20",
  panelTitle: "text-lg font-black text-white flex items-center gap-2.5",
  panelSubtitle: "text-xs text-slate-400 mt-1 font-medium leading-relaxed",
  sectionTitle: "text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-2",
  countBadge:
    "text-[10px] font-black uppercase text-slate-400 bg-slate-800/80 border border-slate-700 px-3 py-1 rounded-full",
  label: "text-[10px] font-black uppercase tracking-wider text-slate-500",
  input:
    "w-full rounded-xl border border-slate-700 bg-[#090d16] px-4 py-3 text-xs font-semibold text-slate-100 transition-all placeholder:text-slate-600 focus:bg-slate-950 focus:outline-none focus:ring-4",
  inputIcon:
    "w-full rounded-xl border border-slate-700 bg-[#090d16] pl-9 pr-4 py-3 text-xs font-semibold text-slate-100 transition-all placeholder:text-slate-600 focus:bg-slate-950 focus:outline-none focus:ring-4",
  checkbox:
    "flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-xs font-bold text-slate-300 cursor-pointer select-none hover:bg-slate-800/80 transition-colors",
  empty: "text-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-8 text-slate-400",
  contextBanner:
    "rounded-3xl border border-slate-700 bg-gradient-to-r from-slate-900 via-[#0b0e14] to-indigo-950 p-4 md:px-6 md:py-5 text-white shadow-lg shadow-black/30",
  published:
    "inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/50 px-2.5 py-1 text-[10px] font-black text-emerald-400",
  draft:
    "inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-950/50 px-2.5 py-1 text-[10px] font-black text-amber-400",
  dangerBtn:
    "inline-flex items-center justify-center gap-1 rounded-xl border border-red-500/30 bg-red-950/40 px-3 py-2 text-[10px] font-bold text-red-400 hover:bg-red-950/70 transition-colors",
  ghostBtn:
    "inline-flex items-center justify-center gap-1 rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-[10px] font-bold text-slate-300 hover:bg-slate-800 transition-colors",
  unpublishBtn:
    "inline-flex items-center justify-center gap-1 rounded-xl border border-amber-500/30 bg-amber-950/40 px-3 py-2 text-[10px] font-bold text-amber-400 hover:bg-amber-950/60 transition-colors",
  manageBtn:
    "inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-black text-white shadow-lg transition-all active:scale-[0.98] bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-violet-900/30",
  createBtn:
    "w-full inline-flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-black text-white shadow-lg transition-all active:scale-[0.98] bg-gradient-to-r from-pink-600 to-violet-600 hover:from-pink-500 hover:to-violet-500 shadow-pink-900/25",
  moduleCard: "rounded-3xl border border-slate-800 bg-slate-900/60 p-5 transition-all duration-300 md:p-6 shadow-sm",
  moduleCardActive:
    "border-indigo-500/50 bg-gradient-to-br from-indigo-950/40 to-slate-900 shadow-lg shadow-indigo-900/25 ring-1 ring-indigo-500/30",
  card: "rounded-2xl border border-slate-800 bg-slate-900/60 p-4 md:p-5 transition-all shadow-sm",
  cardHover: "hover:border-slate-700 hover:bg-slate-900/80",
  treePanel: "rounded-3xl border border-slate-800 bg-slate-900/50 p-4 md:p-6 space-y-3",
  secondaryBtn:
    "inline-flex items-center justify-center gap-1 rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-[10px] font-black text-white hover:bg-slate-700 transition-colors",
  levelChapter: "bg-slate-700 text-white border border-slate-600",
  levelPart: "bg-violet-950/80 text-violet-300 border border-violet-500/30",
  levelSubpart: "bg-cyan-950/80 text-cyan-300 border border-cyan-500/30",
  mediaVideo: "bg-red-950/60 text-red-300 border border-red-500/30",
  mediaPdf: "bg-amber-950/60 text-amber-300 border border-amber-500/30",
  mediaImage: "bg-emerald-950/60 text-emerald-300 border border-emerald-500/30",
  statPill:
    "bg-slate-900/80 border border-slate-700 px-2.5 py-1.5 rounded-lg flex items-center gap-1 text-[10px] font-black text-slate-300",
  statPrice:
    "px-2.5 py-1.5 rounded-lg flex items-center gap-1 border bg-emerald-950/50 text-emerald-400 border-emerald-500/30 text-[10px] font-black",
  divider: "border-t border-slate-800",
  alertSuccess:
    "rounded-2xl border border-emerald-500/30 bg-emerald-950/40 px-4 py-3 text-xs font-semibold text-emerald-300",
  alertError: "rounded-2xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-xs font-semibold text-red-300",
} as const;

export function publishedBadge(published: boolean) {
  return published ? curriculumUi.published : curriculumUi.draft;
}

export function publishedLabel(published: boolean) {
  return published ? "Publié" : "Brouillon";
}
