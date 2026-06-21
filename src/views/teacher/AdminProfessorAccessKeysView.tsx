import { useMemo, useState } from "react";
import { Copy, KeyRound, Plus, RefreshCw, ShieldCheck, Trash2, UserCheck } from "lucide-react";
import type { ProfessorAccessKey } from "../../hooks/useTeacherDashboard";

interface AdminProfessorAccessKeysViewProps {
  professorInvites: ProfessorAccessKey[];
  accessKeyStatusMsg: string;
  isLoadingAccessKeys: boolean;
  isCreatingAccessKey: boolean;
  refreshProfessorInvites: () => void | Promise<void>;
  handleCreateProfessorInvite: () => void | Promise<void>;
  handleDeleteProfessorInvite: (code: string) => void | Promise<void>;
}

function formatAccessKeyDate(value?: string | null) {
  if (!value) return "—";
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return "—";
  return new Date(parsed).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

export default function AdminProfessorAccessKeysView({
  professorInvites,
  accessKeyStatusMsg,
  isLoadingAccessKeys,
  isCreatingAccessKey,
  refreshProfessorInvites,
  handleCreateProfessorInvite,
  handleDeleteProfessorInvite,
}: AdminProfessorAccessKeysViewProps) {
  const [copiedCode, setCopiedCode] = useState("");
  const counts = useMemo(() => {
    const used = professorInvites.filter((invite) => Boolean(invite.usedAt)).length;
    return { total: professorInvites.length, used, available: professorInvites.length - used };
  }, [professorInvites]);

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      window.setTimeout(() => setCopiedCode((current) => (current === code ? "" : current)), 1600);
    } catch {
      setCopiedCode("");
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-violet-200 bg-violet-50 text-violet-700">
            <KeyRound className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-violet-700">Administration</p>
            <h1 className="mt-1 text-2xl font-black text-slate-950">Codes d&apos;accès professeur</h1>
            <p className="mt-1 text-sm text-slate-500">
              Un code à usage unique autorise la création d&apos;un seul compte professeur.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void refreshProfessorInvites()}
            disabled={isLoadingAccessKeys}
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-wait disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingAccessKeys ? "animate-spin" : ""}`} />
            Actualiser
          </button>
          <button
            type="button"
            onClick={() => void handleCreateProfessorInvite()}
            disabled={isCreatingAccessKey}
            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:cursor-wait disabled:bg-slate-400"
          >
            <Plus className="h-4 w-4" />
            {isCreatingAccessKey ? "Génération…" : "Générer un code"}
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 border-y border-slate-200 bg-white sm:grid-cols-3 sm:divide-x sm:divide-slate-200">
        <div className="flex items-center gap-3 px-4 py-4">
          <KeyRound className="h-5 w-5 text-slate-400" />
          <div>
            <p className="text-xs font-semibold text-slate-500">Codes générés</p>
            <p className="text-xl font-black tabular-nums text-slate-950">{counts.total}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 border-t border-slate-200 px-4 py-4 sm:border-t-0">
          <ShieldCheck className="h-5 w-5 text-violet-600" />
          <div>
            <p className="text-xs font-semibold text-slate-500">Disponibles</p>
            <p className="text-xl font-black tabular-nums text-slate-950">{counts.available}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 border-t border-slate-200 px-4 py-4 sm:border-t-0">
          <UserCheck className="h-5 w-5 text-emerald-600" />
          <div>
            <p className="text-xs font-semibold text-slate-500">Utilisés</p>
            <p className="text-xl font-black tabular-nums text-slate-950">{counts.used}</p>
          </div>
        </div>
      </section>

      {accessKeyStatusMsg && (
        <p
          role="status"
          className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700"
        >
          {accessKeyStatusMsg}
        </p>
      )}

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
          <h2 className="text-sm font-black text-slate-900">Registre des codes</h2>
          <span className="text-xs font-semibold tabular-nums text-slate-500">{counts.total} au total</span>
        </div>

        {isLoadingAccessKeys && professorInvites.length === 0 ? (
          <div className="flex min-h-40 items-center justify-center text-sm font-semibold text-slate-500">
            Chargement des codes…
          </div>
        ) : professorInvites.length === 0 ? (
          <div className="flex min-h-40 flex-col items-center justify-center gap-2 px-5 text-center">
            <KeyRound className="h-6 w-6 text-slate-300" />
            <p className="text-sm font-bold text-slate-700">Aucun code professeur généré</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {professorInvites.map((invite) => {
              const isUsed = Boolean(invite.usedAt);
              const professorName = invite.usedByName || "Compte professeur";
              const professorEmail = invite.usedByEmail || invite.usedBy || "";

              return (
                <article
                  key={invite.code}
                  className="grid grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-[minmax(13rem,0.8fr)_minmax(15rem,1fr)_minmax(12rem,0.8fr)_auto] lg:items-center lg:px-5"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-base font-black tracking-wider text-slate-950">
                        {invite.code}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                          isUsed ? "bg-emerald-100 text-emerald-800" : "bg-violet-100 text-violet-800"
                        }`}
                      >
                        {isUsed ? "Utilisé" : "Disponible"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">Créé le {formatAccessKeyDate(invite.createdAt)}</p>
                  </div>

                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Professeur associé</p>
                    {isUsed ? (
                      <div className="mt-1 min-w-0">
                        <p className="truncate text-sm font-bold text-slate-800">{professorName}</p>
                        {professorEmail && <p className="truncate text-xs text-slate-500">{professorEmail}</p>}
                      </div>
                    ) : (
                      <p className="mt-1 text-sm font-semibold text-slate-400">En attente d&apos;utilisation</p>
                    )}
                  </div>

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Date d&apos;utilisation
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-700">{formatAccessKeyDate(invite.usedAt)}</p>
                  </div>

                  <div className="flex items-center gap-2 lg:justify-end">
                    <button
                      type="button"
                      onClick={() => void handleCopy(invite.code)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-950"
                      title="Copier le code"
                      aria-label={`Copier le code ${invite.code}`}
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <span className="sr-only" aria-live="polite">
                      {copiedCode === invite.code ? "Code copié" : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleDeleteProfessorInvite(invite.code)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-rose-200 bg-rose-50 text-rose-700 transition-colors hover:bg-rose-100"
                      title={isUsed ? "Supprimer le code utilisé" : "Supprimer le code"}
                      aria-label={`Supprimer le code ${invite.code}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
