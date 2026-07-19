import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  Fullscreen,
  Maximize2,
  Minimize2,
  MoveHorizontal,
  RefreshCw,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { loadProtectedResource, ProtectedResourceError } from "../protected-resource";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Bundle the PDF.js worker with the application using standard relative path
// so Vite compiles it correctly as a separate asset.
pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

interface PdfLessonViewerProps {
  contentId?: string;
  title: string;
  mediaType?: "PDF" | "IMAGE";
  documentUrl?: string;
  downloadFileName?: string;
  allowDownload?: boolean;
}

type ImageViewMode = "width" | "screen" | "actual";
type ViewerState =
  | "WAITING_FOR_SESSION"
  | "LOADING_URL"
  | "LOADING_DOCUMENT"
  | "RETRYING_DOCUMENT"
  | "VALIDATING_DOCUMENT"
  | "READY"
  | "TEMPORARY_ERROR"
  | "ERROR";

const PDF_PARSE_MAX_AUTOMATIC_RETRIES = 2;
const PDF_PARSE_RETRY_BASE_DELAY_MS = 600;

const viewerToolbarClass =
  "sticky top-0 z-30 flex min-h-[68px] flex-wrap items-center justify-between gap-3 border-b border-[#202838] bg-[#0b1019] px-3 py-2.5 text-slate-200 shadow-[0_12px_32px_rgba(2,6,23,0.28)] sm:min-h-[80px] sm:flex-nowrap sm:gap-4 sm:px-4 sm:py-3";
const toolbarPillClass =
  "flex h-11 shrink-0 items-center rounded-[16px] border border-[#222c3d] bg-[#121827] px-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.025),0_8px_24px_rgba(2,6,23,0.2)] sm:h-14 sm:rounded-[18px]";
const toolbarButtonClass =
  "touch-target inline-flex h-11 min-h-11 w-11 min-w-11 shrink-0 items-center justify-center rounded-[13px] border border-[#222c3d] bg-[#121827] text-[#8175ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.025),0_8px_22px_rgba(2,6,23,0.2)] transition-colors hover:border-teal-500/50 hover:bg-[#171e2e] hover:text-teal-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/80 disabled:cursor-not-allowed disabled:opacity-30 sm:h-12 sm:min-h-12 sm:w-12 sm:min-w-12 sm:rounded-[14px]";
const toolbarPillButtonClass =
  "touch-target inline-flex h-10 min-h-10 w-10 min-w-10 items-center justify-center rounded-xl text-[#8175ff] transition-colors hover:bg-white/[0.04] hover:text-teal-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/80 disabled:cursor-not-allowed disabled:opacity-25 sm:h-12 sm:min-h-12 sm:w-12 sm:min-w-12";
const toolbarDividerClass = "h-7 w-px shrink-0 bg-[#273043] sm:h-10";

function imageModeButtonClass(active: boolean) {
  return `${toolbarButtonClass} ${active ? "border-teal-500/50 bg-teal-500/10 text-teal-300" : ""}`;
}

