import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock3,
  CreditCard,
  Download,
  FileText,
  Filter,
  Globe,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";
import { api } from "../../api";
import { getClientErrorMessage } from "../../client-errors";
import type { CenterPaymentRequestView, CenterPaymentStatus } from "../../center-payment-types";
import type { Invoice } from "../../types";
import CenterPaymentReceipt from "../../components/CenterPaymentReceipt";
import { formatMad } from "../../utils/morocco-locale";
import { formatInvoiceReference } from "../../utils/user-facing-labels";

export interface StudentCenterPaymentsViewProps {
  invoices?: Invoice[];
}

const CENTER_STATUS: Record<CenterPaymentStatus, { label: string; className: string; icon: typeof Clock3 }> = {
  PENDING_PAYMENT: { label: "En attente de paiement", className: "bg-amber-500/15 text-amber-200 border-amber-500/30", icon: Clock3 },
  UNDER_REVIEW: { label: "En vérification", className: "bg-sky-500/15 text-sky-200 border-sky-500/30", icon: RefreshCw },
  PAID: { label: "Payé — accès actif", className: "bg-emerald-500/15 text-emerald-200 border-emerald-500/30", icon: CheckCircle2 },
  REJECTED: { label: "Rejeté", className: "bg-red-500/15 text-red-200 border-red-500/30", icon: XCircle },
  EXPIRED: { label: "Expiré", className: "bg-slate-500/15 text-slate-300 border-slate-500/30", icon: CalendarClock },
  CANCELLED: { label: "Annulé", className: "bg-slate-500/15 text-slate-300 border-slate-500/30", icon: XCircle },
  REFUNDED: { label: "Remboursé", className: "bg-violet-500/15 text-violet-200 border-violet-500/30", icon: RefreshCw },
};

type PaymentTab = "all" | "center" | "online";

interface UnifiedTransactionItem {
  id: string;
  source: "center" | "online";
  reference: string;
  title: string;
  date: string;
  timestamp: number;
  amount: number;
  currency: string;
  status: string;
  statusBadgeClass: string;
  centerRequest?: CenterPaymentRequestView;
  invoice?: Invoice;
}

