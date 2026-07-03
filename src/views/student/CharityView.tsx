import { useState } from "react";
import {
  BookOpen,
  CalendarDays,
  HandHeart,
  Heart,
  KeyRound,
  MapPin,
  Moon,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useCharity } from "../../hooks/useCharity";

function formatEventDate(event: {
  day: number;
  month: number;
  year: number;
  hour: number;
  minute: number;
}) {
  const dt = new Date(event.year, event.month - 1, event.day, event.hour, event.minute);
  return dt.toLocaleString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CharityView() {
  const {
    accessStatus,
    campaigns,
    events,
    donations,
    paymentNotice,
    statusMsg,
    isLoading,
    isVerifying,
    isDonating,
    verifyCode,
    pledgeDonation,
  } = useCharity();
  const [codeInput, setCodeInput] = useState("");
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  if (!accessStatus.pageEnabled) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center sm:px-6">
        <div className="rounded-2xl border border-slate-700/60 bg-[#07101f] p-8 shadow-[0_24px_80px_rgba(2,6,23,0.45)]">
          <Moon className="mx-auto h-12 w-12 text-teal-400" />
          <h1 className="mt-4 text-2xl font-black text-white">Lajr wa Tawab</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Cette section est temporairement fermée par l&apos;administration du centre Performance Académique.
          </p>
        </div>
      </div>
    );
  }

  if (!accessStatus.hasAccess) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
        <div className="overflow-hidden rounded-2xl border border-slate-700/60 bg-[#07101f] text-slate-100 shadow-[0_24px_80px_rgba(2,6,23,0.45)]">
          <header className="border-b border-slate-800/80 px-6 py-8 text-center sm:px-10">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-800 text-white">
              <HandHeart className="h-7 w-7" />
            </span>
            <h1 className="mt-4 text-2xl font-black text-white sm:text-3xl">Lajr wa Tawab</h1>
            <p className="mt-2 text-sm text-slate-400">Actions de bienfaisance — Performance Académique</p>
          </header>
          <div className="space-y-5 p-6 sm:p-8">
            <p className="text-sm leading-relaxed text-slate-300">
              Entrez le code d&apos;accès fourni par le centre pour participer aux actions de sadaqa, découvrir les
              campagnes de don et consulter les événements religieux organisés (lecture et écoute du Coran avec un(e)
              moqri/moqria du centre).
            </p>
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
                <KeyRound className="h-4 w-4" />
                Code d&apos;accès
              </span>
              <input
                type="text"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                placeholder="SADAQA-XXXXXXXX"
                autoComplete="off"
                className="w-full rounded-xl border border-slate-600/70 bg-slate-900/80 px-4 py-3 font-mono text-sm text-white outline-none ring-teal-500/30 focus:border-teal-500/60 focus:ring-2"
              />
            </label>
            {statusMsg && (
              <p role="status" className="rounded-lg border border-teal-500/30 bg-teal-500/10 px-4 py-3 text-sm font-semibold text-teal-200">
                {statusMsg}
              </p>
            )}
            <button
              type="button"
              disabled={isVerifying || !codeInput.trim()}
              onClick={() => void verifyCode(codeInput.trim())}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-700 to-teal-600 px-5 text-sm font-black text-white disabled:opacity-50"
            >
              <ShieldCheck className="h-5 w-5" />
              {isVerifying ? "Vérification…" : "Accéder à la page"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <header className="overflow-hidden rounded-2xl border border-slate-700/60 bg-[#07101f] px-6 py-8 sm:px-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-400/80">بِسْمِ اللَّهِ</p>
            <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">Lajr wa Tawab</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
              Participez aux actions de bienfaisance du centre : aide aux nécessiteux, soutien pendant le Ramadan
              (إطعام مسكين), et moments de lecture du Coran.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 self-start rounded-lg bg-emerald-500/15 px-3 py-2 text-xs font-bold text-emerald-300 ring-1 ring-emerald-400/25">
            <Sparkles className="h-4 w-4" />
            Accès autorisé
          </span>
        </div>
      </header>

      {statusMsg && (
        <p role="status" className="rounded-lg border border-teal-500/30 bg-teal-500/10 px-4 py-3 text-sm font-semibold text-teal-200">
          {statusMsg}
        </p>
      )}

      {paymentNotice && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-sm text-amber-100">
          {paymentNotice}
        </div>
      )}

      <section className="rounded-2xl border border-slate-700/60 bg-[#0b1528] p-6 sm:p-8">
        <h2 className="flex items-center gap-3 text-lg font-black text-white">
          <Heart className="h-5 w-5 text-teal-400" />
          Campagnes de don
        </h2>
        {isLoading ? (
          <p className="mt-6 text-sm text-slate-400">Chargement…</p>
        ) : campaigns.length === 0 ? (
          <p className="mt-6 text-sm text-slate-400">Aucune campagne active pour le moment.</p>
        ) : (
          <div className="mt-6 space-y-4">
            {campaigns.map((campaign) => (
              <article
                key={campaign.id}
                className="rounded-xl border border-slate-700/60 bg-slate-950/40 p-5"
              >
                <h3 className="text-base font-black text-white">{campaign.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{campaign.description}</p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                  <label className="flex-1">
                    <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Montant libre (MAD)
                    </span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={amounts[campaign.id] || ""}
                      onChange={(e) => setAmounts((prev) => ({ ...prev, [campaign.id]: e.target.value }))}
                      placeholder="Ex. 50"
                      className="w-full rounded-lg border border-slate-600/70 bg-slate-900/80 px-3 py-2.5 text-sm text-white outline-none focus:border-teal-500/60"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={isDonating || !Number(amounts[campaign.id]) || Number(amounts[campaign.id]) <= 0}
                    onClick={() => void pledgeDonation(campaign.id, Number(amounts[campaign.id]))}
                    className="inline-flex min-h-11 items-center justify-center rounded-lg bg-gradient-to-r from-teal-700 to-teal-600 px-5 text-sm font-black text-white disabled:opacity-50"
                  >
                    {isDonating ? "Enregistrement…" : "Engager un don"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-700/60 bg-[#0b1528] p-6 sm:p-8">
        <h2 className="flex items-center gap-3 text-lg font-black text-white">
          <CalendarDays className="h-5 w-5 text-teal-400" />
          Événements religieux
        </h2>
        {isLoading ? (
          <p className="mt-6 text-sm text-slate-400">Chargement…</p>
        ) : events.length === 0 ? (
          <p className="mt-6 text-sm text-slate-400">Aucun événement programmé.</p>
        ) : (
          <div className="mt-6 space-y-4">
            {events.map((event) => (
              <article key={event.id} className="rounded-xl border border-slate-700/60 bg-slate-950/40 p-5">
                <h3 className="text-base font-black text-white">{event.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{event.description}</p>
                <div className="mt-4 flex flex-wrap gap-4 text-sm">
                  <span className="inline-flex items-center gap-2 font-semibold text-teal-200">
                    <CalendarDays className="h-4 w-4 text-teal-400" />
                    {formatEventDate(event)}
                  </span>
                  <span className="inline-flex items-center gap-2 font-semibold text-slate-300">
                    <MapPin className="h-4 w-4 text-slate-500" />
                    {event.location}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {donations.length > 0 && (
        <section className="rounded-2xl border border-slate-700/60 bg-[#0b1528] p-6 sm:p-8">
          <h2 className="flex items-center gap-3 text-lg font-black text-white">
            <BookOpen className="h-5 w-5 text-teal-400" />
            Mes intentions de don
          </h2>
          <ul className="mt-4 divide-y divide-slate-700/60">
            {donations.map((donation) => (
              <li key={donation.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <span className="font-semibold text-slate-200">{donation.campaignTitle || "Campagne"}</span>
                <span className="tabular-nums text-teal-200">{donation.amount} MAD</span>
                <span className="rounded-md bg-slate-800 px-2 py-1 text-xs font-bold text-slate-400">
                  {donation.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
