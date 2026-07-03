import { Quote, ShieldCheck } from "lucide-react";
import { directorProfile } from "../content/director-profile";

type DirectorTone = "indigo" | "pink";

const toneStyles: Record<
  DirectorTone,
  {
    border: string;
    badge: string;
    accent: string;
    glow: string;
  }
> = {
  indigo: {
    border: "border-indigo-500/20",
    badge: "border-indigo-500/25 bg-indigo-500/10 text-indigo-200",
    accent: "text-indigo-200",
    glow: "shadow-indigo-950/40",
  },
  pink: {
    border: "border-pink-500/20",
    badge: "border-pink-500/25 bg-pink-500/10 text-pink-200",
    accent: "text-pink-200",
    glow: "shadow-pink-950/40",
  },
};

export function DirectorSidebarCard() {
  return (
    <div className="sidebar-glass-section border-b border-white/10 px-4 py-4">
      <div className="rounded-2xl border border-indigo-400/15 bg-slate-950/45 p-3 shadow-lg shadow-black/10">
        <div className="flex items-center gap-3">
          <img
            src={directorProfile.photo}
            alt={directorProfile.photoAlt}
            className="h-12 w-12 shrink-0 rounded-full border border-indigo-300/30 object-cover object-[50%_22%]"
            loading="lazy"
          />
          <div className="min-w-0">
            <p className="truncate text-xs font-black text-white">{directorProfile.name}</p>
            <p className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-300">
              {directorProfile.shortTitle}
            </p>
          </div>
        </div>
        <p className="mt-3 text-[11px] font-semibold leading-relaxed text-slate-400">"{directorProfile.quote}"</p>
      </div>
    </div>
  );
}

export function DirectorWelcomeCard({ tone = "indigo", className = "" }: { tone?: DirectorTone; className?: string }) {
  const styles = toneStyles[tone];

  return (
    <section
      className={`relative overflow-hidden rounded-3xl border ${styles.border} bg-slate-950/70 p-4 shadow-xl ${styles.glow} sm:p-5 md:p-6 ${className}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <img
          src={directorProfile.photo}
          alt={directorProfile.photoAlt}
          className="h-20 w-20 shrink-0 rounded-full border border-white/20 object-cover object-[50%_22%] shadow-lg shadow-black/30 sm:h-24 sm:w-24"
          loading="lazy"
        />
        <div className="min-w-0 flex-1 space-y-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${styles.badge}`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Direction académique
          </span>
          <div>
            <h2 className="text-xl font-black leading-tight text-white sm:text-2xl">{directorProfile.name}</h2>
            <p className={`mt-1 text-xs font-bold uppercase tracking-[0.16em] ${styles.accent}`}>
              {directorProfile.title}
            </p>
          </div>
          <p className="flex items-start gap-2 text-sm font-semibold leading-relaxed text-slate-300">
            <Quote className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
            <span>{directorProfile.quote}</span>
          </p>
          <p className="text-xs leading-relaxed text-slate-400 sm:text-sm">{directorProfile.welcome}</p>
        </div>
      </div>
    </section>
  );
}

export function DirectorFounderSection() {
  return (
    <section className="overflow-hidden rounded-3xl border border-indigo-500/20 bg-slate-950/75 shadow-2xl shadow-indigo-950/20">
      <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1fr_360px]">
        <div className="p-6 sm:p-8 md:p-10">
          <span className="inline-flex rounded-full border border-indigo-500/25 bg-indigo-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-indigo-200">
            Notre fondateur
          </span>
          <h2 className="mt-4 text-3xl font-black leading-tight text-white">{directorProfile.name}</h2>
          <p className="mt-2 text-sm font-bold uppercase tracking-[0.16em] text-indigo-200">{directorProfile.title}</p>
          <p className="mt-5 text-base font-semibold leading-relaxed text-slate-200">"{directorProfile.quote}"</p>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-400">{directorProfile.welcome}</p>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-400">
            Performance Académique met la clarté, l'exigence et le suivi personnalisé au centre de l'expérience
            d'apprentissage afin d'aider chaque étudiant à progresser avec méthode.
          </p>
        </div>
        <div className="relative min-h-[360px] overflow-hidden border-t border-indigo-500/15 bg-slate-900 lg:border-l lg:border-t-0">
          <img
            src={directorProfile.fullPhoto}
            alt={directorProfile.photoAlt}
            className="absolute inset-0 h-full w-full object-cover object-[50%_18%]"
            loading="lazy"
          />
        </div>
      </div>
    </section>
  );
}

export function DirectorAuthCard() {
  return (
    <div className="rounded-2xl border border-indigo-500/20 bg-slate-950/60 p-3 shadow-xl shadow-black/20">
      <div className="flex items-center gap-3 text-left">
        <img
          src={directorProfile.photo}
          alt={directorProfile.photoAlt}
          className="h-14 w-14 shrink-0 rounded-full border border-indigo-300/30 object-cover object-[50%_22%]"
          loading="lazy"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-white">{directorProfile.name}</p>
          <p className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-300">
            {directorProfile.title}
          </p>
          <p className="mt-1 text-[11px] font-semibold leading-relaxed text-slate-400">"{directorProfile.quote}"</p>
        </div>
      </div>
    </div>
  );
}

export function DirectorFooterLine() {
  return (
    <div className="flex max-w-xs items-center gap-3 rounded-2xl border border-emerald-400/15 bg-emerald-950/25 p-2.5 shadow-lg shadow-black/10">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-emerald-300/20 bg-emerald-500/10">
        <img
          src={directorProfile.footerPhoto}
          alt={directorProfile.photoAlt}
          className="h-full w-full object-cover object-[50%_18%]"
          loading="lazy"
        />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300/80">Direction</p>
        <p className="truncate text-xs font-black text-slate-100">{directorProfile.name}</p>
        <p className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
          {directorProfile.shortTitle}
        </p>
      </div>
    </div>
  );
}