export default function StudentCenterPaymentsView({ invoices = [] }: StudentCenterPaymentsViewProps) {
  const [requests, setRequests] = useState<CenterPaymentRequestView[]>([]);
  const [selectedCenterRequest, setSelectedCenterRequest] = useState<CenterPaymentRequestView | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [activeTab, setActiveTab] = useState<PaymentTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyReference, setBusyReference] = useState("");
  const [error, setError] = useState("");

  const isInitialLoadRef = useRef(true);
  const detailSectionRef = useRef<HTMLElement | null>(null);

  const loadCenterRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await api.getMyCenterPaymentRequests();
      setRequests(rows);
      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
        setSelectedCenterRequest(rows[0] || null);
      } else {
        setSelectedCenterRequest((current) => (current ? rows.find((row) => row.reference === current.reference) || null : null));
      }
    } catch (loadError) {
      setError(getClientErrorMessage(loadError, "Impossible de charger vos demandes au centre."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCenterRequests();
  }, [loadCenterRequests]);

  const handleSelectCenterRequest = useCallback(
    async (request: CenterPaymentRequestView) => {
      if (selectedCenterRequest?.reference === request.reference) {
        setSelectedCenterRequest(null);
        return;
      }

      setSelectedCenterRequest(request);
      setError("");

      if (typeof window !== "undefined" && window.innerWidth < 1024) {
        detailSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      try {
        const detail = await api.getMyCenterPaymentRequest(request.reference);
        setSelectedCenterRequest(detail);
        setRequests((current) => current.map((item) => (item.reference === request.reference ? detail : item)));
      } catch {
        // Garder la demande résumée si l'appel détaillé échoue
      }
    },
    [selectedCenterRequest?.reference],
  );

  const cancelCenterRequest = async (request: CenterPaymentRequestView) => {
    if (!window.confirm(`Annuler la demande ${request.reference} ?`)) return;
    setBusyReference(request.reference);
    setError("");
    try {
      const updated = await api.cancelMyCenterPaymentRequest(request.reference);
      setRequests((rows) => rows.map((row) => (row.reference === updated.reference ? updated : row)));
      setSelectedCenterRequest(updated);
    } catch (cancelError) {
      setError(getClientErrorMessage(cancelError, "Annulation impossible."));
    } finally {
      setBusyReference("");
    }
  };

  // Liste unifiée des transactions (Online + Center)
  const unifiedTransactions = useMemo<UnifiedTransactionItem[]>(() => {
    const list: UnifiedTransactionItem[] = [];

    // Inscriptions en ligne
    invoices.forEach((inv) => {
      list.push({
        id: `online-${inv.id}`,
        source: "online",
        reference: formatInvoiceReference(inv.id),
        title: inv.courseTitle,
        date: inv.date,
        timestamp: new Date(inv.date).getTime() || 0,
        amount: inv.amount,
        currency: "MAD",
        status: inv.status,
        statusBadgeClass: "bg-emerald-500/15 text-emerald-200 border-emerald-500/30",
        invoice: inv,
      });
    });

    // Demandes au centre
    requests.forEach((req) => {
      const statusInfo = CENTER_STATUS[req.status];
      list.push({
        id: `center-${req.reference}`,
        source: "center",
        reference: req.reference,
        title: req.module.title,
        date: new Date(req.createdAt).toLocaleDateString("fr-MA"),
        timestamp: new Date(req.createdAt).getTime() || 0,
        amount: req.amount,
        currency: req.currency,
        status: statusInfo.label,
        statusBadgeClass: statusInfo.className,
        centerRequest: req,
      });
    });

    // Trier par date décroissante
    return list.sort((a, b) => b.timestamp - a.timestamp);
  }, [invoices, requests]);

  // Filtrage par terme de recherche
  const filteredTransactions = useMemo(() => {
    let items = unifiedTransactions;
    if (activeTab === "center") items = items.filter((item) => item.source === "center");
    if (activeTab === "online") items = items.filter((item) => item.source === "online");

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter(
        (item) =>
          item.reference.toLowerCase().includes(q) ||
          item.title.toLowerCase().includes(q) ||
          item.status.toLowerCase().includes(q),
      );
    }
    return items;
  }, [unifiedTransactions, activeTab, searchQuery]);

  // Statistiques globales
  const stats = useMemo(() => {
    const onlineTotal = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const centerPaidTotal = requests
      .filter((r) => r.status === "PAID")
      .reduce((sum, r) => sum + r.amount, 0);

    const pendingCenterCount = requests.filter(
      (r) => r.status === "PENDING_PAYMENT" || r.status === "UNDER_REVIEW",
    ).length;

    return {
      totalInvested: onlineTotal + centerPaidTotal,
      onlineCount: invoices.length,
      centerCount: requests.length,
      pendingCenterCount,
    };
  }, [invoices, requests]);

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-8" aria-labelledby="payments-dashboard-title">
      {/* En-tête Hero */}
      <header className="relative overflow-hidden rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-[#06241d] via-[#08352b] to-[#041914] p-6 md:p-8 text-white shadow-xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-200">
              <CreditCard className="h-3 w-3" />
              Espace Étudiant
            </span>
            <h1 id="payments-dashboard-title" className="mt-3 text-2xl font-black tracking-tight text-white md:text-3xl">
              Paiements & Mes demandes de paiement
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-emerald-200/90">
              Consultez l’historique unifié de vos transactions, vos reçus d’inscriptions en ligne (PayPal) et le suivi
              de vos paiements au centre.
            </p>
          </div>
        </div>
      </header>

      {/* Statistiques clés */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total investi</p>
            <div className="rounded-xl bg-emerald-500/15 p-2 text-emerald-300">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black font-mono text-emerald-300">{formatMad(stats.totalInvested)}</p>
          <p className="mt-1 text-xs text-slate-400">Toutes inscriptions confondues</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Demandes au centre</p>
            <div className="rounded-xl bg-teal-500/15 p-2 text-teal-300">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-white">{stats.centerCount}</p>
          <p className="mt-1 text-xs text-slate-400">
            {stats.pendingCenterCount > 0 ? (
              <span className="text-amber-300 font-semibold">{stats.pendingCenterCount} en attente/vérification</span>
            ) : (
              "Toutes traitées"
            )}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Inscriptions en ligne</p>
            <div className="rounded-xl bg-sky-500/15 p-2 text-sky-300">
              <Globe className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-white">{stats.onlineCount}</p>
          <p className="mt-1 text-xs text-slate-400">Factures & reçus PayPal</p>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-red-500/25 bg-red-500/10 p-3.5 text-sm text-red-200"
        >
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </p>
      )}

      {/* Navigation par Onglets */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/80 p-1.5">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`rounded-xl px-4 py-2 text-xs font-black transition ${
              activeTab === "all"
                ? "bg-emerald-500 text-white shadow-md shadow-emerald-950/40"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            Toutes les transactions ({unifiedTransactions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("center")}
            className={`rounded-xl px-4 py-2 text-xs font-black transition ${
              activeTab === "center"
                ? "bg-emerald-500 text-white shadow-md shadow-emerald-950/40"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            Paiements au centre ({requests.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("online")}
            className={`rounded-xl px-4 py-2 text-xs font-black transition ${
              activeTab === "online"
                ? "bg-emerald-500 text-white shadow-md shadow-emerald-950/40"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            Paiements en ligne ({invoices.length})
          </button>
        </div>

        {/* Barre de recherche */}
        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par référence, module…"
            className="w-full rounded-xl border border-white/10 bg-slate-900/80 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-400/50 focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/10 p-12 text-center text-slate-400" role="status">
          <RefreshCw className="mx-auto h-6 w-6 animate-spin text-emerald-400" />
          <p className="mt-3 text-sm font-semibold">Chargement de vos paiements…</p>
        </div>
      ) : activeTab === "center" ? (
        /* VUE DÉTAILLÉE DU PAIEMENT AU CENTRE */
        requests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 p-12 text-center">
            <Building2 className="mx-auto h-10 w-10 text-emerald-300" />
            <h2 className="mt-3 text-base font-bold text-white">Aucune demande au centre</h2>
            <p className="mt-1 text-xs text-slate-400">Choisissez un module dans le catalogue pour créer une demande d’inscription sur place.</p>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <div className="space-y-3">
              {requests.map((request) => {
                const status = CENTER_STATUS[request.status];
                const Icon = status.icon;
                return (
                  <button
                    key={request.reference}
                    type="button"
                    onClick={() => void handleSelectCenterRequest(request)}
                    aria-selected={selectedCenterRequest?.reference === request.reference}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      selectedCenterRequest?.reference === request.reference
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
                        className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-bold ${status.className}`}
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

            {selectedCenterRequest && (
              <section ref={detailSectionRef} className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/35 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-lg font-black text-emerald-200">{selectedCenterRequest.reference}</p>
                    <h2 className="mt-1 text-xl font-bold text-white">{selectedCenterRequest.module.title}</h2>
                  </div>
                  <span className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${CENTER_STATUS[selectedCenterRequest.status].className}`}>
                    {CENTER_STATUS[selectedCenterRequest.status].label}
                  </span>
                </div>

                <dl className="grid gap-3 rounded-xl bg-white/[0.03] p-4 text-sm sm:grid-cols-2">
                  <Detail label="Montant" value={`${selectedCenterRequest.amount.toFixed(2)} ${selectedCenterRequest.currency}`} />
                  {selectedCenterRequest.promotion && (
                    <Detail
                      label={`Promotion ${selectedCenterRequest.promotion.code}`}
                      value={`${selectedCenterRequest.promotion.originalAmount.toFixed(2)} − ${selectedCenterRequest.promotion.discountAmount.toFixed(2)} = ${selectedCenterRequest.promotion.finalAmount.toFixed(2)} ${selectedCenterRequest.promotion.currency}`}
                    />
                  )}
                  <Detail label="Créée le" value={new Date(selectedCenterRequest.createdAt).toLocaleString("fr-MA")} />
                  <Detail label="À payer avant" value={new Date(selectedCenterRequest.expiresAt).toLocaleString("fr-MA")} />
                  <Detail label="Durée d’accès" value={`${selectedCenterRequest.accessDurationDays} jours après validation`} />
                  {selectedCenterRequest.accessEndsAt && (
                    <Detail
                      label="Accès valable jusqu’au"
                      value={new Date(selectedCenterRequest.accessEndsAt).toLocaleDateString("fr-MA")}
                    />
                  )}
                </dl>

                {selectedCenterRequest.status === "PENDING_PAYMENT" && (
                  <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                    <p className="font-bold">Présentez cette référence au centre lors du paiement.</p>
                    <p className="mt-1 text-amber-100/75">
                      Votre accès sera activé uniquement après validation administrative.
                    </p>
                  </div>
                )}
                {selectedCenterRequest.status === "UNDER_REVIEW" && (
                  <p className="rounded-xl bg-sky-500/10 p-4 text-sm text-sky-100">
                    Votre paiement est en cours de vérification. Aucune action supplémentaire n’est nécessaire.
                  </p>
                )}
                {selectedCenterRequest.publicReason && (
                  <p className="rounded-xl border border-white/10 p-4 text-sm text-slate-300">
                    <strong className="text-white">Motif :</strong> {selectedCenterRequest.publicReason}
                  </p>
                )}

                <div className="rounded-xl border border-white/10 p-4 text-sm text-slate-300">
                  <p className="flex items-center gap-2 font-bold text-white">
                    <Building2 className="h-4 w-4 text-emerald-300" /> {selectedCenterRequest.center.centerName}
                  </p>
                  <p className="mt-2">{selectedCenterRequest.center.address}</p>
                  <p>{selectedCenterRequest.center.openingHours}</p>
                  <p>
                    {selectedCenterRequest.center.phone} · {selectedCenterRequest.center.email}
                  </p>
                </div>

                {selectedCenterRequest.status === "PENDING_PAYMENT" && (
                  <button
                    type="button"
                    disabled={busyReference === selectedCenterRequest.reference}
                    onClick={() => void cancelCenterRequest(selectedCenterRequest)}
                    className="rounded-xl border border-red-400/25 px-4 py-2.5 text-sm font-bold text-red-200 hover:bg-red-500/10 disabled:opacity-50"
                  >
                    Annuler cette demande
                  </button>
                )}
                {selectedCenterRequest.receipt && <CenterPaymentReceipt receipt={selectedCenterRequest.receipt} />}
              </section>
            )}
          </div>
        )
      ) : activeTab === "online" ? (
        /* VUE DES FACTURES EN LIGNE (PAYPAL / CB) */
        invoices.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 p-12 text-center">
            <Globe className="mx-auto h-10 w-10 text-emerald-300" />
            <h2 className="mt-3 text-base font-bold text-white">Aucune facture en ligne</h2>
            <p className="mt-1 text-xs text-slate-400">Vos inscriptions effectuées directement sur le site apparaîtront ici.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-4">Référence</th>
                    <th className="px-4 py-4">Date</th>
                    <th className="px-4 py-4">Module</th>
                    <th className="px-4 py-4 text-right">Montant</th>
                    <th className="px-6 py-4 text-center">Statut</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="transition hover:bg-white/[0.02]">
                      <td className="px-6 py-4 font-mono font-bold text-emerald-300">{formatInvoiceReference(inv.id)}</td>
                      <td className="px-4 py-4">{inv.date}</td>
                      <td className="px-4 py-4 font-bold text-white">{inv.courseTitle}</td>
                      <td className="px-4 py-4 text-right font-mono font-black text-emerald-300">
                        {formatMad(inv.amount)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold text-emerald-200">
                          <CheckCircle2 className="h-3 w-3" /> {inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedInvoice(inv)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-200 transition hover:bg-emerald-500/20"
                        >
                          <FileText className="h-3.5 w-3.5" /> Voir le reçu
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        /* VUE TOUTES LES TRANSACTIONS UNIFIÉES */
        filteredTransactions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 p-12 text-center">
            <CreditCard className="mx-auto h-10 w-10 text-slate-500" />
            <h2 className="mt-3 text-base font-bold text-white">Aucune transaction trouvée</h2>
            <p className="mt-1 text-xs text-slate-400">Aucun paiement ou demande ne correspond à votre recherche.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTransactions.map((tx) => (
              <div
                key={tx.id}
                className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4 transition hover:border-white/20 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`mt-1 rounded-xl p-2.5 ${
                      tx.source === "center" ? "bg-teal-500/15 text-teal-300" : "bg-sky-500/15 text-sky-300"
                    }`}
                  >
                    {tx.source === "center" ? <Building2 className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-black text-emerald-300">{tx.reference}</span>
                      <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-bold text-slate-300">
                        {tx.source === "center" ? "Paiement au centre" : "Paiement en ligne (PayPal)"}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm font-bold text-white">{tx.title}</p>
                    <p className="text-[11px] text-slate-400">{tx.date}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 border-t border-white/5 pt-3 sm:border-none sm:pt-0 sm:justify-end">
                  <div className="text-left sm:text-right">
                    <p className="font-mono text-sm font-black text-emerald-200">
                      {tx.amount.toFixed(2)} {tx.currency}
                    </p>
                    <span className={`inline-block rounded-md border px-2 py-0.5 text-[9px] font-bold mt-1 ${tx.statusBadgeClass}`}>
                      {tx.status}
                    </span>
                  </div>

                  {tx.source === "center" && tx.centerRequest ? (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("center");
                        void handleSelectCenterRequest(tx.centerRequest!);
                      }}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-200 transition hover:bg-white/10"
                    >
                      Détails
                    </button>
                  ) : tx.invoice ? (
                    <button
                      type="button"
                      onClick={() => setSelectedInvoice(tx.invoice!)}
                      className="inline-flex items-center gap-1 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-200 transition hover:bg-emerald-500/20"
                    >
                      <FileText className="h-3.5 w-3.5" /> Reçu
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* MODAL DE REÇU D'INSCRIPTION EN LIGNE */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/15 bg-slate-900 p-6 text-white shadow-2xl">
            <button
              type="button"
              onClick={() => setSelectedInvoice(null)}
              className="absolute right-4 top-4 rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="text-center border-b border-white/10 pb-5">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-300">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-lg font-black text-white">Reçu de paiement officiel</h3>
              <p className="text-xs text-slate-400">Performance Académique · Inscription en ligne</p>
            </div>

            <div className="mt-5 space-y-4 text-xs">
              <div className="flex items-center justify-between rounded-xl bg-white/[0.03] p-3.5">
                <span className="text-slate-400 font-semibold">Référence transaction</span>
                <span className="font-mono font-bold text-emerald-300">{formatInvoiceReference(selectedInvoice.id)}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white/[0.03] p-3.5">
                <span className="text-slate-400 font-semibold">Date de paiement</span>
                <span className="font-bold text-white">{selectedInvoice.date}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white/[0.03] p-3.5">
                <span className="text-slate-400 font-semibold">Module débloqué</span>
                <span className="font-bold text-white text-right max-w-[200px] truncate">{selectedInvoice.courseTitle}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white/[0.03] p-3.5">
                <span className="text-slate-400 font-semibold">Méthode de paiement</span>
                <span className="font-bold text-sky-300 flex items-center gap-1">
                  <Globe className="h-3.5 w-3.5" /> En ligne (PayPal / CB)
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4">
                <span className="text-sm font-bold text-emerald-200">Montant réglé</span>
                <span className="font-mono text-lg font-black text-emerald-300">{formatMad(selectedInvoice.amount)}</span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-500"
              >
                <Printer className="h-4 w-4" /> Imprimer le reçu
              </button>
            </div>
          </div>
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
