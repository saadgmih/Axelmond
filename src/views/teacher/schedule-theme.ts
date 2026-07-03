import { profileUi } from "./academic-profile-theme";

export const scheduleUi = {
  page: "space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-8",
  hero: "relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/[0.08] bg-[#031512] text-white shadow-2xl shadow-black/40",
  heroGradient:
    "pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-600/20 via-teal-600/15 to-transparent",
  heroInner: "relative z-10 p-5 sm:p-6 md:p-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between",
  heroTitle: "text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white",
  heroSubtitle: "text-sm text-slate-400 max-w-2xl",
  addBtn:
    "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-950/30 transition-all hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98]",
  weekGrid: "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 tv:grid-cols-7 gap-4 lg:gap-5",
  dayCard:
    "flex min-h-[220px] flex-col rounded-2xl border border-white/[0.08] bg-[#0b241f]/80 shadow-xl shadow-black/20 backdrop-blur-xl",
  dayHeader: "border-b border-white/[0.06] px-4 py-3 flex items-center justify-between gap-2",
  dayTitle: "text-sm font-black text-white",
  dayCount: "text-[10px] font-bold uppercase tracking-widest text-slate-500",
  dayBody: "flex flex-1 flex-col gap-3 p-3 sm:p-4",
  emptyDay:
    "flex flex-1 items-center justify-center rounded-xl border border-dashed border-white/[0.08] px-3 py-6 text-center text-[11px] font-semibold text-slate-500",
  sessionCard:
    "rounded-xl border border-white/[0.08] bg-[#031512]/70 p-3 sm:p-4 shadow-inner shadow-black/20 transition-colors hover:border-emerald-500/20",
  sessionTitle: "text-sm font-black text-white",
  sessionMeta: "mt-1 text-[11px] font-semibold text-slate-400",
  sessionTime: "inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300",
  typeBadge:
    "inline-flex rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-emerald-200",
  sessionActions: "mt-3 flex flex-wrap gap-2",
  editBtn:
    "inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold text-slate-200 transition hover:bg-white/10",
  deleteBtn:
    "inline-flex items-center justify-center rounded-lg border border-red-500/20 bg-red-950/30 px-3 py-1.5 text-[10px] font-bold text-red-300 transition hover:bg-red-950/50",
  modalOverlay:
    "fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4 backdrop-blur-sm",
  modalPanel:
    "w-full max-w-xl rounded-t-3xl sm:rounded-3xl border border-white/[0.08] bg-[#0b241f] shadow-2xl shadow-black/40 max-h-[92vh] overflow-y-auto",
  modalHeader: "border-b border-white/[0.06] px-5 py-4 sm:px-6",
  modalTitle: "text-lg font-black text-white",
  modalBody: "p-5 sm:p-6 space-y-4",
  modalActions: "flex flex-col-reverse sm:flex-row gap-2 sm:justify-end border-t border-white/[0.06] px-5 py-4 sm:px-6",
  saveBtn: profileUi.saveBtn.replace("min-w-[220px]", "min-w-0"),
  cancelBtn: profileUi.secondaryBtn.replace("w-full", "w-full sm:w-auto"),
  alertSuccess: profileUi.alertSuccess,
  alertError: profileUi.alertError,
  label: profileUi.label,
  input: profileUi.input,
  textarea:
    "w-full min-h-[96px] rounded-xl border border-white/[0.08] bg-[#031512]/80 px-4 py-3 text-xs font-semibold text-slate-100 placeholder:text-slate-600 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-4 focus:ring-emerald-500/15",
} as const;
