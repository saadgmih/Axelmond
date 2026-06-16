import { useEffect, useState, useRef } from "react";
import { Camera, FileText, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { getFreshSessionToken } from "../api";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;


interface PdfLessonViewerProps {
  contentId: string;
  title: string;
  mediaType?: "PDF" | "IMAGE";
}

export default function PdfLessonViewer({ contentId, title, mediaType = "PDF" }: PdfLessonViewerProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(800);

  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.clientWidth);
    }
  }, [loading]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  function changePage(offset: number) {
    setPageNumber((prevPageNumber) => {
      const next = prevPageNumber + offset;
      if (next < 1) return 1;
      if (numPages && next > numPages) return numPages;
      return next;
    });
  }

  function zoom(delta: number) {
    setScale((prev) => Math.max(0.5, Math.min(3.0, prev + delta)));
  }

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    const loadDocument = async () => {
      setLoading(true);
      setError("");
      setBlobUrl(null);

      try {
        const token = await getFreshSessionToken();
        if (!token) {
          throw new Error("Session expirée. Reconnectez-vous.");
        }

        const response = await fetch(`/api/lesson-contents/${contentId}/document`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error("Impossible d'afficher ce contenu dans la plateforme.");
        }

        const blob = await response.blob();
        if (!blob.size) {
          throw new Error("Le fichier est vide ou inaccessible.");
        }

        objectUrl = URL.createObjectURL(blob);
        if (active) {
          setBlobUrl(objectUrl);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Impossible de charger le contenu.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadDocument();

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [contentId]);

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <p className="mt-3 text-sm font-medium text-slate-600">Chargement du contenu…</p>
        </div>
      </div>
    );
  }

  if (error || !blobUrl) {
    return (
      <div className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-5">
        <div className="flex items-start gap-3">
          {mediaType === "IMAGE" ? (
            <Camera className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          ) : (
            <FileText className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          )}
          <div>
            <p className="text-sm font-semibold text-amber-900">{title}</p>
            <p className="mt-1 text-sm text-amber-800">{error || "Aperçu indisponible."}</p>
          </div>
        </div>
      </div>
    );
  }

  if (mediaType === "IMAGE") {
    return (
      <div
        className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm select-none"
        onContextMenu={(event) => event.preventDefault()}
      >
        <img
          src={blobUrl}
          alt={title}
          draggable={false}
          className="mx-auto max-h-[70vh] w-full object-contain pointer-events-none"
        />
        {/* Invisible overlay to intercept clicks and drag attempts */}
        <div className="absolute inset-0 z-10" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[70vh] rounded-2xl border border-slate-200 bg-slate-100 shadow-sm overflow-hidden select-none">
      {/* PDF Controls */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => changePage(-1)}
              disabled={pageNumber <= 1}
              className="p-1.5 rounded-md hover:bg-white text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent"
              title="Page précédente"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="px-3 text-sm font-semibold font-mono text-slate-700">
              {pageNumber} / {numPages || "?"}
            </span>
            <button
              onClick={() => changePage(1)}
              disabled={!numPages || pageNumber >= numPages}
              className="p-1.5 rounded-md hover:bg-white text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent"
              title="Page suivante"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => zoom(-0.2)}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            title="Zoom arrière"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono font-bold text-slate-500 min-w-[3rem] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => zoom(0.2)}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            title="Zoom avant"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* PDF Canvas Area */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto bg-slate-200/50 p-4"
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="mx-auto w-fit relative shadow-lg ring-1 ring-slate-900/5 transition-transform duration-200">
          <Document
            file={blobUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="flex h-[50vh] w-full items-center justify-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
              </div>
            }
            error={
              <div className="flex h-[50vh] w-full items-center justify-center text-rose-500 text-sm font-semibold">
                Impossible de lire ce PDF.
              </div>
            }
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              width={containerWidth > 0 ? Math.min(containerWidth - 32, 1000) : undefined}
              className="bg-white"
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </Document>
          {/* Protection overlay */}
          <div className="absolute inset-0 z-10" />
        </div>
      </div>
    </div>
  );
}
