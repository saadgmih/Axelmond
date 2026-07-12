import type { LucideIcon } from "lucide-react";
import { BookOpen, FolderTree, HelpCircle, Layers, Video } from "lucide-react";

export type CurriculumStepId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

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

/** Palette verte studio — sans teal/cyan (vert forêt, comme les étapes 3+ au repos). */
const studioGreenAccent = {
  active:
    "border-green-600/60 bg-emerald-950/40 text-white shadow-lg shadow-green-900/20 ring-1 ring-green-600/30",
  completed: "border-green-700/40 bg-emerald-950/30 text-emerald-200",
  badgeActive: "bg-green-700 text-white shadow-md shadow-green-900/40",
  badgeCompleted: "bg-green-800 text-white",
  button: "bg-green-700 hover:bg-green-600 text-white shadow-lg shadow-green-900/25",
  focus: "focus:border-green-600 focus:ring-green-600/20",
  panel: "border-l-4 border-l-green-600",
  chip: "bg-emerald-950/80 text-emerald-300 border border-emerald-700/40",
  listActive:
    "border-green-600/50 bg-emerald-950/30 shadow-lg shadow-green-900/20 ring-1 ring-green-600/20",
} as const;

export const CURRICULUM_STEPS: CurriculumStepConfig[] = [
  {
    step: 1,
    label: "Modules",
    desc: "Création & catalogue",
    icon: BookOpen,
    ...studioGreenAccent,
  },
  {
    step: 2,
    label: "Syllabus",
    desc: "Syllabus principal",
    icon: Layers,
    active: "border-teal-400/70 bg-teal-950/40 text-white shadow-lg shadow-teal-500/15 ring-1 ring-teal-500/35",
    completed: "border-emerald-500/40 bg-emerald-950/30 text-emerald-200",
    badgeActive: "bg-teal-500 text-white shadow-md shadow-teal-500/40",
    badgeCompleted: "bg-emerald-600 text-white",
    button: "bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-900/25",
    focus: "focus:border-teal-400 focus:ring-teal-500/20",
    panel: "border-l-4 border-l-teal-500",
    chip: "bg-teal-950/80 text-teal-300 border-teal-500/30",
    listActive: "border-teal-500/50 bg-teal-950/30 shadow-lg shadow-teal-900/20",
  },
  {
    step: 3,
    label: "Structure",
    desc: "Parties & arborescence",
    icon: FolderTree,
    active:
      "border-green-400/70 bg-green-950/40 text-white shadow-lg shadow-green-500/15 ring-1 ring-green-500/35",
    completed: "border-emerald-500/40 bg-emerald-950/30 text-emerald-200",
    badgeActive: "bg-green-500 text-white shadow-md shadow-green-500/40",
    badgeCompleted: "bg-emerald-600 text-white",
    button: "bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/25",
    focus: "focus:border-green-400 focus:ring-green-500/20",
    panel: "border-l-4 border-l-green-500",
    chip: "bg-green-950/80 text-green-300 border-green-500/30",
    listActive: "border-green-500/50 bg-green-950/30 shadow-lg shadow-green-900/20",
  },
  {
    step: 4,
    label: "Médias",
    desc: "Vidéos, PDF & images",
    icon: Video,
    active: "border-lime-400/70 bg-lime-950/40 text-white shadow-lg shadow-lime-500/15 ring-1 ring-lime-500/35",
    completed: "border-emerald-500/40 bg-emerald-950/30 text-emerald-200",
    badgeActive: "bg-lime-500 text-white shadow-md shadow-lime-500/40",
    badgeCompleted: "bg-emerald-600 text-white",
    button: "bg-lime-600 hover:bg-lime-500 text-white shadow-lg shadow-lime-900/25",
    focus: "focus:border-lime-400 focus:ring-lime-500/20",
    panel: "border-l-4 border-l-lime-500",
    chip: "bg-lime-950/80 text-lime-300 border-lime-500/30",
    listActive: "border-lime-500/50 bg-lime-950/30 shadow-lg shadow-lime-900/20",
  },
  {
    step: 5,
    label: "Quiz",
    desc: "QCM de validation",
    icon: HelpCircle,
    active: "border-teal-400/70 bg-teal-950/40 text-white shadow-lg shadow-teal-500/15 ring-1 ring-teal-500/35",
    completed: "border-emerald-500/40 bg-emerald-950/30 text-emerald-200",
    badgeActive: "bg-teal-500 text-white shadow-md shadow-teal-500/40",
    badgeCompleted: "bg-emerald-600 text-white",
    button: "bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-900/25",
    focus: "focus:border-teal-400 focus:ring-teal-500/20",
    panel: "border-l-4 border-l-teal-500",
    chip: "bg-teal-950/80 text-teal-300 border-teal-500/30",
    listActive: "border-teal-500/50 bg-teal-950/30 shadow-lg shadow-teal-900/20",
  },
];

export const ADMIN_CURRICULUM_STEPS: CurriculumStepConfig[] = [
  {
    step: 1,
    label: "Domaines",
    desc: "Familles académiques",
    icon: FolderTree,
    ...studioGreenAccent,
  },
  {
    step: 2,
    label: "Sous-domaines",
    desc: "Branches du domaine",
    icon: Layers,
    ...studioGreenAccent,
  },
  { ...CURRICULUM_STEPS[0], step: 3 },
  { ...CURRICULUM_STEPS[1], step: 4 },
  { ...CURRICULUM_STEPS[2], step: 5 },
  { ...CURRICULUM_STEPS[3], step: 6 },
  { ...CURRICULUM_STEPS[4], step: 7 },
];

