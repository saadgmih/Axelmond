import { useEffect, useState, useRef } from "react";
import { Camera, FileText, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { getFreshSessionToken } from "../api";
import { Document, Page, pdfjs } from "react-pdf";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
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
      {/* Enterprise Grade Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 bg-slate-900 text-slate-200 border-b border-slate-800 z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-slate-800 rounded-lg p-1 shadow-inner border border-slate-700/50">
            <button
              onClick={() => changePage(-1)}
              disabled={pageNumber <= 1}
              className="p-1.5 rounded-md hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
              title="Page précédente"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="px-4 text-sm font-semibold font-mono text-slate-100 min-w-[5rem] text-center">
              {pageNumber} <span className="text-slate-500 mx-1">/</span> {numPages || "?"}
            </span>
            <button
              onClick={() => changePage(1)}
              disabled={!numPages || pageNumber >= numPages}
              className="p-1.5 rounded-md hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
              title="Page suivante"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* PDF Canvas Area */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-hidden bg-slate-100 flex flex-col relative"
        onContextMenu={(e) => e.preventDefault()}
      >
        <TransformWrapper
          initialScale={1}
          minScale={0.5}
          maxScale={4}
          centerOnInit={true}
          wheel={{ step: 0.1 }}
          pinch={{ step: 5 }}
        >
          {({ zoomIn, zoomOut, resetTransform, scale }) => (
            <>
              {/* Floating Zoom Controls - Enterprise Style */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/50 shadow-2xl">
                <button
                  onClick={() => zoomOut()}
                  className="p-2.5 rounded-lg hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                  title="Zoom arrière"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <div 
                  className="px-3 text-xs font-mono font-bold text-slate-300 min-w-[4rem] text-center cursor-pointer hover:text-white transition-colors"
                  onClick={() => resetTransform()}
                  title="Réinitialiser le zoom"
                >
                  {Math.round(scale * 100)}%
                </div>
                <button
                  onClick={() => zoomIn()}
                  className="p-2.5 rounded-lg hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                  title="Zoom avant"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>

              <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }} contentStyle={{ width: "100%", height: "100%", justifyContent: "center", alignItems: "flex-start", paddingTop: "2rem", paddingBottom: "5rem" }}>
                <div className="relative shadow-2xl ring-1 ring-slate-900/5 w-fit mx-auto transition-transform duration-200">
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
              scale={1.0}
              width={containerWidth > 0 ? Math.min(containerWidth - 32, 1000) : undefined}
              className="bg-white"
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </Document>
          {/* Protection overlay */}
          <div className="absolute inset-0 z-10" />
                </div>
              </TransformComponent>
            </>
          )}
        </TransformWrapper>
      </div>
    </div>
  );
}
