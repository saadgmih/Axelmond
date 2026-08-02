import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { Printer } from "lucide-react";
import type { CenterPaymentReceipt as Receipt } from "../center-payment-types";

const METHOD_LABELS: Record<Receipt["paymentMethod"], string> = {
  CASH: "Espèces",
  CARD_AT_CENTER: "Carte au centre",
  BANK_TRANSFER: "Virement bancaire",
  CHECK: "Chèque",
  OTHER: "Autre",
};

export default function CenterPaymentReceipt({ receipt }: { receipt: Receipt }) {
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = useCallback(() => {
    setIsPrinting(true);
    document.body.classList.add("printing-receipt");

    const cleanup = () => {
      document.body.classList.remove("printing-receipt");
      setIsPrinting(false);
      window.removeEventListener("afterprint", cleanup);
    };

    window.addEventListener("afterprint", cleanup);

    requestAnimationFrame(() => {
      window.print();
      setTimeout(cleanup, 1000);
    });
  }, []);

  return (
    <>
      <section className="center-payment-receipt rounded-2xl border border-emerald-400/20 bg-white p-5 text-slate-900 shadow-xl print:border-0 print:shadow-none">
        <ReceiptContent receipt={receipt} onPrint={handlePrint} />
      </section>

      {createPortal(
        <div className="center-payment-receipt-print-wrapper">
          <ReceiptContent receipt={receipt} isPrintMode />
        </div>,
        document.body,
      )}
    </>
  );
}

function ReceiptContent({
  receipt,
  onPrint,
  isPrintMode = false,
}: {
  receipt: Receipt;
  onPrint?: () => void;
  isPrintMode?: boolean;
}) {
  return (
    <div className="receipt-card-body rounded-2xl bg-white p-6 text-slate-900">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-800" style={{ color: "#065f46" }}>
            Reçu de paiement
          </p>
          <h3 className="mt-1 text-xl font-black text-slate-900" style={{ color: "#0f172a" }}>
            {receipt.centerName}
          </h3>
          <p className="mt-1 font-mono text-sm font-bold text-slate-700" style={{ color: "#334155" }}>
            {receipt.receiptNumber}
          </p>
        </div>
        <span
          className="rounded-lg border border-emerald-300 bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-900"
          style={{ backgroundColor: "#d1fae5", color: "#064e3b", borderColor: "#6ee7b7" }}
        >
          {receipt.status}
        </span>
      </div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <ReceiptLine label="Référence" value={receipt.requestReference} mono />
        <ReceiptLine label="Étudiant" value={receipt.studentName} />
        <ReceiptLine label="E-mail" value={receipt.studentEmail} />
        <ReceiptLine label="Module" value={receipt.moduleTitle} />
        <ReceiptLine label="Montant" value={`${receipt.amount.toFixed(2)} ${receipt.currency}`} />
        <ReceiptLine label="Moyen" value={METHOD_LABELS[receipt.paymentMethod]} />
        <ReceiptLine label="Validation" value={new Date(receipt.validatedAt).toLocaleString("fr-MA")} />
        <ReceiptLine label="Validé par" value={receipt.validatedBy} />
        <ReceiptLine label="Durée d’accès" value={`${receipt.accessDurationDays} jours`} />
        <ReceiptLine
          label="Fin d’accès"
          value={receipt.accessEndsAt ? new Date(receipt.accessEndsAt).toLocaleDateString("fr-MA") : "—"}
        />
      </dl>
      {!isPrintMode && onPrint && (
        <button
          type="button"
          onClick={onPrint}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 print:hidden"
        >
          <Printer className="h-4 w-4" />
          Imprimer le reçu
        </button>
      )}
    </div>
  );
}

function ReceiptLine({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-500" style={{ color: "#64748b" }}>
        {label}
      </dt>
      <dd className={`mt-0.5 font-bold text-slate-900 ${mono ? "font-mono" : ""}`} style={{ color: "#0f172a" }}>
        {value}
      </dd>
    </div>
  );
}
