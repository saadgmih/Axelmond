import { Download, FileText, X } from "lucide-react";
import PdfLessonViewer from "../PdfLessonViewer";
import type { LegalDocumentDefinition } from "../../data/legalDocuments";

interface LegalDocumentPdfPanelProps {
  document: LegalDocumentDefinition | null;
  onClose: () => void;
}

export default function LegalDocumentPdfPanel({ document, onClose }: LegalDocumentPdfPanelProps) {
  if (!document) return null;

  return (
    <div
      id="legal-document-viewer"
      className="mt-5 overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/80 shadow-2xl shadow-slate-950/35"
    >
      <div className="flex flex-col gap-4 border-b border-slate-800/80 bg-slate-900/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-teal-500/30 bg-teal-500/15">
            <FileText className="h-5 w-5 text-teal-200" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-base font-black text-white sm:text-lg">{document.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">{document.description}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <a
            href={document.url}
            download={document.fileName}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-4 text-xs font-black text-slate-100 transition-colors hover:border-teal-500/50 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
          >
            <Download className="h-4 w-4" />
            Télécharger
          </a>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 text-slate-300 transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            aria-label="Fermer le document"
            title="Fermer le document"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="p-3 sm:p-4">
        <PdfLessonViewer
          title={document.title}
          documentUrl={document.url}
          downloadFileName={document.fileName}
          allowDownload
        />
      </div>
    </div>
  );
}
