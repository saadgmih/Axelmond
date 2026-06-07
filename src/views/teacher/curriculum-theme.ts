import type { LucideIcon } from "lucide-react";
import { BookOpen, FolderTree, HelpCircle, Layers, Video } from "lucide-react";

export type CurriculumStepId = 1 | 2 | 3 | 4 | 5;

export interface CurriculumStepConfig {
  step: CurriculumStepId;
  label: string;
  desc: string;
  icon: LucideIcon;
  /** Classes for active step pill in the stepper */
  active: string;
  /** Classes for completed step pill */
  completed: string;
  /** Number badge when active */
  badgeActive: string;
  /** Number badge when completed */
  badgeCompleted: string;
  /** Primary CTA on this step */
  button: string;
  /** Focus ring on inputs while this step is active (global fallback uses step 1) */
  focus: string;
  /** Left accent on panel cards for this step */
  panel: string;
  /** Soft tag/chip on lists */
  chip: string;
}

export const CURRICULUM_STEPS: CurriculumStepConfig[] = [
  {
    step: 1,
    label: "Modules",
    desc: "Création & catalogue",
    icon: BookOpen,
    active: "border-indigo-200 bg-indigo-50/80 text-indigo-900 shadow-sm shadow-indigo-100",
    completed: "border-emerald-200 bg-emerald-50/50 text-emerald-900",
    badgeActive: "bg-indigo-600 text-white shadow-md shadow-indigo-200",
    badgeCompleted: "bg-emerald-600 text-white",
    button: "bg-indigo-600 hover:bg-indigo-700 text-white",
    focus: "focus:border-indigo-500 focus:ring-indigo-500/15",
    panel: "border-l-4 border-l-indigo-500",
    chip: "bg-indigo-50 text-indigo-700 border-indigo-100",
  },
  {
    step: 2,
    label: "Chapitres",
    desc: "Syllabus principal",
    icon: Layers,
    active: "border-violet-200 bg-violet-50/80 text-violet-900 shadow-sm shadow-violet-100",
    completed: "border-emerald-200 bg-emerald-50/50 text-emerald-900",
    badgeActive: "bg-violet-600 text-white shadow-md shadow-violet-200",
    badgeCompleted: "bg-emerald-600 text-white",
    button: "bg-violet-600 hover:bg-violet-700 text-white",
    focus: "focus:border-violet-500 focus:ring-violet-500/15",
    panel: "border-l-4 border-l-violet-500",
    chip: "bg-violet-50 text-violet-700 border-violet-100",
  },
  {
    step: 3,
    label: "Structure",
    desc: "Parties & arborescence",
    icon: FolderTree,
    active: "border-sky-200 bg-sky-50/80 text-sky-900 shadow-sm shadow-sky-100",
    completed: "border-emerald-200 bg-emerald-50/50 text-emerald-900",
    badgeActive: "bg-sky-600 text-white shadow-md shadow-sky-200",
    badgeCompleted: "bg-emerald-600 text-white",
    button: "bg-sky-600 hover:bg-sky-700 text-white",
    focus: "focus:border-sky-500 focus:ring-sky-500/15",
    panel: "border-l-4 border-l-sky-500",
    chip: "bg-sky-50 text-sky-700 border-sky-100",
  },
  {
    step: 4,
    label: "Médias",
    desc: "Vidéos, PDF & images",
    icon: Video,
    active: "border-amber-200 bg-amber-50/80 text-amber-900 shadow-sm shadow-amber-100",
    completed: "border-emerald-200 bg-emerald-50/50 text-emerald-900",
    badgeActive: "bg-amber-600 text-white shadow-md shadow-amber-200",
    badgeCompleted: "bg-emerald-600 text-white",
    button: "bg-amber-600 hover:bg-amber-700 text-white",
    focus: "focus:border-amber-500 focus:ring-amber-500/15",
    panel: "border-l-4 border-l-amber-500",
    chip: "bg-amber-50 text-amber-800 border-amber-100",
  },
  {
    step: 5,
    label: "Quiz",
    desc: "QCM de validation",
    icon: HelpCircle,
    active: "border-emerald-200 bg-emerald-50/80 text-emerald-900 shadow-sm shadow-emerald-100",
    completed: "border-emerald-200 bg-emerald-50/50 text-emerald-900",
    badgeActive: "bg-emerald-600 text-white shadow-md shadow-emerald-200",
    badgeCompleted: "bg-emerald-600 text-white",
    button: "bg-emerald-600 hover:bg-emerald-700 text-white",
    focus: "focus:border-emerald-500 focus:ring-emerald-500/15",
    panel: "border-l-4 border-l-emerald-500",
    chip: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
];

export function getStepTheme(step: number): CurriculumStepConfig {
  return CURRICULUM_STEPS.find((item) => item.step === step) ?? CURRICULUM_STEPS[0];
}

/** Shared layout tokens */
export const curriculumUi = {
  page: "space-y-6 animate-in fade-in duration-300",
  hero:
    "relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-indigo-50/40 p-6 md:p-8 shadow-sm",
  heroGlow:
    "pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-200/30 blur-3xl",
  panel:
    "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm",
  panelTitle: "text-lg font-black text-slate-900 flex items-center gap-2.5",
  panelSubtitle: "text-xs text-slate-500 mt-1 font-medium leading-relaxed",
  sectionTitle: "text-xs font-black text-slate-700 uppercase tracking-wider",
  countBadge: "text-[10px] font-black uppercase text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full",
  label: "text-[10px] font-black uppercase tracking-wider text-slate-500",
  input:
    "w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-xs font-semibold text-slate-800 transition-all focus:bg-white focus:outline-none focus:ring-4",
  inputIcon:
    "w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-9 pr-4 py-3 text-xs font-semibold text-slate-800 transition-all focus:bg-white focus:outline-none focus:ring-4",
  checkbox:
    "flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-700 cursor-pointer select-none hover:bg-slate-100 transition-colors",
  empty:
    "text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-8",
  contextBanner:
    "rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 p-4 md:px-6 md:py-5 text-white shadow-lg shadow-slate-900/10",
  published:
    "inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700",
  draft:
    "inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-700",
  dangerBtn:
    "inline-flex items-center justify-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[10px] font-bold text-red-700 hover:bg-red-100 transition-colors",
  ghostBtn:
    "inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50 transition-colors",
  secondaryBtn:
    "inline-flex items-center justify-center gap-1 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-[10px] font-black text-white hover:bg-slate-800 transition-colors",
  levelChapter: "bg-slate-800 text-white border border-slate-700",
  levelPart: "bg-violet-50 text-violet-800 border border-violet-200",
  levelSubpart: "bg-sky-50 text-sky-800 border border-sky-200",
  mediaVideo: "bg-red-50 text-red-700 border border-red-200",
  mediaPdf: "bg-amber-50 text-amber-800 border border-amber-200",
  mediaImage: "bg-emerald-50 text-emerald-700 border border-emerald-200",
} as const;

export function publishedBadge(published: boolean) {
  return published ? curriculumUi.published : curriculumUi.draft;
}

export function publishedLabel(published: boolean) {
  return published ? "Publié" : "Brouillon";
}
