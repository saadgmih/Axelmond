import { useMemo, useState } from "react";
import {
  CalendarDays,
  Copy,
  HandHeart,
  Heart,
  KeyRound,
  Plus,
  RefreshCw,
  Trash2,
  Users,
} from "lucide-react";
import { CHARITY_ACTIVATE_LABEL, CHARITY_PAGE_TITLE } from "../../charity-labels";
import { useCharityAdmin, type CharityCampaignRow, type CharityEventRow } from "../../hooks/useCharityAdmin";
import { curriculumUi } from "./curriculum-theme";

interface AdminCharityViewProps {
  enabled: boolean;
}

const emptyEvent = (): CharityEventRow => ({
  id: "",
  title: "",
  description: "",
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
  day: new Date().getDate(),
  hour: 20,
  minute: 0,
  location: "Au centre Performance Académique",
  isActive: true,
});

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

export default function AdminCharityView({ enabled }: AdminCharityViewProps) {
  const charity = useCharityAdmin(enabled);
  const [copiedCode, setCopiedCode] = useState("");
  const [eventDraft, setEventDraft] = useState<CharityEventRow | null>(null);
  const [campaignDraft, setCampaignDraft] = useState<CharityCampaignRow | null>(null);

  const stats = useMemo(
    () => [
      { label: "Codes actifs", value: charity.stats.activeCodes, icon: KeyRound },
      { label: "Utilisations", value: charity.stats.totalUsages, icon: Users },
      { label: "Campagnes", value: charity.stats.activeCampaigns, icon: Heart },
      { label: "Événements à venir", value: charity.stats.upcomingEvents, icon: CalendarDays },
    ],
    [charity.stats],
  );

  const handleCopyCode = async () => {
    if (!charity.lastCreatedCode) return;
    try {
      await navigator.clipboard.writeText(charity.lastCreatedCode);
      setCopiedCode(charity.lastCreatedCode);
      window.setTimeout(() => setCopiedCode(""), 1600);
    } catch {
      setCopiedCode("");
    }
  };

  if (!enabled) {
    return (
      <div className="rounded-lg border border-lime-200 bg-lime-50 p-5 text-sm font-semibold text-lime-900">
        Cet espace est réservé aux administrateurs.
      </div>
    );
  }

  const statTone = "bg-slate-800/90 text-emerald-300 border border-emerald-800/50";
  const primaryBtn =
    "inline-flex items-center gap-2 rounded-xl bg-green-700 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-green-900/25 transition-colors hover:bg-green-600 disabled:opacity-50";

  return (
    <div className={`${curriculumUi.panel} overflow-hidden`}>
      <header className={`flex flex-col gap-6 ${curriculumUi.divider} px-5 py-6 sm:px-7 lg:flex-row lg:items-center lg:justify-between lg:px-10 lg:py-8`}>
        <div className="flex min-w-0 items-center gap-4">
          <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-emerald-700/40 bg-emerald-950/80 text-emerald-300">
            <HandHeart className="h-7 w-7" />
          </span>
          <div>
            <h1 className={curriculumUi.panelTitle}>{CHARITY_PAGE_TITLE}</h1>
            <p className={`${curriculumUi.panelSubtitle} sm:text-sm`}>
              Gestion des dons, codes d&apos;accès et événements religieux
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void charity.refreshAll()}
            disabled={charity.isLoading}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-500/80 px-4 text-sm font-bold text-slate-100 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${charity.isLoading ? "animate-spin" : ""}`} />
            Actualiser
          </button>
        </div>
      </header>

      <div className="space-y-6 p-4 sm:p-6 lg:p-9">
        <section className={`flex flex-col gap-5 ${curriculumUi.card} px-5 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-8`}>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Page publique</p>
            <h2 className="mt-1 text-xl font-black text-white">{CHARITY_ACTIVATE_LABEL}</h2>
            <p className="mt-1.5 text-sm text-slate-400">
              Si désactivée, aucun utilisateur ne peut accéder à la page, même avec un ancien code.
            </p>
          </div>
          <button
            type="button"
            aria-pressed={charity.pageEnabled}
            disabled={charity.isSaving}
            onClick={() => void charity.togglePage(!charity.pageEnabled)}
            className={`relative h-11 w-[5.75rem] rounded-full border p-1 transition-colors ${
              charity.pageEnabled ? "border-green-600/50 bg-green-700/80" : "border-slate-600/70 bg-slate-800"
            }`}
          >
            <span
              className={`block h-8 w-8 rounded-full bg-white shadow transition-transform ${
                charity.pageEnabled ? "translate-x-12" : "translate-x-0"
              }`}
            />
          </button>
        </section>

        <section className={`grid grid-cols-1 gap-px overflow-hidden ${curriculumUi.card} sm:grid-cols-2 lg:grid-cols-4`}>
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="flex items-center gap-4 px-5 py-5">
                <span className={`inline-flex h-11 w-11 items-center justify-center rounded-full ${statTone}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm text-slate-400">{stat.label}</p>
                  <p className="text-2xl font-black tabular-nums text-white">{stat.value}</p>
                </div>
              </div>
            );
          })}
        </section>

        {charity.statusMsg && (
          <p role="status" className={curriculumUi.alertSuccess}>
            {charity.statusMsg}
          </p>
        )}

        {charity.lastCreatedCode && (
          <div className="flex flex-col gap-3 rounded-2xl border border-emerald-700/40 bg-emerald-950/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-emerald-300">Code à partager (une seule fois)</p>
              <p className="mt-1 font-mono text-lg font-black text-white">{charity.lastCreatedCode}</p>
            </div>
            <button
              type="button"
              onClick={() => void handleCopyCode()}
              className="inline-flex items-center gap-2 rounded-xl bg-green-700 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-green-900/25 hover:bg-green-600"
            >
              <Copy className="h-4 w-4" />
              {copiedCode ? "Copié" : "Copier"}
            </button>
          </div>
        )}

        <section className={`${curriculumUi.card} p-5 sm:p-6`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className={`${curriculumUi.panelTitle} gap-2`}>
              <KeyRound className="h-5 w-5 text-emerald-400" />
              Codes d&apos;accès
            </h2>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={charity.isSaving}
                onClick={() => void charity.createAccessCode(false)}
                className={primaryBtn}
              >
                <Plus className="h-4 w-4" />
                Nouveau code
              </button>
              <button
                type="button"
                disabled={charity.isSaving}
                onClick={() => void charity.createAccessCode(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-sm font-bold text-amber-200 disabled:opacity-50"
              >
                Remplacer tous les codes
              </button>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3 pr-4">Suffixe</th>
                  <th className="py-3 pr-4">Statut</th>
                  <th className="py-3 pr-4">Utilisations</th>
                  <th className="py-3 pr-4">Créé le</th>
                  <th className="py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {charity.accessCodes.map((code) => (
                  <tr key={code.id}>
                    <td className="py-3 pr-4 font-mono font-bold text-white">••••{code.codeSuffix}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={`rounded-md px-2 py-1 text-xs font-bold ${
                          code.isActive ? "bg-green-800/25 text-emerald-200" : "bg-slate-700 text-slate-400"
                        }`}
                      >
                        {code.isActive ? "Actif" : "Désactivé"}
                      </span>
                    </td>
                    <td className="py-3 pr-4 tabular-nums">{code.usageCount}</td>
                    <td className="py-3 pr-4">{formatDate(code.createdAt)}</td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => void charity.loadCodeUsages(code.id)}
                          className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-bold text-slate-300"
                        >
                          Voir usages
                        </button>
                        {code.isActive && (
                          <button
                            type="button"
                            onClick={() => void charity.deactivateCode(code.id)}
                            className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-300"
                          >
                            Désactiver
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {charity.selectedCodeId && charity.codeUsages.length > 0 && (
            <div className="mt-4 rounded-lg border border-slate-700/60 bg-slate-950/40 p-4">
              <p className="text-xs font-black uppercase tracking-wider text-slate-500">Utilisateurs ayant utilisé ce code</p>
              <ul className="mt-2 space-y-1 text-sm">
                {charity.codeUsages.map((usage) => (
                  <li key={usage.id} className="text-slate-300">
                    {usage.userName} — {usage.userEmail} — {formatDate(usage.usedAt)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className={`${curriculumUi.card} p-5 sm:p-6`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className={`${curriculumUi.panelTitle} gap-2`}>
              <Heart className="h-5 w-5 text-emerald-400" />
              Campagnes de don
            </h2>
            <button
              type="button"
              onClick={() => setCampaignDraft({ id: "", title: "", description: "", isActive: true, donationCount: 0 })}
              className={primaryBtn}
            >
              <Plus className="h-4 w-4" />
              Ajouter
            </button>
          </div>
          {campaignDraft && (
            <form
              className="mt-4 space-y-3 rounded-lg border border-slate-700/60 bg-slate-950/40 p-4"
              onSubmit={(e) => {
                e.preventDefault();
                void charity.saveCampaign(
                  { title: campaignDraft.title, description: campaignDraft.description, isActive: campaignDraft.isActive },
                  campaignDraft.id || undefined,
                );
                setCampaignDraft(null);
              }}
            >
              <input
                value={campaignDraft.title}
                onChange={(e) => setCampaignDraft({ ...campaignDraft, title: e.target.value })}
                placeholder="Titre"
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
                required
              />
              <textarea
                value={campaignDraft.description}
                onChange={(e) => setCampaignDraft({ ...campaignDraft, description: e.target.value })}
                placeholder="Description (aide aux pauvres, Ramadan, repas…)"
                rows={3}
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
                required
              />
              <div className="flex gap-2">
                <button type="submit" disabled={charity.isSaving} className={primaryBtn}>
                  Enregistrer
                </button>
                <button type="button" onClick={() => setCampaignDraft(null)} className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300">
                  Annuler
                </button>
              </div>
            </form>
          )}
          <ul className="mt-4 divide-y divide-slate-700/60">
            {charity.campaigns.map((campaign) => (
              <li key={campaign.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-bold text-white">{campaign.title}</p>
                  <p className="text-xs text-slate-400">{campaign.description}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCampaignDraft(campaign)}
                    className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-bold text-slate-300"
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    onClick={() => void charity.removeCampaign(campaign.id)}
                    className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-bold text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className={`${curriculumUi.card} p-5 sm:p-6`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className={`${curriculumUi.panelTitle} gap-2`}>
              <CalendarDays className="h-5 w-5 text-emerald-400" />
              Événements religieux
            </h2>
            <button
              type="button"
              onClick={() => setEventDraft(emptyEvent())}
              className={primaryBtn}
            >
              <Plus className="h-4 w-4" />
              Ajouter
            </button>
          </div>
          {eventDraft && (
            <form
              className="mt-4 grid gap-3 rounded-lg border border-slate-700/60 bg-slate-950/40 p-4 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                void charity.saveEvent(
                  {
                    title: eventDraft.title,
                    description: eventDraft.description,
                    location: eventDraft.location,
                    year: eventDraft.year,
                    month: eventDraft.month,
                    day: eventDraft.day,
                    hour: eventDraft.hour,
                    minute: eventDraft.minute,
                    isActive: eventDraft.isActive,
                  },
                  eventDraft.id || undefined,
                );
                setEventDraft(null);
              }}
            >
              <input
                value={eventDraft.title}
                onChange={(e) => setEventDraft({ ...eventDraft, title: e.target.value })}
                placeholder="Titre"
                className="sm:col-span-2 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
                required
              />
              <textarea
                value={eventDraft.description}
                onChange={(e) => setEventDraft({ ...eventDraft, description: e.target.value })}
                placeholder="Description"
                rows={2}
                className="sm:col-span-2 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
                required
              />
              <input type="number" value={eventDraft.year} onChange={(e) => setEventDraft({ ...eventDraft, year: Number(e.target.value) })} placeholder="Année" className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white" />
              <input type="number" value={eventDraft.month} onChange={(e) => setEventDraft({ ...eventDraft, month: Number(e.target.value) })} placeholder="Mois" className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white" />
              <input type="number" value={eventDraft.day} onChange={(e) => setEventDraft({ ...eventDraft, day: Number(e.target.value) })} placeholder="Jour" className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white" />
              <input type="number" value={eventDraft.hour} onChange={(e) => setEventDraft({ ...eventDraft, hour: Number(e.target.value) })} placeholder="Heure" className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white" />
              <input type="number" value={eventDraft.minute} onChange={(e) => setEventDraft({ ...eventDraft, minute: Number(e.target.value) })} placeholder="Minute" className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white" />
              <input
                value={eventDraft.location}
                onChange={(e) => setEventDraft({ ...eventDraft, location: e.target.value })}
                placeholder="Lieu"
                className="sm:col-span-2 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
              />
              <div className="sm:col-span-2 flex gap-2">
                <button type="submit" disabled={charity.isSaving} className={primaryBtn}>
                  Enregistrer
                </button>
                <button type="button" onClick={() => setEventDraft(null)} className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300">
                  Annuler
                </button>
              </div>
            </form>
          )}
          <ul className="mt-4 divide-y divide-slate-700/60">
            {charity.events.map((event) => (
              <li key={event.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-bold text-white">{event.title}</p>
                  <p className="text-xs text-slate-400">
                    {event.day}/{event.month}/{event.year} — {event.hour}h{String(event.minute).padStart(2, "0")} — {event.location}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setEventDraft(event)} className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-bold text-slate-300">
                    Modifier
                  </button>
                  <button type="button" onClick={() => void charity.removeEvent(event.id)} className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-bold text-red-300">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className={`${curriculumUi.card} p-5 sm:p-6`}>
          <h2 className={curriculumUi.panelTitle}>Historique des dons ({charity.stats.pendingDonations} en attente)</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-2 pr-4">Utilisateur</th>
                  <th className="py-2 pr-4">Campagne</th>
                  <th className="py-2 pr-4">Montant</th>
                  <th className="py-2 pr-4">Statut</th>
                  <th className="py-2">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {charity.donations.map((donation) => (
                  <tr key={donation.id}>
                    <td className="py-2 pr-4">{donation.userName}</td>
                    <td className="py-2 pr-4">{donation.campaignTitle}</td>
                    <td className="py-2 pr-4 tabular-nums">{donation.amount} MAD</td>
                    <td className="py-2 pr-4">{donation.status}</td>
                    <td className="py-2">{formatDate(donation.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