export default function PdfLessonViewer({
  contentId,
  title,
  mediaType = "PDF",
  documentUrl,
  downloadFileName,
  allowDownload = false,
}: PdfLessonViewerProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [viewerState, setViewerState] = useState<ViewerState>("WAITING_FOR_SESSION");
  const [retryKey, setRetryKey] = useState(0);

  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);

  const [scale, setScale] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPseudoFullscreen, setIsPseudoFullscreen] = useState(false);
  const [imageViewMode, setImageViewMode] = useState<ImageViewMode>("width");
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 0, height: 0 });
  const [isImagePanning, setIsImagePanning] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageStageRef = useRef<HTMLDivElement>(null);
  const parseRetryCountRef = useRef(0);
  const parseRetryTimeoutRef = useRef<number | null>(null);
  const imageDragRef = useRef({
    active: false,
    pointerId: 0,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });

  const [containerDimensions, setContainerDimensions] = useState({ width: 800, height: 600 });

  const mediaViewportWidth = Math.max(containerDimensions.width - 32, 280);
  const mediaViewportHeight = Math.max(containerDimensions.height - 32, 240);
  const imageWidthRatio = imageNaturalSize.width > 0 ? mediaViewportWidth / imageNaturalSize.width : 1;
  const imageScreenRatio =
    imageNaturalSize.width > 0 && imageNaturalSize.height > 0
      ? Math.min(mediaViewportWidth / imageNaturalSize.width, mediaViewportHeight / imageNaturalSize.height)
      : 1;
  const imageBaseScale =
    imageViewMode === "screen" ? imageScreenRatio : imageViewMode === "actual" ? 1 : imageWidthRatio;
  const imageActiveScale = Math.max(0.05, imageBaseScale * scale);
  const imageRenderWidth = imageNaturalSize.width > 0 ? Math.round(imageNaturalSize.width * imageActiveScale) : 0;
  const imageRenderHeight = imageNaturalSize.height > 0 ? Math.round(imageNaturalSize.height * imageActiveScale) : 0;
  const imageCanPan = imageRenderWidth > mediaViewportWidth || imageRenderHeight > mediaViewportHeight;

  // Observe container size to keep PDF pages fitted to the reading width.
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
  }, [viewerState, blobUrl, mediaType]);

  // Handle Fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = !!document.fullscreenElement;
      setIsFullscreen(active);
      if (!active) setIsPseudoFullscreen(false);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (!isPseudoFullscreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isPseudoFullscreen]);

  const isExpandedView = isFullscreen || isPseudoFullscreen;

  function exitExpandedView() {
    setIsPseudoFullscreen(false);
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    }
  }

  function toggleFullscreen() {
    if (isExpandedView) {
      exitExpandedView();
      return;
    }

    wrapperRef.current?.requestFullscreen().catch(() => {
      setIsPseudoFullscreen(true);
    });
  }

  const clearParseRetryTimeout = useCallback(() => {
    if (parseRetryTimeoutRef.current !== null) {
      window.clearTimeout(parseRetryTimeoutRef.current);
      parseRetryTimeoutRef.current = null;
    }
  }, []);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    if (!Number.isInteger(numPages) || numPages < 1) {
      setError("Le document reçu ne contient aucune page lisible.");
      setViewerState("ERROR");
      return;
    }
    setNumPages(numPages);
    setPageNumber(1);
    setScale(1.0);
    clearParseRetryTimeout();
    parseRetryCountRef.current = 0;
    setViewerState("READY");
  }

  function handleDocumentLoadError() {
    clearParseRetryTimeout();
    if (parseRetryCountRef.current < PDF_PARSE_MAX_AUTOMATIC_RETRIES) {
      const attempt = parseRetryCountRef.current;
      parseRetryCountRef.current += 1;
      setError("");
      setViewerState("RETRYING_DOCUMENT");
      parseRetryTimeoutRef.current = window.setTimeout(
        () => setRetryKey((current) => current + 1),
        PDF_PARSE_RETRY_BASE_DELAY_MS * 2 ** attempt,
      );
      return;
    }
    setError("Le document reçu n’a pas pu être interprété. Veuillez réessayer.");
    setViewerState("ERROR");
  }

  function retryDocumentLoad() {
    clearParseRetryTimeout();
    parseRetryCountRef.current = 0;
    setRetryKey((current) => current + 1);
  }

  useEffect(() => {
    parseRetryCountRef.current = 0;
    clearParseRetryTimeout();
    return clearParseRetryTimeout;
  }, [clearParseRetryTimeout, contentId, documentUrl, mediaType]);

  function changePage(offset: number) {
    setPageNumber((prevPageNumber) => {
      const next = prevPageNumber + offset;
      if (next < 1) return 1;
      if (numPages && next > numPages) return numPages;
      return next;
    });
  }

  function handleZoomIn() {
    setScale((prev) => Math.min(prev + 0.25, mediaType === "IMAGE" ? 6.0 : 4.0));
  }

  function handleZoomOut() {
    setScale((prev) => Math.max(prev - 0.25, mediaType === "IMAGE" ? 0.25 : 0.5));
  }

  function centerImageStage() {
    window.requestAnimationFrame(() => {
      const stage = imageStageRef.current;
      if (!stage) return;
      stage.scrollLeft = Math.max(0, (stage.scrollWidth - stage.clientWidth) / 2);
      stage.scrollTop = Math.max(0, (stage.scrollHeight - stage.clientHeight) / 2);
    });
  }

  function handleImageFitWidth() {
    setImageViewMode("width");
    setScale(1.0);
    centerImageStage();
  }

  function handleImageFitScreen() {
    setImageViewMode("screen");
    setScale(1.0);
    centerImageStage();
  }

  function handleImageResetZoom() {
    setImageViewMode("actual");
    setScale(1.0);
    centerImageStage();
  }

  function handleImagePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!imageCanPan || event.button !== 0) return;
    const stage = event.currentTarget;
    imageDragRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: stage.scrollLeft,
      scrollTop: stage.scrollTop,
    };
    stage.setPointerCapture(event.pointerId);
    setIsImagePanning(true);
  }

  function handleImagePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = imageDragRef.current;
    const stage = imageStageRef.current;
    if (!drag.active || !stage) return;
    event.preventDefault();
    stage.scrollLeft = drag.scrollLeft - (event.clientX - drag.startX);
    stage.scrollTop = drag.scrollTop - (event.clientY - drag.startY);
  }

  function stopImagePan(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = imageDragRef.current;
    if (!drag.active) return;
    if (event.currentTarget.hasPointerCapture(drag.pointerId)) {
      event.currentTarget.releasePointerCapture(drag.pointerId);
    }
    imageDragRef.current.active = false;
    setIsImagePanning(false);
  }

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    const controller = new AbortController();

    const loadDocument = async () => {
      setViewerState(documentUrl ? "LOADING_URL" : "WAITING_FOR_SESSION");
      setError("");
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
      setBlobUrl(null);
      setNumPages(null);
      setPageNumber(1);
      setScale(1.0);
      setImageViewMode("width");
      setImageNaturalSize({ width: 0, height: 0 });
      imageDragRef.current.active = false;
      setIsImagePanning(false);

      try {
        if (!documentUrl && !contentId) {
          throw new ProtectedResourceError("Document introuvable.", "permanent");
        }
        const blob = await loadProtectedResource({
          url: documentUrl || `/api/lesson-contents/${contentId}/document`,
          kind: mediaType,
          requiresSession: !documentUrl,
          maxRetries: 2,
          timeoutMs: 30_000,
          signal: controller.signal,
          onPhase: (phase) => {
            if (!active) return;
            if (phase === "WAITING_FOR_SESSION") {
              setViewerState("WAITING_FOR_SESSION");
            } else {
              setViewerState("LOADING_DOCUMENT");
            }
          },
        });

        objectUrl = URL.createObjectURL(blob);
        if (active) {
          setBlobUrl(objectUrl);
          setViewerState(mediaType === "IMAGE" ? "READY" : "VALIDATING_DOCUMENT");
        }
      } catch (err) {
        if (!active || (err instanceof ProtectedResourceError && err.kind === "cancelled")) return;
        setError(err instanceof Error ? err.message : "Impossible de charger le contenu.");
        setViewerState("ERROR");
      }
    };

    void loadDocument();

    return () => {
      active = false;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [contentId, documentUrl, mediaType, retryKey]);

  useEffect(() => {
    if (mediaType !== "IMAGE" || !imageRenderWidth || !imageRenderHeight) return;
    centerImageStage();
  }, [mediaType, imageRenderWidth, imageRenderHeight, isExpandedView]);

  if (
    viewerState === "RETRYING_DOCUMENT" ||
    (!blobUrl && ["WAITING_FOR_SESSION", "LOADING_URL", "LOADING_DOCUMENT"].includes(viewerState))
  ) {
    return (
      <div className="flex h-[70vh] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <p className="mt-3 text-sm font-medium text-slate-600">
            {viewerState === "WAITING_FOR_SESSION" && "Restauration de votre session…"}
            {viewerState === "LOADING_URL" && "Récupération du lien du document…"}
            {viewerState === "LOADING_DOCUMENT" && "Téléchargement du document…"}
            {viewerState === "RETRYING_DOCUMENT" && "Nouvelle tentative de lecture du document…"}
          </p>
        </div>
      </div>
    );
  }

  if (viewerState === "ERROR" || !blobUrl) {
    return (
      <div className="space-y-4 rounded-2xl border border-lime-200 bg-lime-50 px-4 py-5">
        <div className="flex items-start gap-3">
          {mediaType === "IMAGE" ? (
            <Camera className="mt-0.5 h-5 w-5 shrink-0 text-lime-600" />
          ) : (
            <FileText className="mt-0.5 h-5 w-5 shrink-0 text-lime-600" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-lime-900">{title}</p>
            <p className="mt-1 text-sm text-lime-800">{error || "Aperçu indisponible."}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={retryDocumentLoad}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <RefreshCw className="h-4 w-4" />
                Réessayer
              </button>
              {blobUrl ? (
                <a
                  href={blobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-lime-300 bg-white px-4 py-2 text-sm font-bold text-lime-900"
                >
                  <ExternalLink className="h-4 w-4" />
                  Ouvrir dans un nouvel onglet
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mediaType === "IMAGE") {
    return (
      <div
        ref={wrapperRef}
        className={`flex flex-col overflow-hidden rounded-[24px] border border-[#202838] bg-slate-950 shadow-lg select-none transition-all ${isExpandedView ? "fixed inset-0 z-[120] h-[100dvh] w-full rounded-none border-none" : "h-[75vh]"}`}
      >
        <div
          className={viewerToolbarClass}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <div className={`${toolbarPillClass} min-w-0 max-w-[13rem] gap-2 px-3 sm:max-w-[18rem] sm:px-4`}>
            <Camera className="h-4 w-4 shrink-0 text-[#8175ff] sm:h-5 sm:w-5" />
            <span className="truncate text-xs font-semibold text-slate-200 sm:text-sm">{title}</span>
          </div>

          <div className="flex w-full min-w-0 items-center justify-end gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:w-auto sm:gap-3">
            <button
              type="button"
              onClick={handleZoomOut}
              className={toolbarButtonClass}
              title="Zoom arrière"
              aria-label="Zoom arrière"
            >
              <ZoomOut className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.8} />
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              className={toolbarButtonClass}
              title="Zoom avant"
              aria-label="Zoom avant"
            >
              <ZoomIn className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.8} />
            </button>

            <span className={toolbarDividerClass} aria-hidden="true" />

            <button
              type="button"
              onClick={handleImageFitWidth}
              aria-pressed={imageViewMode === "width" && scale === 1}
              className={imageModeButtonClass(imageViewMode === "width" && scale === 1)}
              title="Ajuster à la largeur"
              aria-label="Ajuster à la largeur"
            >
              <MoveHorizontal className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.8} />
            </button>
            <button
              type="button"
              onClick={handleImageFitScreen}
              aria-pressed={imageViewMode === "screen" && scale === 1}
              className={imageModeButtonClass(imageViewMode === "screen" && scale === 1)}
              title="Ajuster à l'écran"
              aria-label="Ajuster à l'écran"
            >
              <Maximize2 className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.8} />
            </button>
            <button
              type="button"
              onClick={handleImageResetZoom}
              aria-pressed={imageViewMode === "actual" && scale === 1}
              className={imageModeButtonClass(imageViewMode === "actual" && scale === 1)}
              title="Réinitialiser le zoom à 100%"
              aria-label="Réinitialiser le zoom à 100%"
            >
              <RotateCcw className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.8} />
            </button>

            <span className={toolbarDividerClass} aria-hidden="true" />

            <button
              type="button"
              onClick={toggleFullscreen}
              className={toolbarButtonClass}
              title={isExpandedView ? "Quitter le plein écran" : "Plein écran"}
              aria-label={isExpandedView ? "Quitter le plein écran" : "Plein écran"}
            >
              {isExpandedView ? (
                <Minimize2 className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.8} />
              ) : (
                <Fullscreen className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.8} />
              )}
            </button>

            <a
              href={blobUrl || "#"}
              download={title || "image"}
              className={toolbarButtonClass}
              title="Télécharger l'image"
              aria-label="Télécharger l'image"
            >
              <Download className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.8} />
            </a>
          </div>
        </div>

        <div
          ref={containerRef}
          className="flex-1 overflow-hidden bg-slate-900/95"
          onContextMenu={(event) => event.preventDefault()}
        >
          <div
            ref={imageStageRef}
            className={`h-full w-full overflow-auto scroll-smooth p-4 ${
              imageCanPan ? (isImagePanning ? "cursor-grabbing" : "cursor-grab") : "cursor-default"
            }`}
            onPointerDown={handleImagePointerDown}
            onPointerMove={handleImagePointerMove}
            onPointerUp={stopImagePan}
            onPointerCancel={stopImagePan}
          >
            <div className="flex min-h-full min-w-full items-center justify-center">
              <img
                src={blobUrl}
                alt={title}
                draggable={false}
                onLoad={(event) => {
                  setImageNaturalSize({
                    width: event.currentTarget.naturalWidth,
                    height: event.currentTarget.naturalHeight,
                  });
                  setViewerState("READY");
                }}
                onError={() => {
                  setError("L’image reçue n’a pas pu être affichée. Veuillez réessayer.");
                  setViewerState("TEMPORARY_ERROR");
                }}
                className="block max-w-none select-none rounded-sm shadow-2xl ring-1 ring-white/10 pointer-events-none"
                style={
                  imageRenderWidth && imageRenderHeight
                    ? { width: imageRenderWidth, height: imageRenderHeight }
                    : undefined
                }
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const baseReadingWidth = Math.max(containerDimensions.width - 32, 280);
  const renderWidth = Math.round(baseReadingWidth * scale);
  const resolvedDownloadFileName = downloadFileName || `${title}.pdf`;

  return (
    <div
      ref={wrapperRef}
      className={`flex flex-col overflow-hidden rounded-[24px] border border-[#202838] bg-slate-950 shadow-lg select-none transition-all ${isExpandedView ? "fixed inset-0 z-[120] h-[100dvh] w-full rounded-none border-none" : "h-[75vh]"}`}
    >
      <div
        className={viewerToolbarClass}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        {viewerState === "READY" && numPages ? (
          <div className={toolbarPillClass}>
            <button
              type="button"
              onClick={() => changePage(-1)}
              disabled={pageNumber <= 1}
              className={toolbarPillButtonClass}
              title="Page précédente"
              aria-label="Page précédente"
            >
              <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.8} />
            </button>
            <span className="min-w-[4.5rem] px-1 text-center text-base font-bold tabular-nums text-slate-100 sm:min-w-[5rem] sm:px-1.5 sm:text-lg">
              {pageNumber} <span className="mx-1 font-medium text-slate-500">/</span> {numPages}
            </span>
            <button
              type="button"
              onClick={() => changePage(1)}
              disabled={!numPages || pageNumber >= numPages}
              className={toolbarPillButtonClass}
              title="Page suivante"
              aria-label="Page suivante"
            >
              <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.8} />
            </button>
          </div>
        ) : (
          <div className={`${toolbarPillClass} gap-3 px-4 text-sm font-semibold text-slate-300`} role="status">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
            Chargement du document…
          </div>
        )}

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={handleZoomOut}
            className={toolbarButtonClass}
            title="Zoom arrière"
            aria-label="Zoom arrière"
          >
            <ZoomOut className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.8} />
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            className={toolbarButtonClass}
            title="Zoom avant"
            aria-label="Zoom avant"
          >
            <ZoomIn className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.8} />
          </button>

          <span className={toolbarDividerClass} aria-hidden="true" />

          <button
            type="button"
            onClick={toggleFullscreen}
            className={toolbarButtonClass}
            title={isExpandedView ? "Quitter le plein écran" : "Plein écran"}
            aria-label={isExpandedView ? "Quitter le plein écran" : "Plein écran"}
          >
            {isExpandedView ? (
              <Minimize2 className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.8} />
            ) : (
              <Fullscreen className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.8} />
            )}
          </button>

          {allowDownload ? (
            <a
              href={blobUrl}
              download={resolvedDownloadFileName}
              className={toolbarButtonClass}
              title="Télécharger le PDF"
              aria-label="Télécharger le PDF"
            >
              <Download className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.8} />
            </a>
          ) : null}
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-slate-900/95 p-4 [-webkit-overflow-scrolling:touch]"
        onContextMenu={(event) => event.preventDefault()}
      >
        <div className="relative mx-auto w-fit shadow-2xl ring-1 ring-white/10 transition-transform duration-200">
          <Document
            file={blobUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={handleDocumentLoadError}
            loading={
              <div className="flex h-[50vh] w-full items-center justify-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
              </div>
            }
            error={null}
          >
            <Page
              key={`${pageNumber}-${renderWidth}`}
              pageNumber={pageNumber}
              width={renderWidth}
              className="bg-white"
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </Document>
          <div className="pointer-events-none absolute inset-0 z-10" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
