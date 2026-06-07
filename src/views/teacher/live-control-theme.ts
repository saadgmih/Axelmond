/** Dark live control console — matches Axelmond visio mockup */
export const liveControlUi = {
  page: "animate-in fade-in duration-300 space-y-6",
  shell:
    "relative overflow-hidden rounded-3xl border border-indigo-500/25 bg-[#070b14] p-5 shadow-2xl shadow-indigo-950/30 sm:p-6 md:p-8",
  shellGlow:
    "pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-pink-500/10 via-indigo-500/5 to-transparent",
  shellBorder:
    "pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/[0.06]",
  hero: "relative z-10 flex flex-col gap-6 border-b border-white/[0.06] pb-6 lg:flex-row lg:items-center lg:justify-between",
  heroIcon:
    "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-violet-600 shadow-lg shadow-pink-900/40",
  heroTitle: "text-xl font-black tracking-tight text-white sm:text-2xl",
  heroSubtitle: "mt-1 text-xs text-slate-400 sm:text-sm",
  webcamWrap: "relative mx-auto hidden h-28 w-28 shrink-0 lg:mx-0 lg:block xl:h-32 xl:w-32",
  section: "relative z-10 space-y-3 rounded-2xl border border-white/[0.08] bg-[#0c101a]/90 p-4 sm:p-5",
  sectionHead: "flex items-start gap-3",
  sectionIconPink:
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500/20 to-violet-600/20 border border-pink-500/20",
  sectionIconGreen:
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/25",
  sectionTitle: "text-[11px] font-black uppercase tracking-[0.14em] text-white",
  sectionDesc: "mt-0.5 text-[11px] text-slate-500 leading-relaxed",
  fieldWrap: "relative",
  fieldIcon:
    "pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500",
  select:
    "w-full appearance-none rounded-xl border border-white/[0.08] bg-[#050810] py-3.5 pl-10 pr-10 text-xs font-semibold text-slate-100 transition-all focus:border-pink-500/40 focus:outline-none focus:ring-4 focus:ring-pink-500/10",
  input:
    "w-full rounded-xl border border-white/[0.08] bg-[#050810] py-3.5 pl-10 pr-4 text-xs font-semibold text-slate-100 placeholder:text-slate-600 transition-all focus:border-pink-500/40 focus:outline-none focus:ring-4 focus:ring-pink-500/10",
  selectChevron:
    "pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500",
  syncNote: "flex items-center gap-1.5 text-[10px] text-slate-500",
  broadcastCard:
    "relative z-10 rounded-2xl border border-white/[0.08] bg-[#0c101a]/90 p-4 sm:p-5",
  liveBadge:
    "inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-400",
  liveDot: "relative flex h-2 w-2",
  offlineBadge:
    "inline-flex items-center gap-1.5 rounded-full border border-slate-600/40 bg-slate-900/80 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400",
  actions: "flex flex-col gap-2 sm:flex-row sm:justify-end",
  stopBtn:
    "inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-xs font-black text-white shadow-lg shadow-red-900/30 transition-all hover:bg-red-500 active:scale-[0.98]",
  startBtn:
    "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-600 to-violet-600 px-5 py-3 text-xs font-black text-white shadow-lg shadow-pink-900/25 transition-all hover:from-pink-500 hover:to-violet-500 active:scale-[0.98]",
  enterBtn:
    "inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-transparent px-5 py-3 text-xs font-black text-white transition-all hover:border-white/35 hover:bg-white/5 active:scale-[0.98]",
  enterBtnActive:
    "inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-5 py-3 text-xs font-black text-emerald-300",
  roomShell:
    "h-[min(100dvh,960px)] min-h-[420px] w-full overflow-hidden rounded-none border-y border-white/[0.08] lg:rounded-2xl lg:border",
} as const;