export function getCurriculumSteps(canManageAcademicTaxonomy: boolean): CurriculumStepConfig[] {
  return canManageAcademicTaxonomy ? ADMIN_CURRICULUM_STEPS : CURRICULUM_STEPS;
}

export function getModuleStep(canManageAcademicTaxonomy: boolean): number {
  return canManageAcademicTaxonomy ? 3 : 1;
}

export function getSyllabusStep(canManageAcademicTaxonomy: boolean): number {
  return canManageAcademicTaxonomy ? 4 : 2;
}

export function getStructureStep(canManageAcademicTaxonomy: boolean): number {
  return canManageAcademicTaxonomy ? 5 : 3;
}

export function getMediaStep(canManageAcademicTaxonomy: boolean): number {
  return canManageAcademicTaxonomy ? 6 : 4;
}

export function getQuizStep(canManageAcademicTaxonomy: boolean): number {
  return canManageAcademicTaxonomy ? 7 : 5;
}

export function getStepTheme(step: number): CurriculumStepConfig {
  return CURRICULUM_STEPS.find((item) => item.step === step) ?? CURRICULUM_STEPS[0];
}

export function getAdminStepTheme(step: number): CurriculumStepConfig {
  return ADMIN_CURRICULUM_STEPS.find((item) => item.step === step) ?? ADMIN_CURRICULUM_STEPS[0];
}

/** Dark studio layout — matches Axelmond curriculum mockup */
export const curriculumUi = {
  page: "space-y-6 animate-in fade-in duration-300",
  hero: "relative overflow-hidden rounded-3xl border border-slate-800 bg-[#0b241f] p-6 md:p-8 shadow-xl shadow-black/30",
  heroGlow: "pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-emerald-600/20 blur-3xl",
  studioBadge:
    "inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/60 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-300",
  heroTitle: "text-2xl md:text-3xl font-black tracking-tight text-white",
  heroDesc: "text-sm text-slate-400 leading-relaxed",
  progressLabel: "text-[10px] font-black uppercase tracking-widest text-slate-500",
  progressTrack: "h-1.5 w-full overflow-hidden rounded-full bg-slate-800",
  progressFill:
    "h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-green-400 transition-all duration-500 shadow-[0_0_12px_rgba(5,194,165,0.45)]",
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
    "w-full rounded-xl border border-slate-700 bg-[#031512] px-4 py-3 text-xs font-semibold text-slate-100 transition-all placeholder:text-slate-600 focus:bg-slate-950 focus:outline-none focus:ring-4",
  inputIcon:
    "w-full rounded-xl border border-slate-700 bg-[#031512] pl-9 pr-4 py-3 text-xs font-semibold text-slate-100 transition-all placeholder:text-slate-600 focus:bg-slate-950 focus:outline-none focus:ring-4",
  checkbox:
    "flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-xs font-bold text-slate-300 cursor-pointer select-none hover:bg-slate-800/80 transition-colors",
  empty: "text-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-8 text-slate-400",
  contextBanner:
    "rounded-3xl border border-slate-700 bg-gradient-to-r from-slate-900 via-[#0b241f] to-emerald-950 p-4 md:px-6 md:py-5 text-white shadow-lg shadow-black/30",
  published:
    "inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/50 px-2.5 py-1 text-[10px] font-black text-emerald-400",
  draft:
    "inline-flex items-center gap-1.5 rounded-full border border-lime-500/30 bg-lime-950/50 px-2.5 py-1 text-[10px] font-black text-lime-400",
  dangerBtn:
    "inline-flex items-center justify-center gap-1 rounded-xl border border-red-500/30 bg-red-950/40 px-3 py-2 text-[10px] font-bold text-red-400 hover:bg-red-950/70 transition-colors",
  ghostBtn:
    "inline-flex items-center justify-center gap-1 rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-[10px] font-bold text-slate-300 hover:bg-slate-800 transition-colors",
  unpublishBtn:
    "inline-flex items-center justify-center gap-1 rounded-xl border border-lime-500/30 bg-lime-950/40 px-3 py-2 text-[10px] font-bold text-lime-400 hover:bg-lime-950/60 transition-colors",
  manageBtn:
    "inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-black text-white shadow-lg transition-all active:scale-[0.98] bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 shadow-teal-900/30",
  createBtn:
    "w-full inline-flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-black text-white shadow-lg transition-all active:scale-[0.98] bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-900/25",
  moduleCard: "rounded-3xl border border-slate-800 bg-slate-900/60 p-5 transition-all duration-300 md:p-6 shadow-sm",
  moduleCardActive:
    "border-emerald-500/50 bg-gradient-to-br from-emerald-950/40 to-slate-900 shadow-lg shadow-emerald-900/25 ring-1 ring-emerald-500/30",
  card: "rounded-2xl border border-slate-800 bg-slate-900/60 p-4 md:p-5 transition-all shadow-sm",
  cardHover: "hover:border-slate-700 hover:bg-slate-900/80",
  treePanel: "rounded-3xl border border-slate-800 bg-slate-900/50 p-4 md:p-6 space-y-3",
  secondaryBtn:
    "inline-flex items-center justify-center gap-1 rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-[10px] font-black text-white hover:bg-slate-700 transition-colors",
  levelChapter: "bg-slate-700 text-white border border-slate-600",
  levelPart: "bg-teal-950/80 text-teal-300 border border-teal-500/30",
  levelSubpart: "bg-emerald-950/80 text-emerald-300 border border-emerald-500/30",
  mediaVideo: "bg-red-950/60 text-red-300 border border-red-500/30",
  mediaPdf: "bg-lime-950/60 text-lime-300 border border-lime-500/30",
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
