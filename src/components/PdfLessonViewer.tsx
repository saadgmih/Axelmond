import { useEffect, useState, useRef } from "react";
import { Camera, FileText, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Expand, Maximize } from "lucide-react";
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

type FitMode = "width" | "page" | "custom";

export default function PdfLessonViewer({ contentId, title, mediaType = "PDF" }: PdfLessonViewerProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  
  const [scale, setScale] = useState(1.0);
  const [fitMode, setFitMode] = useState<FitMode>("page");
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [containerDimensions, setContainerDimensions] = useState({ width: 800, height: 600 });

  // Observe container size to dynamically adjust Fit Page / Fit Width
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        setContainerDimensions({
          width: entries[0].contentRect.width,
          height: entries[0].contentRect.height,
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [loading]);

  // Handle Fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      wrapperRef.current?.requestFullscreen().catch((err) => {
        console.error("Error attempting to enable fullscreen:", err);
      });
    } else {
      document.exitFullscreen();
    }
  }

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

  function handleZoomIn() {
    setFitMode("custom");
    setScale((prev) => Math.min(prev + 0.25, 4.0));
  }

  function handleZoomOut() {
    setFitMode("custom");
    setScale((prev) => Math.max(prev - 0.25, 0.5));
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
        if (!token) throw new Error("Session expirée. Reconnectez-vous.");

        const response = await fetch(`/api/lesson-contents/${contentId}/document`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error("Impossible d'afficher ce contenu dans la plateforme.");

        const blob = await response.blob();
        if (!blob.size) throw new Error("Le fichier est vide ou inaccessible.");

        objectUrl = URL.createObjectURL(blob);
        if (active) setBlobUrl(objectUrl);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Impossible de charger le contenu.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadDocument();

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
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
        <div className="absolute inset-0 z-10" />
      </div>
    );
  }

  // Calculate dynamic dimensions for react-pdf Page
  let renderWidth: number | undefined = undefined;
  let renderHeight: number | undefined = undefined;
  let renderScale = scale;

  if (fitMode === "width") {
    renderWidth = Math.max(containerDimensions.width - 32, 200); // 32px padding
    renderScale = 1.0;
  } else if (fitMode === "page") {
    renderHeight = Math.max(containerDimensions.height - 32, 200);
    renderScale = 1.0;
  }

  const zoomPercent = fitMode === "custom" 
    ? `${Math.round(scale * 100)}%` 
    : fitMode === "width" ? "Largeur" : "Page";

  return (
    <div 
      ref={wrapperRef}
      className={`flex flex-col rounded-2xl border border-slate-200 bg-slate-950 shadow-lg overflow-hidden select-none transition-all ${isFullscreen ? 'h-screen rounded-none border-none' : 'h-[75vh]'}`}
    >
      {/* Enterprise Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-slate-200 border-b border-slate-800 z-20 shadow-md">
        
        {/* Pagination Controls */}
        <div className="flex items-center gap-2 bg-slate-800/80 rounded-lg p-1 border border-slate-700/50">
          <button
            onClick={() => changePage(-1)}
            disabled={pageNumber <= 1}
            className="p-1.5 rounded-md hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
            title="Page précédente"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="px-2 text-sm font-semibold font-mono text-slate-200 min-w-[5rem] text-center">
            {pageNumber} <span className="text-slate-500 mx-0.5">/</span> {numPages || "?"}
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

        {/* Zoom & View Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-800/80 rounded-lg p-1 border border-slate-700/50">
            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded-md hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              title="Zoom arrière"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-mono font-bold text-slate-300 min-w-[4rem] text-center">
              {zoomPercent}
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded-md hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              title="Zoom avant"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          <div className="w-px h-6 bg-slate-700 mx-1"></div>

          <div className="flex items-center bg-slate-800/80 rounded-lg p-1 border border-slate-700/50">
            <button
              onClick={() => setFitMode("page")}
              className={`p-1.5 rounded-md transition-colors cursor-pointer text-xs font-semibold ${fitMode === "page" ? 'bg-indigo-600 text-white' : 'hover:bg-slate-700 text-slate-300'}`}
              title="Ajuster à la page"
            >
              <FileText className="w-4 h-4" />
            </button>
            <button
              onClick={() => setFitMode("width")}
              className={`p-1.5 rounded-md transition-colors cursor-pointer text-xs font-semibold ${fitMode === "width" ? 'bg-indigo-600 text-white' : 'hover:bg-slate-700 text-slate-300'}`}
              title="Ajuster à la largeur"
            >
              <Expand className="w-4 h-4" />
            </button>
          </div>

          <div className="w-px h-6 bg-slate-700 mx-1"></div>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700/50 text-slate-300 transition-colors cursor-pointer"
            title="Plein écran"
          >
            <Maximize className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-slate-700 mx-1"></div>

          <a
            href={blobUrl || "#"}
            download={title || "document.pdf"}
            className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/50 text-white transition-colors cursor-pointer flex items-center gap-2"
            title="Télécharger le document"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" x2="12" y1="15" y2="3"></line></svg>
            <span className="text-xs font-semibold hidden sm:inline">Télécharger</span>
          </a>
        </div>
      </div>

      {/* PDF Canvas Area with Scrollbars */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto bg-slate-900/95 flex flex-col items-center justify-start p-4"
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="relative shadow-2xl ring-1 ring-white/10 w-fit mx-auto transition-transform duration-200">
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
              scale={renderScale}
              width={renderWidth}
              height={renderHeight}
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
