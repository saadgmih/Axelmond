import { directorProfile } from "../content/director-profile";

export function DirectorFounderSection() {
  return (
    <section className="overflow-hidden rounded-3xl border border-emerald-500/20 bg-slate-950/75 shadow-2xl shadow-emerald-950/20">
      <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1fr_360px]">
        <div className="p-6 sm:p-8 md:p-10">
          <span className="inline-flex rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200">
            Notre fondateur
          </span>
          <h2 className="mt-4 text-3xl font-black leading-tight text-white">{directorProfile.name}</h2>
          <p className="mt-2 text-sm font-bold uppercase tracking-[0.16em] text-emerald-200">{directorProfile.title}</p>
          <p className="mt-5 text-base font-semibold leading-relaxed text-slate-200">"{directorProfile.quote}"</p>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-400">{directorProfile.welcome}</p>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-400">
            Performance Académique met la clarté, l'exigence et le suivi personnalisé au centre de l'expérience
            d'apprentissage afin d'aider chaque étudiant à progresser avec méthode.
          </p>
        </div>
        <div className="relative min-h-[360px] overflow-hidden border-t border-emerald-500/15 bg-slate-900 lg:border-l lg:border-t-0">
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
    <div className="rounded-2xl border border-emerald-500/20 bg-slate-950/60 p-3 shadow-xl shadow-black/20">
      <div className="flex items-center gap-3 text-left">
        <img
          src={directorProfile.photo}
          alt={directorProfile.photoAlt}
          className="h-14 w-14 shrink-0 rounded-full border border-emerald-300/30 object-cover object-[50%_22%]"
          loading="lazy"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-white">{directorProfile.name}</p>
          <p className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-300">
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
