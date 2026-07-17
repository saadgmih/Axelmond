import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, RefreshCw, Search, ShieldCheck, WalletCards } from "lucide-react";
import { api } from "../../api";
import { getClientErrorMessage } from "../../client-errors";
import type {
  AdminCenterPaymentRequestView,
  CenterPaymentMethod,
  CenterPaymentStatus,
} from "../../center-payment-types";
import CenterPaymentReceipt from "../../components/CenterPaymentReceipt";

const STATUS_LABELS: Record<CenterPaymentStatus, string> = {
  PENDING_PAYMENT: "En attente",
  UNDER_REVIEW: "En vérification",
  PAID: "Payé",
  REJECTED: "Rejeté",
  EXPIRED: "Expiré",
  CANCELLED: "Annulé",
  REFUNDED: "Remboursé",
};

const METHOD_LABELS: Record<CenterPaymentMethod, string> = {
  CASH: "Espèces",
  CARD_AT_CENTER: "Carte au centre",
  BANK_TRANSFER: "Virement bancaire",
  CHECK: "Chèque",
  OTHER: "Autre",
};

export default function AdminCenterPaymentsView() {
  const [rows, setRows] = useState<AdminCenterPaymentRequestView[]>([]);
  const [selected, setSelected] = useState<AdminCenterPaymentRequestView | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<CenterPaymentStatus | "">("");
  const [amount, setAmount] = useState("");
  const [courseId, setCourseId] = useState("");
  const [validatedBy, setValidatedBy] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [receivedAmount, setReceivedAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<CenterPaymentMethod>("CASH");
  const [physicalReceiptReference, setPhysicalReceiptReference] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [publicReason, setPublicReason] = useState("");

  const filters = useMemo(
    () => ({
      ...(query.trim() ? { q: query.trim() } : {}),
      ...(status ? { status } : {}),
      ...(amount && Number.isFinite(Number(amount)) ? { amount: Number(amount) } : {}),
      ...(courseId && Number.isInteger(Number(courseId)) ? { courseId: Number(courseId) } : {}),
      ...(validatedBy.trim() ? { validatedBy: validatedBy.trim() } : {}),
      ...(from ? { from: new Date(`${from}T00:00:00`).toISOString() } : {}),
      ...(to ? { to: new Date(`${to}T23:59:59.999`).toISOString() } : {}),
    }),
    [amount, courseId, from, query, status, to, validatedBy],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.getAdminCenterPaymentRequests(filters);
      setRows(result);
      setSelected((current) => result.find((row) => row.reference === current?.reference) || result[0] || null);
    } catch (loadError) {
      setError(getClientErrorMessage(loadError, "Chargement des paiements impossible."));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!selected) return;
    setReceivedAmount(selected.amount.toFixed(2));
    setInternalNote(selected.adminNote || "");
    setPublicReason(selected.publicReason || "");
  }, [selected?.reference]);

  const refreshSelected = async (reference: string) => {
    const detail = await api.getAdminCenterPaymentRequest(reference);
    setSelected(detail);
    setRows((current) => current.map((row) => (row.reference === reference ? detail : row)));
    return detail;
  };

  const runAction = async (action: () => Promise<unknown>, successMessage: string) => {
    if (!selected || busy) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await action();
      await refreshSelected(selected.reference);
      await load();
      setSuccess(successMessage);
    } catch (actionError) {
      setError(getClientErrorMessage(actionError, "Action impossible."));
    } finally {
      setBusy(false);
    }
  };

  const validate = () => {
    if (!selected || !window.confirm(`Confirmer la réception de ${receivedAmount} ${selected.currency} ?`)) return;
    const idempotencyKey = globalThis.crypto?.randomUUID?.() || `center-${Date.now()}-${selected.reference}`;
    void runAction(
      () =>
        api.validateCenterPaymentRequest(selected.reference, {
          receivedAmount: Number(receivedAmount),
          paymentMethod,
          physicalReceiptReference: physicalReceiptReference.trim() || undefined,
          internalNote: internalNote.trim() || undefined,
          idempotencyKey,
        }),
      "Paiement validé et accès activé.",
    );
  };

  return (
    <main className="space-y-5 p-4 md:p-6" aria-labelledby="admin-center-payments-title">
      <header className="rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/10 to-slate-950/20 p-6">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">
          <ShieldCheck className="h-4 w-4" /> Administration
        </p>
        <h1 id="admin-center-payments-title" className="mt-2 text-2xl font-black text-white md:text-3xl">
          Paiements au centre
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Vérification, validation atomique, reçus et historique complet des demandes physiques.
        </p>
      </header>

      <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="relative">
          <span className="sr-only">Rechercher une référence, un étudiant ou un module</span>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Référence, étudiant, e-mail, module…"
            className="w-full rounded-xl border border-white/10 bg-slate-950/60 py-2.5 pl-10 pr-3 text-sm text-white outline-none focus:border-emerald-400/50"
          />
        </label>
        <label>
          <span className="sr-only">Filtrer par statut</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as CenterPaymentStatus | "")}
            className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm text-white"
          >
            <option value="">Tous les statuts</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Filtrer par montant</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="Montant MAD"
            className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm text-white"
          />
        </label>
        <label>
          <span className="sr-only">Filtrer par identifiant du module</span>
          <input
            type="number"
            min="1"
            step="1"
            value={courseId}
            onChange={(event) => setCourseId(event.target.value)}
            placeholder="ID du module"
            className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm text-white"
          />
        </label>
        <label>
          <span className="sr-only">Filtrer par identifiant du validateur</span>
          <input
            value={validatedBy}
            onChange={(event) => setValidatedBy(event.target.value)}
            placeholder="ID du validateur"
            className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm text-white"
          />
        </label>
        <label className="grid grid-cols-[auto_1fr] items-center gap-2 text-xs font-bold text-slate-400">
          Depuis
          <input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm text-white"
          />
        </label>
        <label className="grid grid-cols-[auto_1fr] items-center gap-2 text-xs font-bold text-slate-400">
          Jusqu’au
          <input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm text-white"
          />
        </label>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white"
        >
          Actualiser
        </button>
      </div>

      {success && (
        <p
          role="status"
          className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-emerald-200"
        >
          {success}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-200"
        >
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}

      <div className="grid min-h-[520px] gap-5 xl:grid-cols-[minmax(360px,0.8fr)_minmax(0,1.2fr)]">
        <section className="overflow-hidden rounded-2xl border border-white/10">
          <div className="border-b border-white/10 px-4 py-3 text-xs font-bold uppercase tracking-widest text-slate-400">
            {loading ? "Chargement…" : `${rows.length} demande(s)`}
          </div>
          <div className="max-h-[680px] divide-y divide-white/[0.06] overflow-y-auto">
            {rows.map((row) => (
              <button
                key={row.reference}
                type="button"
                onClick={() => setSelected(row)}
                className={`w-full p-4 text-left transition ${selected?.reference === row.reference ? "bg-emerald-500/10" : "hover:bg-white/[0.03]"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-black text-emerald-200">{row.reference}</p>
                    <p className="mt-1 truncate font-bold text-white">{row.student.fullName}</p>
                    <p className="truncate text-xs text-slate-500">{row.module.title}</p>
                  </div>
                  <span className="rounded-lg bg-white/10 px-2 py-1 text-[10px] font-bold text-slate-200">
                    {STATUS_LABELS[row.status]}
                  </span>
                </div>
                <p className="mt-3 text-sm font-black text-white">
                  {row.amount.toFixed(2)} {row.currency}
                </p>
              </button>
            ))}
            {!loading && rows.length === 0 && (
              <p className="p-8 text-center text-sm text-slate-500">Aucune demande trouvée.</p>
            )}
          </div>
        </section>

        {selected ? (
          <section className="space-y-5 rounded-2xl border border-white/10 bg-slate-950/25 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-lg font-black text-emerald-200">{selected.reference}</p>
                <h2 className="mt-1 text-xl font-bold text-white">{selected.module.title}</h2>
                <p className="mt-1 text-sm text-slate-400">
                  {selected.student.fullName} · {selected.student.email}
                </p>
              </div>
              <span className="rounded-xl bg-white/10 px-3 py-1.5 text-xs font-bold text-white">
                {STATUS_LABELS[selected.status]}
              </span>
            </div>

            <dl className="grid gap-3 rounded-xl bg-white/[0.03] p-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <AdminDetail label="Prix enregistré" value={`${selected.amount.toFixed(2)} ${selected.currency}`} />
              <AdminDetail label="Prix actuel" value={`${selected.currentModulePrice.toFixed(2)} MAD`} />
              <AdminDetail label="Expiration" value={new Date(selected.expiresAt).toLocaleString("fr-MA")} />
              <AdminDetail label="Création" value={new Date(selected.createdAt).toLocaleString("fr-MA")} />
              <AdminDetail
                label="Validation"
                value={selected.validatedAt ? new Date(selected.validatedAt).toLocaleString("fr-MA") : "—"}
              />
              <AdminDetail label="Validé par" value={selected.validatedBy?.fullName || "—"} />
            </dl>

            {(selected.status === "PENDING_PAYMENT" || selected.status === "UNDER_REVIEW") && (
              <fieldset
                disabled={busy}
                className="space-y-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.06] p-4"
              >
                <legend className="px-2 text-sm font-black text-emerald-200">Valider le paiement</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Montant réellement reçu">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={receivedAmount}
                      onChange={(event) => setReceivedAmount(event.target.value)}
                      className="admin-payment-input"
                    />
                  </Field>
                  <Field label="Moyen de paiement">
                    <select
                      value={paymentMethod}
                      onChange={(event) => setPaymentMethod(event.target.value as CenterPaymentMethod)}
                      className="admin-payment-input"
                    >
                      {Object.entries(METHOD_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Référence du reçu physique">
                    <input
                      value={physicalReceiptReference}
                      onChange={(event) => setPhysicalReceiptReference(event.target.value)}
                      className="admin-payment-input"
                    />
                  </Field>
                  <Field label="Note interne">
                    <input
                      value={internalNote}
                      onChange={(event) => setInternalNote(event.target.value)}
                      className="admin-payment-input"
                    />
                  </Field>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selected.status === "PENDING_PAYMENT" && (
                    <button
                      type="button"
                      onClick={() =>
                        void runAction(
                          () => api.reviewCenterPaymentRequest(selected.reference, internalNote),
                          "Paiement passé en vérification.",
                        )
                      }
                      className="rounded-xl border border-sky-400/25 px-4 py-2.5 text-sm font-bold text-sky-200"
                    >
                      Passer en vérification
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={validate}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Valider et activer
                  </button>
                </div>
              </fieldset>
            )}

            <div className="space-y-3 rounded-2xl border border-white/10 p-4">
              <Field label="Motif public pour rejet, annulation ou remboursement">
                <textarea
                  value={publicReason}
                  onChange={(event) => setPublicReason(event.target.value)}
                  rows={2}
                  className="admin-payment-input"
                />
              </Field>
              <div className="flex flex-wrap gap-2">
                {selected.status === "UNDER_REVIEW" && (
                  <button
                    type="button"
                    disabled={busy || !publicReason.trim()}
                    onClick={() =>
                      void runAction(
                        () => api.rejectCenterPaymentRequest(selected.reference, publicReason, internalNote),
                        "Paiement rejeté.",
                      )
                    }
                    className="rounded-xl border border-red-400/25 px-4 py-2 text-sm font-bold text-red-200 disabled:opacity-40"
                  >
                    Rejeter
                  </button>
                )}
                {(selected.status === "PENDING_PAYMENT" || selected.status === "UNDER_REVIEW") && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void runAction(
                        () =>
                          api.cancelAdminCenterPaymentRequest(
                            selected.reference,
                            publicReason || "Demande annulée par le centre",
                            internalNote,
                          ),
                        "Demande annulée.",
                      )
                    }
                    className="rounded-xl border border-slate-400/25 px-4 py-2 text-sm font-bold text-slate-200"
                  >
                    Annuler
                  </button>
                )}
                {selected.status === "PAID" && (
                  <button
                    type="button"
                    disabled={busy || !publicReason.trim()}
                    onClick={() =>
                      void runAction(
                        () => api.refundCenterPaymentRequest(selected.reference, publicReason, internalNote),
                        "Paiement remboursé.",
                      )
                    }
                    className="rounded-xl border border-violet-400/25 px-4 py-2 text-sm font-bold text-violet-200 disabled:opacity-40"
                  >
                    Rembourser
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy || !internalNote.trim()}
                  onClick={() =>
                    void runAction(
                      () => api.addCenterPaymentAdminNote(selected.reference, internalNote),
                      "Note enregistrée.",
                    )
                  }
                  className="rounded-xl border border-white/15 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
                >
                  Enregistrer la note
                </button>
              </div>
            </div>

            <section>
              <h3 className="flex items-center gap-2 font-black text-white">
                <RefreshCw className="h-4 w-4 text-emerald-300" />
                Historique immuable
              </h3>
              <ol className="mt-3 space-y-2">
                {selected.history.map((entry) => (
                  <li key={entry.id} className="rounded-xl border border-white/[0.07] p-3 text-sm text-slate-300">
                    <div className="flex flex-wrap justify-between gap-2">
                      <strong className="text-white">
                        {entry.previousStatus ? `${STATUS_LABELS[entry.previousStatus]} → ` : ""}
                        {STATUS_LABELS[entry.newStatus]}
                      </strong>
                      <time className="text-xs text-slate-500">
                        {new Date(entry.createdAt).toLocaleString("fr-MA")}
                      </time>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {entry.changedBy?.fullName || entry.actorType}
                      {entry.publicReason ? ` · ${entry.publicReason}` : ""}
                    </p>
                  </li>
                ))}
              </ol>
            </section>

            {selected.receipt && <CenterPaymentReceipt receipt={selected.receipt} />}
          </section>
        ) : (
          <div className="flex items-center justify-center rounded-2xl border border-dashed border-white/15 p-10 text-slate-500">
            <WalletCards className="mr-2 h-5 w-5" />
            Sélectionnez une demande.
          </div>
        )}
      </div>
    </main>
  );
}

function AdminDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</dt>
      <dd className="mt-1 font-semibold text-slate-200">{value}</dd>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-xs font-bold text-slate-300">
      <span className="mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}
