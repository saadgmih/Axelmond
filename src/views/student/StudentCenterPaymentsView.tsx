import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Building2, CalendarClock, CheckCircle2, Clock3, RefreshCw, XCircle } from "lucide-react";
import { api } from "../../api";
import { getClientErrorMessage } from "../../client-errors";
import type { CenterPaymentRequestView, CenterPaymentStatus } from "../../center-payment-types";
import CenterPaymentReceipt from "../../components/CenterPaymentReceipt";

const STATUS: Record<CenterPaymentStatus, { label: string; className: string; icon: typeof Clock3 }> = {
  PENDING_PAYMENT: { label: "En attente de paiement", className: "bg-amber-500/15 text-amber-200", icon: Clock3 },
  UNDER_REVIEW: { label: "En vérification", className: "bg-sky-500/15 text-sky-200", icon: RefreshCw },
  PAID: { label: "Payé — accès actif", className: "bg-emerald-500/15 text-emerald-200", icon: CheckCircle2 },
  REJECTED: { label: "Rejeté", className: "bg-red-500/15 text-red-200", icon: XCircle },
  EXPIRED: { label: "Expiré", className: "bg-slate-500/15 text-slate-300", icon: CalendarClock },
  CANCELLED: { label: "Annulé", className: "bg-slate-500/15 text-slate-300", icon: XCircle },
  REFUNDED: { label: "Remboursé", className: "bg-violet-500/15 text-violet-200", icon: RefreshCw },
};

