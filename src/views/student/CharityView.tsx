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
import {
  CHARITY_PAGE_SHORT,
  CHARITY_PAGE_TITLE,
  CHARITY_TAGLINE,
  CHARITY_ACCESS_CODE_PLACEHOLDER,
} from "../../charity-labels";
import { CharityDonationCheckout } from "../../components/CharityDonationCheckout";
import { useCharity } from "../../hooks/useCharity";
import { curriculumUi } from "../teacher/curriculum-theme";

const focusInput =
  "outline-none focus:border-green-600/60 focus:ring-2 focus:ring-green-600/20";
const primaryBtn =
  "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-green-700 px-5 text-sm font-black text-white shadow-lg shadow-green-900/25 transition-colors hover:bg-green-600 disabled:opacity-50";

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
    paymentEnabled,
    paymentNotice,
    statusMsg,
    isLoading,
    isVerifying,
    verifyCode,
    handleDonationPaid,
    formatDonationStatus,
  } = useCharity();
  const [codeInput, setCodeInput] = useState("");
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  if (!accessStatus.pageEnabled) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center sm:px-6">
        <div className={`${curriculumUi.card} p-8 text-center`}>
          <Moon className="mx-auto h-12 w-12 text-emerald-400" />
          <h1 className={`mt-4 ${curriculumUi.panelTitle} justify-center`}>{CHARITY_PAGE_TITLE}</h1>
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
        <div className={`${curriculumUi.panel} overflow-hidden`}>
          <header className={`border-b border-slate-800/80 px-6 py-8 text-center sm:px-10`}>
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-xl border border-emerald-700/40 bg-emerald-950/80 text-emerald-300">
              <HandHeart className="h-7 w-7" />
            </span>
            <h1 className={`mt-4 ${curriculumUi.panelTitle} justify-center sm:text-2xl`}>{CHARITY_PAGE_TITLE}</h1>
            <p className={`mt-2 ${curriculumUi.panelSubtitle}`}>{CHARITY_TAGLINE}</p>
          </header>
          <div className="space-y-5 p-6 sm:p-8">
            <p className="text-sm leading-relaxed text-slate-300">
              Entrez le code d&apos;accès fourni par le centre pour participer aux actions de bienfaisance, découvrir les
              campagnes de don et consulter les événements religieux organisés (lecture et écoute du Coran avec un(e)
              récitateur ou une récitatrice du centre).
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
                placeholder={CHARITY_ACCESS_CODE_PLACEHOLDER}
                autoComplete="off"
                className={`w-full rounded-xl border border-slate-600/70 bg-slate-900/80 px-4 py-3 font-mono text-sm text-white ${focusInput}`}
              />
            </label>
            {statusMsg && (
              <p role="status" className={curriculumUi.alertSuccess}>
                {statusMsg}
              </p>
            )}
            <button
              type="button"
              disabled={isVerifying || !codeInput.trim()}
              onClick={() => void verifyCode(codeInput.trim())}
              className={primaryBtn}
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
      <header className={`${curriculumUi.panel} px-6 py-8 sm:px-10`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-400/80">{CHARITY_PAGE_SHORT}</p>
            <h1 className={`mt-1 ${curriculumUi.panelTitle} sm:text-2xl`}>{CHARITY_PAGE_TITLE}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
              Participez aux actions de bienfaisance du centre : aide aux nécessiteux, soutien pendant le Ramadan
              (repas offerts aux nécessiteux), et moments de lecture du Coran.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 self-start rounded-lg bg-green-800/25 px-3 py-2 text-xs font-bold text-emerald-200 ring-1 ring-green-600/30">
            <Sparkles className="h-4 w-4" />
            Accès autorisé
          </span>
        </div>
      </header>

      {statusMsg && (
        <p role="status" className={curriculumUi.alertSuccess}>
          {statusMsg}
        </p>
      )}

      {paymentNotice && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-sm text-amber-100">
          {paymentNotice}
        </div>
      )}

      <section className={`${curriculumUi.card} p-6 sm:p-8`}>
        <h2 className={`${curriculumUi.panelTitle} gap-3`}>
          <Heart className="h-5 w-5 text-emerald-400" />
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
                <div className="mt-4 flex flex-col gap-4">
                  <label className="block">
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
                      className={`w-full rounded-lg border border-slate-600/70 bg-slate-900/80 px-3 py-2.5 text-sm text-white ${focusInput}`}
                    />
                  </label>

                  {paymentEnabled ? (
                    <CharityDonationCheckout
                      campaignId={campaign.id}
                      amountMad={Number(amounts[campaign.id])}
                      onSuccess={() => void handleDonationPaid()}
                    />
                  ) : (
                    <p className="text-xs leading-relaxed text-slate-500">
                      Le paiement en ligne n&apos;est pas encore disponible. Contactez l&apos;administration du centre.
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className={`${curriculumUi.card} p-6 sm:p-8`}>
        <h2 className={`${curriculumUi.panelTitle} gap-3`}>
          <CalendarDays className="h-5 w-5 text-emerald-400" />
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
                  <span className="inline-flex items-center gap-2 font-semibold text-emerald-200">
                    <CalendarDays className="h-4 w-4 text-emerald-400" />
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
        <section className={`${curriculumUi.card} p-6 sm:p-8`}>
          <h2 className={`${curriculumUi.panelTitle} gap-3`}>
            <BookOpen className="h-5 w-5 text-emerald-400" />
            Mes dons
          </h2>
          <ul className="mt-4 divide-y divide-slate-700/60">
            {donations.map((donation) => (
              <li key={donation.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <span className="font-semibold text-slate-200">{donation.campaignTitle || "Campagne"}</span>
                <span className="tabular-nums text-emerald-200">{donation.amount} MAD</span>
                <span className="rounded-md bg-slate-800 px-2 py-1 text-xs font-bold text-slate-400">
                  {formatDonationStatus(donation.status)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
