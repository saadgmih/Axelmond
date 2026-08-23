import { useState, useEffect } from "react";
import { api } from "../api";
import { getClientErrorMessage } from "../client-errors";
import { Calendar, CheckCircle2, Copy, KeyRound, Loader2, RefreshCw } from "lucide-react";

interface AccessCode {
  id: string;
  code: string;
  internalName: string;
  administrativeStatus: string;
  startsAt: string;
  endsAt: string;
  maxTotalUses: number | null;
  totalConfirmedUses: number;
  totalReservedUses: number;
  createdAt: string;
}

interface AdminAccessCodesProps {
  courseId: number;
  courseTitle: string;
}

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "text-emerald-300 bg-emerald-500/10 border-emerald-400/20",
  EXPIRED: "text-slate-400 bg-slate-500/10 border-slate-400/20",
  ARCHIVED: "text-slate-500 bg-slate-500/10 border-slate-400/20",
  DISABLED: "text-red-400 bg-red-500/10 border-red-400/20",
  PAUSED: "text-amber-300 bg-amber-500/10 border-amber-400/20",
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Actif",
  EXPIRED: "Expiré",
  ARCHIVED: "Archivé",
  DISABLED: "Désactivé",
  PAUSED: "En pause",
};

export function AdminAccessCodes({ courseId, courseTitle }: AdminAccessCodesProps) {
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const todayDate = new Date().toISOString().slice(0, 10);
  const in30DaysDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [startsAt, setStartsAt] = useState(todayDate);
  const [endsAt, setEndsAt] = useState(in30DaysDate);
  const [maxUses, setMaxUses] = useState(1);
  const [label, setLabel] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.listAccessCodes(courseId);
      setCodes(result);
    } catch (err) {
      setError(getClientErrorMessage(err, "Impossible de charger les codes."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [courseId]);

  const applyPreset = (days: number) => {
    const start = startsAt ? new Date(startsAt) : new Date();
    const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
    setEndsAt(end.toISOString().slice(0, 10));
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError("");
    setLastGenerated(null);
    try {
      const result = await api.generateAccessCode(courseId, {
        startsAt: startsAt ? new Date(`${startsAt}T00:00:00`).toISOString() : undefined,
        endsAt: endsAt ? new Date(`${endsAt}T23:59:59`).toISOString() : undefined,
        maxUses,
        label: label.trim() || undefined,
      });
      setLastGenerated(result.code);
      await load();
    } catch (err) {
      setError(getClientErrorMessage(err, "Impossible de générer le code."));
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-bold text-white">
          <KeyRound className="h-4 w-4 text-violet-300" />
          Codes d&apos;accès — {courseTitle}
        </h3>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
          title="Actualiser"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Generate section */}
      <div className="rounded-xl border border-violet-400/20 bg-violet-500/[0.06] p-4 space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-violet-300">
          Générer un code avec dates de début et fin d&apos;accès
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block text-xs text-slate-400">
            <span className="flex items-center gap-1 font-semibold text-slate-300 mb-1">
              <Calendar className="h-3.5 w-3.5 text-violet-300" /> Date de début d&apos;accès
            </span>
            <input
              type="date"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white outline-none focus:border-violet-400/50"
            />
          </label>

          <label className="block text-xs text-slate-400">
            <span className="flex items-center gap-1 font-semibold text-slate-300 mb-1">
              <Calendar className="h-3.5 w-3.5 text-violet-300" /> Date de fin d&apos;accès
            </span>
            <input
              type="date"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white outline-none focus:border-violet-400/50"
            />
          </label>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[10px] uppercase font-bold text-slate-500">Raccourcis :</span>
          <button
            type="button"
            onClick={() => applyPreset(30)}
            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-medium text-slate-300 hover:bg-white/10"
          >
            +30 jours
          </button>
          <button
            type="button"
            onClick={() => applyPreset(60)}
            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-medium text-slate-300 hover:bg-white/10"
          >
            +60 jours
          </button>
          <button
            type="button"
            onClick={() => applyPreset(90)}
            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-medium text-slate-300 hover:bg-white/10"
          >
            +90 jours (3 mois)
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <label className="block text-xs text-slate-400">
            Utilisations max
            <input
              type="number"
              min={1}
              max={500}
              value={maxUses}
              onChange={(e) => setMaxUses(Math.max(1, Number(e.target.value)))}
              className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-1.5 text-sm text-white outline-none focus:border-violet-400/50"
            />
          </label>
          <label className="block text-xs text-slate-400">
            Note / Libellé (Optionnel)
            <input
              type="text"
              placeholder="Ex: Étudiant Groupe A"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-1.5 text-sm text-white outline-none focus:border-violet-400/50"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={generating}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-violet-500 disabled:opacity-60"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
          {generating ? "Génération en cours…" : "Générer le code d'accès"}
        </button>

        {lastGenerated && (
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] text-emerald-300 font-bold uppercase">Code généré avec succès</p>
              <p className="font-mono text-lg font-black tracking-widest text-emerald-200">{lastGenerated}</p>
              <p className="text-[10px] text-emerald-300/80 mt-0.5">
                Période d&apos;accès : {startsAt} ➔ {endsAt}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleCopy(lastGenerated)}
              className="rounded-lg border border-emerald-400/25 bg-emerald-500/10 p-2 text-emerald-200 hover:bg-emerald-500/20 transition-colors"
              title="Copier"
            >
              {copiedCode === lastGenerated ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        )}

        {error && <p className="text-xs font-medium text-red-400">{error}</p>}
      </div>

      {/* Existing codes list */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
          Codes existants ({codes.length})
        </p>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : codes.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-500">Aucun code généré pour ce module.</p>
        ) : (
          <div className="space-y-2">
            {codes.map((c) => {
              const used = c.totalConfirmedUses;
              const maxTotal = c.maxTotalUses ?? 1;
              const isExhausted = used >= maxTotal;
              const colorClass = STATUS_COLOR[c.administrativeStatus] ?? "text-slate-400";
              const labelText = STATUS_LABEL[c.administrativeStatus] ?? c.administrativeStatus;
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-bold text-white">{c.code}</span>
                      <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-bold ${colorClass}`}>
                        {labelText}
                      </span>
                      {isExhausted && (
                        <span className="rounded-full border border-slate-500/30 bg-slate-500/10 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">
                          Épuisé
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      Période : {new Date(c.startsAt).toLocaleDateString("fr-MA")} ➔{" "}
                      {new Date(c.endsAt).toLocaleDateString("fr-MA")}
                      {" · "}
                      {used}/{maxTotal} utilisation{maxTotal > 1 ? "s" : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleCopy(c.code)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
                    title="Copier le code"
                  >
                    {copiedCode === c.code ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