export default function StudentCenterPaymentsView() {
  const [requests, setRequests] = useState<CenterPaymentRequestView[]>([]);
  const [selected, setSelected] = useState<CenterPaymentRequestView | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyReference, setBusyReference] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await api.getMyCenterPaymentRequests();
      setRequests(rows);
      setSelected((current) => rows.find((row) => row.reference === current?.reference) || current || rows[0] || null);
    } catch (loadError) {
      setError(getClientErrorMessage(loadError, "Impossible de charger vos demandes."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const cancel = async (request: CenterPaymentRequestView) => {
    if (!window.confirm(`Annuler la demande ${request.reference} ?`)) return;
    setBusyReference(request.reference);
    setError("");
    try {
      const updated = await api.cancelMyCenterPaymentRequest(request.reference);
      setRequests((rows) => rows.map((row) => (row.reference === updated.reference ? updated : row)));
      setSelected(updated);
    } catch (cancelError) {
      setError(getClientErrorMessage(cancelError, "Annulation impossible."));
    } finally {
      setBusyReference("");
    }
  };

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-8" aria-labelledby="center-payments-title">
      <header className="rounded-3xl border border-emerald-400/15 bg-gradient-to-br from-emerald-500/10 to-slate-950/40 p-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">Espace étudiant</p>
        <h1 id="center-payments-title" className="mt-2 text-2xl font-black text-white md:text-3xl">
          Mes demandes de paiement
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
          Suivez les paiements à effectuer au centre, leur validation et vos reçus. Une demande ne débloque jamais un
          module avant confirmation par l’administration.
        </p>
      </header>

      {error && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-200"
        >
          <AlertCircle className="h-4 w-4" /> {error}
        </p>
      )}

      {loading ? (
        <div className="rounded-2xl border border-white/10 p-8 text-center text-slate-400" role="status">
          Chargement de vos paiements…
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center">
          <Building2 className="mx-auto h-9 w-9 text-emerald-300" />
          <h2 className="mt-3 font-bold text-white">Aucune demande au centre</h2>
          <p className="mt-1 text-sm text-slate-400">Choisissez un module dans le catalogue pour créer une demande.</p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <div className="space-y-3">
            {requests.map((request) => {
              const status = STATUS[request.status];
              const Icon = status.icon;
              return (
                <button
                  key={request.reference}
                  type="button"
                  onClick={() => setSelected(request)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    selected?.reference === request.reference
                      ? "border-emerald-400/40 bg-emerald-500/10"
                      : "border-white/10 bg-white/[0.03] hover:border-white/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-white">{request.module.title}</p>
                      <p className="mt-1 font-mono text-xs text-slate-400">{request.reference}</p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold ${status.className}`}
                    >
                      <Icon className="h-3 w-3" /> {status.label}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-black text-emerald-200">
                    {request.amount.toFixed(2)} {request.currency}
                  </p>
                </button>
              );
            })}
          </div>

          {selected && (
            <section className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/35 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-lg font-black text-emerald-200">{selected.reference}</p>
                  <h2 className="mt-1 text-xl font-bold text-white">{selected.module.title}</h2>
                </div>
                <span className={`rounded-lg px-3 py-1.5 text-xs font-bold ${STATUS[selected.status].className}`}>
                  {STATUS[selected.status].label}
                </span>
              </div>

              <dl className="grid gap-3 rounded-xl bg-white/[0.03] p-4 text-sm sm:grid-cols-2">
                <Detail label="Montant" value={`${selected.amount.toFixed(2)} ${selected.currency}`} />
                {selected.promotion && (
                  <Detail
                    label={`Promotion ${selected.promotion.code}`}
                    value={`${selected.promotion.originalAmount.toFixed(2)} − ${selected.promotion.discountAmount.toFixed(2)} = ${selected.promotion.finalAmount.toFixed(2)} ${selected.promotion.currency}`}
                  />
                )}
                <Detail label="Créée le" value={new Date(selected.createdAt).toLocaleString("fr-MA")} />
                <Detail label="À payer avant" value={new Date(selected.expiresAt).toLocaleString("fr-MA")} />
                <Detail label="Durée d’accès" value={`${selected.accessDurationDays} jours après validation`} />
                {selected.accessEndsAt && (
                  <Detail
                    label="Accès valable jusqu’au"
                    value={new Date(selected.accessEndsAt).toLocaleDateString("fr-MA")}
                  />
                )}
              </dl>

              {selected.status === "PENDING_PAYMENT" && (
                <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                  <p className="font-bold">Présentez cette référence au centre lors du paiement.</p>
                  <p className="mt-1 text-amber-100/75">
                    Votre accès sera activé uniquement après validation administrative.
                  </p>
                </div>
              )}
              {selected.status === "UNDER_REVIEW" && (
                <p className="rounded-xl bg-sky-500/10 p-4 text-sm text-sky-100">
                  Votre paiement est en cours de vérification. Aucune action supplémentaire n’est nécessaire.
                </p>
              )}
              {selected.publicReason && (
                <p className="rounded-xl border border-white/10 p-4 text-sm text-slate-300">
                  <strong className="text-white">Motif :</strong> {selected.publicReason}
                </p>
              )}

              <div className="rounded-xl border border-white/10 p-4 text-sm text-slate-300">
                <p className="flex items-center gap-2 font-bold text-white">
                  <Building2 className="h-4 w-4 text-emerald-300" /> {selected.center.centerName}
                </p>
                <p className="mt-2">{selected.center.address}</p>
                <p>{selected.center.openingHours}</p>
                <p>
                  {selected.center.phone} · {selected.center.email}
                </p>
              </div>

              {selected.status === "PENDING_PAYMENT" && (
                <button
                  type="button"
                  disabled={busyReference === selected.reference}
                  onClick={() => void cancel(selected)}
                  className="rounded-xl border border-red-400/25 px-4 py-2.5 text-sm font-bold text-red-200 hover:bg-red-500/10 disabled:opacity-50"
                >
                  Annuler cette demande
                </button>
              )}
              {selected.receipt && <CenterPaymentReceipt receipt={selected.receipt} />}
            </section>
          )}
        </div>
      )}
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</dt>
      <dd className="mt-1 font-semibold text-slate-200">{value}</dd>
    </div>
  );
}
