import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileKey2,
  KeyRound,
  MonitorCog,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import type { ProfessorAccessKey } from "../../hooks/useTeacherDashboard";

interface AdminProfessorAccessKeysViewProps {
  professorInvites: ProfessorAccessKey[];
  accessKeyStatusMsg: string;
  isLoadingAccessKeys: boolean;
  isCreatingAccessKey: boolean;
  siteSettings: { forceDesktopMode: boolean };
  siteSettingsStatusMsg: string;
  isLoadingSiteSettings: boolean;
  isSavingSiteSettings: boolean;
  refreshProfessorInvites: () => void | Promise<void>;
  handleCreateProfessorInvite: () => void | Promise<void>;
  handleDeleteProfessorInvite: (code: string) => void | Promise<void>;
  handleUpdateForceDesktopMode: (forceDesktopMode: boolean) => void | Promise<void>;
}

const PAGE_SIZE = 8;

function formatAccessKeyDate(value?: string | null) {
  if (!value) return "—";
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return "—";
  return new Date(parsed).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

function getProfessorIdentity(invite: ProfessorAccessKey) {
  return {
    name: invite.usedByName || "Compte professeur",
    email: invite.usedByEmail || invite.usedBy || "",
  };
}

export default function AdminProfessorAccessKeysView({
  professorInvites,
  accessKeyStatusMsg,
  isLoadingAccessKeys,
  isCreatingAccessKey,
  siteSettings,
  siteSettingsStatusMsg,
  isLoadingSiteSettings,
  isSavingSiteSettings,
  refreshProfessorInvites,
  handleCreateProfessorInvite,
  handleDeleteProfessorInvite,
  handleUpdateForceDesktopMode,
}: AdminProfessorAccessKeysViewProps) {
  const [copiedCode, setCopiedCode] = useState("");
  const [page, setPage] = useState(1);
  const counts = useMemo(() => {
    const used = professorInvites.filter((invite) => Boolean(invite.usedAt)).length;
    const available = professorInvites.filter((invite) => !invite.usedAt && !invite.revokedAt).length;
    return { total: professorInvites.length, used, available };
  }, [professorInvites]);
  const totalPages = Math.max(1, Math.ceil(professorInvites.length / PAGE_SIZE));
  const visibleInvites = useMemo(
    () => professorInvites.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [page, professorInvites],
  );

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      window.setTimeout(() => setCopiedCode((current) => (current === code ? "" : current)), 1600);
    } catch {
      setCopiedCode("");
    }
  };

  const handleGenerate = async () => {
    await handleCreateProfessorInvite();
    setPage(1);
  };

  const stats = [
    {
      label: "Codes générés",
      value: counts.total,
      icon: KeyRound,
      iconClassName: "bg-teal-500/10 text-teal-400",
      lineClassName: "bg-teal-500",
    },
    {
      label: "Disponibles",
      value: counts.available,
      icon: ShieldCheck,
      iconClassName: "bg-emerald-500/10 text-emerald-400",
      lineClassName: "bg-emerald-500",
    },
    {
      label: "Utilisés",
      value: counts.used,
      icon: UserRound,
      iconClassName: "bg-emerald-500/10 text-emerald-400",
      lineClassName: "bg-emerald-400",
    },
  ];

  const renderActions = (invite: ProfessorAccessKey) => (
    <div className="flex items-center gap-2 md:justify-end">
      <button
        type="button"
        onClick={() => void handleCopy(invite.code)}
        className={`inline-flex h-11 w-11 items-center justify-center rounded-lg border transition-colors ${
          copiedCode === invite.code
            ? "border-teal-400/60 bg-teal-500/15 text-teal-300"
            : "border-slate-600/60 bg-slate-800/60 text-slate-300 hover:border-slate-500 hover:bg-slate-800"
        }`}
        title="Copier le code"
        aria-label={`Copier le code ${invite.code}`}
      >
        <Copy className="h-5 w-5" />
      </button>
      <span className="sr-only" aria-live="polite">
        {copiedCode === invite.code ? "Code copié" : ""}
      </span>
      <button
        type="button"
        onClick={() => void handleDeleteProfessorInvite(invite.code)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-emerald-500/70 bg-emerald-500/15 text-emerald-300 transition-colors hover:bg-emerald-500/25 hover:text-white"
        title={invite.usedAt ? "Supprimer le code utilisé" : "Supprimer le code"}
        aria-label={`Supprimer le code ${invite.code}`}
      >
        <Trash2 className="h-5 w-5" />
      </button>
    </div>
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-700/60 bg-[#07101f] text-slate-100 shadow-[0_24px_80px_rgba(2,6,23,0.45)]">
      <header className="flex flex-col gap-6 border-b border-slate-800/80 px-5 py-6 sm:px-7 lg:flex-row lg:items-center lg:justify-between lg:px-10 lg:py-8">
        <div className="flex min-w-0 items-center gap-4 sm:gap-5">
          <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-800 text-white shadow-[0_12px_30px_rgba(4, 154, 132,0.3)] sm:h-16 sm:w-16">
            <KeyRound className="h-7 w-7" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-black text-white sm:text-3xl">Administration</h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
              Un code à usage unique autorise la création d&apos;un seul compte professeur.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 lg:justify-end">
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={isCreatingAccessKey}
            className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-gradient-to-r from-teal-700 to-teal-600 px-5 text-sm font-black text-white shadow-[0_10px_24px_rgba(4, 154, 132,0.25)] transition-colors hover:from-teal-600 hover:to-teal-500 disabled:cursor-wait disabled:opacity-50"
          >
            <Plus className="h-5 w-5" />
            {isCreatingAccessKey ? "Génération…" : "Générer un code"}
          </button>
          <button
            type="button"
            onClick={() => void refreshProfessorInvites()}
            disabled={isLoadingAccessKeys}
            className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-slate-500/80 bg-transparent px-5 text-sm font-bold text-slate-100 transition-colors hover:border-slate-400 hover:bg-slate-800/60 disabled:cursor-wait disabled:opacity-50"
          >
            <RefreshCw className={`h-5 w-5 text-slate-400 ${isLoadingAccessKeys ? "animate-spin" : ""}`} />
            Actualiser
          </button>
        </div>
      </header>

      <div className="space-y-6 p-4 sm:p-6 lg:p-9">
        <section className="flex flex-col gap-5 rounded-xl border border-slate-700/60 bg-[#0b1528] px-5 py-5 shadow-[0_16px_50px_rgba(2,6,23,0.22)] sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:py-7">
          <div className="flex min-w-0 gap-4">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-300 ring-1 ring-teal-400/20">
              <MonitorCog className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Affichage global</p>
              <h2 className="mt-1 text-xl font-black text-white">Forcer le mode ordinateur</h2>
              <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-slate-400">
                Désactivé, le site reste responsive. Activé, tous les appareils utilisent la largeur ordinateur fixe.
              </p>
              {siteSettingsStatusMsg && (
                <p role="status" className="mt-3 text-sm font-semibold text-teal-200">
                  {siteSettingsStatusMsg}
                </p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <span
              className={`rounded-lg px-3 py-2 text-xs font-black uppercase tracking-wider ${
                siteSettings.forceDesktopMode
                  ? "bg-teal-500/15 text-teal-200 ring-1 ring-teal-400/30"
                  : "bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-400/25"
              }`}
            >
              {siteSettings.forceDesktopMode ? "Activé" : "Désactivé"}
            </span>
            <button
              type="button"
              aria-pressed={siteSettings.forceDesktopMode}
              onClick={() => void handleUpdateForceDesktopMode(!siteSettings.forceDesktopMode)}
              disabled={isLoadingSiteSettings || isSavingSiteSettings}
              className={`relative h-11 w-[5.75rem] rounded-full border p-1 transition-colors ${
                siteSettings.forceDesktopMode
                  ? "border-teal-400/50 bg-teal-600/80"
                  : "border-slate-600/70 bg-slate-800"
              } disabled:cursor-wait disabled:opacity-60`}
            >
              <span
                className={`block h-8 w-8 rounded-full bg-white shadow-[0_8px_20px_rgba(2,6,23,0.35)] transition-transform ${
                  siteSettings.forceDesktopMode ? "translate-x-12" : "translate-x-0"
                }`}
              />
              <span className="sr-only">Basculer le mode ordinateur forcé</span>
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 overflow-hidden rounded-xl border border-slate-700/60 bg-[#0b1528] sm:grid-cols-3 sm:divide-x sm:divide-slate-700/60">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className={`flex items-center gap-4 px-5 py-5 sm:px-6 lg:gap-5 lg:px-8 lg:py-7 ${
                  index > 0 ? "border-t border-slate-700/60 sm:border-t-0" : ""
                }`}
              >
                <span
                  className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full lg:h-14 lg:w-14 ${stat.iconClassName}`}
                >
                  <Icon className="h-6 w-6 lg:h-7 lg:w-7" />
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-400">{stat.label}</p>
                  <p className="mt-1 text-2xl font-black tabular-nums text-white">{stat.value}</p>
                  <span className={`mt-3 block h-1 w-9 rounded-full ${stat.lineClassName}`} />
                </div>
              </div>
            );
          })}
        </section>

        {accessKeyStatusMsg && (
          <p
            role="status"
            className="rounded-lg border border-teal-500/30 bg-teal-500/10 px-4 py-3 text-sm font-semibold text-teal-200"
          >
            {accessKeyStatusMsg}
          </p>
        )}

        <section className="overflow-hidden rounded-xl border border-slate-700/60 bg-[#0b1528]">
          <div className="flex items-center justify-between gap-3 border-b border-slate-700/60 px-5 py-5 sm:px-7">
            <h2 className="flex items-center gap-3 text-lg font-black text-white">
              <FileKey2 className="h-5 w-5 text-teal-400" />
              Registre des codes
            </h2>
            <span className="rounded-lg bg-slate-800/80 px-3 py-2 text-xs font-semibold tabular-nums text-slate-300">
              {counts.total} au total
            </span>
          </div>

          {isLoadingAccessKeys && professorInvites.length === 0 ? (
            <div className="flex min-h-52 items-center justify-center text-sm font-semibold text-slate-400">
              Chargement des codes…
            </div>
          ) : professorInvites.length === 0 ? (
            <div className="flex min-h-52 flex-col items-center justify-center gap-3 px-5 text-center">
              <KeyRound className="h-7 w-7 text-slate-600" />
              <p className="text-sm font-bold text-slate-300">Aucun code professeur généré</p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[880px] table-fixed text-left">
                  <thead className="border-b border-slate-700/60 bg-slate-950/20 text-[11px] font-black uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="w-[21%] px-7 py-4">Code</th>
                      <th className="w-[15%] px-5 py-4">Statut</th>
                      <th className="w-[27%] px-5 py-4">Professeur associé</th>
                      <th className="w-[23%] px-5 py-4">Date d&apos;utilisation</th>
                      <th className="w-[14%] px-7 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/60">
                    {visibleInvites.map((invite) => {
                      const isUsed = Boolean(invite.usedAt);
                      const professor = getProfessorIdentity(invite);
                      return (
                        <tr key={invite.code} className="transition-colors hover:bg-white/[0.025]">
                          <td className="px-7 py-5 align-middle">
                            <p className="font-mono text-base font-black tracking-wider text-white">{invite.code}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              Créé le {formatAccessKeyDate(invite.createdAt)}
                            </p>
                          </td>
                          <td className="px-5 py-5 align-middle">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-bold ${
                                isUsed ? "bg-emerald-500/15 text-emerald-300" : "bg-teal-500/15 text-teal-300"
                              }`}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              {isUsed ? "Utilisé" : "Disponible"}
                            </span>
                          </td>
                          <td className="px-5 py-5 align-middle">
                            {isUsed ? (
                              <div className="min-w-0">
                                <p className="truncate text-sm font-black text-white">{professor.name}</p>
                                {professor.email && (
                                  <p className="mt-1 truncate text-xs text-slate-400">{professor.email}</p>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm font-semibold text-slate-500">En attente d&apos;utilisation</p>
                            )}
                          </td>
                          <td className="px-5 py-5 align-middle text-sm font-bold text-slate-200">
                            {formatAccessKeyDate(invite.usedAt)}
                          </td>
                          <td className="px-7 py-5 align-middle">{renderActions(invite)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-slate-700/60 md:hidden">
                {visibleInvites.map((invite) => {
                  const isUsed = Boolean(invite.usedAt);
                  const professor = getProfessorIdentity(invite);
                  return (
                    <article key={invite.code} className="space-y-4 px-5 py-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-mono text-base font-black tracking-wider text-white">{invite.code}</p>
                          <p className="mt-1 text-xs text-slate-500">Créé le {formatAccessKeyDate(invite.createdAt)}</p>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-bold ${
                            isUsed ? "bg-emerald-500/15 text-emerald-300" : "bg-teal-500/15 text-teal-300"
                          }`}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {isUsed ? "Utilisé" : "Disponible"}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                            Professeur associé
                          </p>
                          <p className="mt-1 font-bold text-slate-200">
                            {isUsed ? professor.name : "En attente d'utilisation"}
                          </p>
                          {isUsed && professor.email && (
                            <p className="mt-0.5 truncate text-xs text-slate-400">{professor.email}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                            Date d&apos;utilisation
                          </p>
                          <p className="mt-1 font-bold text-slate-200">{formatAccessKeyDate(invite.usedAt)}</p>
                        </div>
                      </div>
                      {renderActions(invite)}
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>

        {professorInvites.length > 0 && (
          <nav className="flex items-center justify-center gap-4 pt-1" aria-label="Pagination des codes professeur">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Page précédente"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="inline-flex h-11 min-w-11 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 px-3 text-sm font-black tabular-nums text-white shadow-[0_8px_20px_rgba(4, 154, 132,0.25)]">
              {page}
            </span>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page === totalPages}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Page suivante"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}
