import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  BookOpen,
  Camera,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  Fullscreen,
  Hand,
  Maximize2,
  Minimize2,
  MoveHorizontal,
  PanelLeft,
  PanelLeftClose,
  RefreshCw,
  RotateCcw,
  RotateCw,
  ScrollText,
  ShieldCheck,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { loadProtectedResource, ProtectedResourceError } from "../protected-resource";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Bundle the PDF.js worker with the application using standard relative path
// so Vite compiles it correctly as a separate asset.
const BUNDLED_PDF_WORKER_SRC = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
pdfjs.GlobalWorkerOptions.workerSrc = `${BUNDLED_PDF_WORKER_SRC}?v=5.4.296-v2`;

interface PdfLessonViewerProps {
  contentId?: string;
  title: string;
  mediaType?: "PDF" | "IMAGE";
  documentUrl?: string;
  downloadFileName?: string;
  allowDownload?: boolean;
}

type ImageViewMode = "width" | "screen" | "actual";
type PdfFile = { data: Uint8Array<ArrayBuffer> };
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
  "sticky top-0 z-30 flex min-h-[52px] flex-wrap items-center justify-between gap-1.5 border-b border-[#202838] bg-[#0b1019] px-2 py-1.5 text-slate-200 shadow-[0_12px_32px_rgba(2,6,23,0.28)] sm:min-h-[80px] sm:flex-nowrap sm:gap-4 sm:px-4 sm:py-3";
const toolbarPillClass =
  "flex h-[34px] shrink-0 items-center rounded-[11px] border border-[#222c3d] bg-[#121827] px-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.025),0_8px_24px_rgba(2,6,23,0.2)] sm:h-14 sm:rounded-[18px] sm:px-1";
const toolbarButtonClass =
  "inline-flex h-[34px] min-h-[34px] w-[34px] min-w-[34px] shrink-0 items-center justify-center rounded-[9px] border border-[#222c3d] bg-[#121827] text-[#8175ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.025),0_8px_22px_rgba(2,6,23,0.2)] transition-colors hover:border-teal-500/50 hover:bg-[#171e2e] hover:text-teal-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/80 disabled:cursor-not-allowed disabled:opacity-30 sm:h-12 sm:min-h-12 sm:w-12 sm:min-w-12 sm:rounded-[14px]";
const toolbarPillButtonClass =
  "inline-flex h-7 min-h-[28px] w-7 min-w-[28px] items-center justify-center rounded-[7px] text-[#8175ff] transition-colors hover:bg-white/[0.04] hover:text-teal-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/80 disabled:cursor-not-allowed disabled:opacity-25 sm:h-12 sm:min-h-12 sm:w-12 sm:min-w-12 sm:rounded-xl";
const toolbarDividerClass = "h-5 w-px shrink-0 bg-[#273043] mx-0.5 sm:h-10 sm:mx-1";
const toolbarIconClass = "h-4 w-4 sm:h-6 sm:w-6";

function imageModeButtonClass(active: boolean) {
  return `${toolbarButtonClass} ${active ? "border-teal-500/50 bg-teal-500/10 text-teal-300" : ""}`;
}

async function readBlobBytes(blob: Blob): Promise<Uint8Array<ArrayBuffer>> {
  if (typeof blob.arrayBuffer === "function") {
    return new Uint8Array((await blob.arrayBuffer()) as ArrayBuffer);
  }

  // Safari versions without Blob.arrayBuffer still support FileReader.
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error("Impossible de lire le document."));
    reader.onload = () => {
      if (!(reader.result instanceof ArrayBuffer)) {
        reject(new Error("Le document reçu est illisible."));
        return;
      }
      resolve(new Uint8Array(reader.result));
    };
    reader.readAsArrayBuffer(blob);
  });
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
  const [pdfFile, setPdfFile] = useState<PdfFile | null>(null);
  const [error, setError] = useState("");
  const [viewerState, setViewerState] = useState<ViewerState>("WAITING_FOR_SESSION");
  const [retryKey, setRetryKey] = useState(0);

  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [scrollMode, setScrollMode] = useState<"continuous" | "single">("continuous");
  const [showSidebar, setShowSidebar] = useState(false);

  const [scale, setScale] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPseudoFullscreen, setIsPseudoFullscreen] = useState(false);
  const [imageViewMode, setImageViewMode] = useState<ImageViewMode>("width");
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 0, height: 0 });
  const [isImagePanning, setIsImagePanning] = useState(false);

  const [touchZoomEnabled, setTouchZoomEnabled] = useState(false);
  const [touchFeedbackMsg, setTouchFeedbackMsg] = useState<string | null>(null);
  const [isPinching, setIsPinching] = useState(false);
  const [pinchFactor, setPinchFactor] = useState(1);
  const [pinchCenter, setPinchCenter] = useState({ x: 0, y: 0 });

  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageStageRef = useRef<HTMLDivElement>(null);
  const parseRetryCountRef = useRef(0);
  const parseRetryTimeoutRef = useRef<number | null>(null);
  const pinchStateRef = useRef({
    isPinching: false,
    startDistance: 0,
    startScale: 1,
    midpoint: { x: 0, y: 0 },
    currentFactor: 1,
  });
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

  // Anti-download keyboard shortcuts interceptor for student protection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ["s", "p", "u", "S", "P", "U"].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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

  function handleDocumentLoadError(err?: Error) {
    if (err) {
      console.error("[PdfLessonViewer] Document parse error:", err);
    }
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

  function goToPage(targetPage: number) {
    const page = Math.max(1, Math.min(targetPage, numPages || 1));
    setPageNumber(page);
    if (scrollMode === "continuous" && containerRef.current) {
      const pageEl = containerRef.current.querySelector(`[data-page-number="${page}"]`);
      if (pageEl) {
        pageEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }

  function changePage(offset: number) {
    const next = pageNumber + offset;
    if (next < 1 || (numPages && next > numPages)) return;
    goToPage(next);
  }

  function handleZoomIn() {
    setScale((prev) => Math.min(prev + 0.25, mediaType === "IMAGE" ? 6.0 : 4.0));
  }

  function handleZoomOut() {
    setScale((prev) => Math.max(prev - 0.25, mediaType === "IMAGE" ? 0.25 : 0.5));
  }

  function rotateClockwise() {
    setRotation((prev) => (prev + 90) % 360);
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
    if (!drag.active || drag.pointerId !== event.pointerId) return;
    const stage = event.currentTarget;
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
    if (!touchFeedbackMsg) return;
    const timer = window.setTimeout(() => {
      setTouchFeedbackMsg(null);
    }, 2800);
    return () => window.clearTimeout(timer);
  }, [touchFeedbackMsg]);

  function toggleTouchZoomMode() {
    setTouchZoomEnabled((prev) => {
      const next = !prev;
      setTouchFeedbackMsg(
        next
          ? "Mode Zoom Document activé : pincez l'écran pour zoomer dans le document"
          : "Mode Zoom Site activé : le zoom tactile s'applique au navigateur",
      );
      return next;
    });
  }

  // Intercept pinch gestures to zoom inside document rather than zooming the whole webpage
  useEffect(() => {
    const target = mediaType === "IMAGE" ? imageStageRef.current : containerRef.current;
    if (!target || !touchZoomEnabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        const rect = target.getBoundingClientRect();
        const midX = (t1.clientX + t2.clientX) / 2 - rect.left;
        const midY = (t1.clientY + t2.clientY) / 2 - rect.top;

        pinchStateRef.current = {
          isPinching: true,
          startDistance: dist,
          startScale: scale,
          midpoint: { x: midX, y: midY },
          currentFactor: 1,
        };

        setIsPinching(true);
        setPinchFactor(1);
        setPinchCenter({ x: midX, y: midY });
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!pinchStateRef.current.isPinching || e.touches.length < 2) return;
      e.preventDefault();

      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const startDist = pinchStateRef.current.startDistance || 1;
      const factor = dist / startDist;

      pinchStateRef.current.currentFactor = factor;
      setPinchFactor(factor);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!pinchStateRef.current.isPinching) return;

      if (e.touches.length < 2) {
        const factor = pinchStateRef.current.currentFactor;
        const prevScale = pinchStateRef.current.startScale;
        const minScale = mediaType === "IMAGE" ? 0.25 : 0.5;
        const maxScale = mediaType === "IMAGE" ? 6.0 : 4.0;
        const targetScale = Math.min(Math.max(Number((prevScale * factor).toFixed(2)), minScale), maxScale);

        const focalX = pinchStateRef.current.midpoint.x;
        const focalY = pinchStateRef.current.midpoint.y;
        const scaleRatio = targetScale / prevScale;

        pinchStateRef.current.isPinching = false;
        setIsPinching(false);
        setPinchFactor(1);

        if (Math.abs(targetScale - scale) > 0.02) {
          setScale(targetScale);

          const newScrollLeft = (target.scrollLeft + focalX) * scaleRatio - focalX;
          const newScrollTop = (target.scrollTop + focalY) * scaleRatio - focalY;

          window.requestAnimationFrame(() => {
            target.scrollLeft = Math.max(0, newScrollLeft);
            target.scrollTop = Math.max(0, newScrollTop);
          });
        }
      }
    };

    target.addEventListener("touchstart", handleTouchStart, { passive: false });
    target.addEventListener("touchmove", handleTouchMove, { passive: false });
    target.addEventListener("touchend", handleTouchEnd, { passive: false });
    target.addEventListener("touchcancel", handleTouchEnd, { passive: false });

    return () => {
      target.removeEventListener("touchstart", handleTouchStart);
      target.removeEventListener("touchmove", handleTouchMove);
      target.removeEventListener("touchend", handleTouchEnd);
      target.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [touchZoomEnabled, scale, mediaType]);

  // Scroll listener in continuous mode to track currently visible page
  const handleContainerScroll = useCallback(() => {
    if (scrollMode !== "continuous" || !containerRef.current || !numPages) return;
    const container = containerRef.current;
    const pageEls = container.querySelectorAll("[data-page-number]");
    const targetMiddle = container.scrollTop + container.clientHeight / 3;

    let closest = 1;
    let minDiff = Infinity;
    pageEls.forEach((el) => {
      const htmlEl = el as HTMLElement;
      const pNum = Number(htmlEl.getAttribute("data-page-number") || 1);
      const diff = Math.abs(htmlEl.offsetTop - targetMiddle);
      if (diff < minDiff) {
        minDiff = diff;
        closest = pNum;
      }
    });

    if (closest !== pageNumber) {
      setPageNumber(closest);
    }
  }, [scrollMode, numPages, pageNumber]);

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
      setPdfFile(null);
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

        const validatedPdfData = mediaType === "PDF" ? await readBlobBytes(blob) : null;
        objectUrl = URL.createObjectURL(blob);
        if (active) {
          setBlobUrl(objectUrl);
          setPdfFile(validatedPdfData ? { data: validatedPdfData } : null);
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
  }, [imageRenderHeight, imageRenderWidth, imageViewMode, mediaType]);

  if (
    viewerState === "RETRYING_DOCUMENT" ||
    ((!blobUrl || (mediaType === "PDF" && !pdfFile)) &&
      ["WAITING_FOR_SESSION", "LOADING_URL", "LOADING_DOCUMENT", "VALIDATING_DOCUMENT"].includes(viewerState))
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
        className={`flex flex-col overflow-hidden rounded-[24px] border border-[#202838] bg-slate-950 shadow-lg select-none transition-all relative ${isExpandedView ? "fixed inset-0 z-[120] h-[100dvh] w-full rounded-none border-none" : "h-[75vh]"}`}
      >
        {touchFeedbackMsg && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 px-3.5 py-1.5 rounded-full bg-slate-900/95 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold shadow-2xl backdrop-blur-md pointer-events-none animate-in fade-in slide-in-from-top-2 duration-200 flex items-center gap-2 max-w-[90%] text-center">
            <Hand className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
            <span className="truncate">{touchFeedbackMsg}</span>
          </div>
        )}

        <div
          className={viewerToolbarClass}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <div className={`${toolbarPillClass} min-w-0 max-w-[13rem] gap-2 px-3 sm:max-w-[18rem] sm:px-4`}>
            <Camera className="h-4 w-4 shrink-0 text-[#8175ff] sm:h-5 sm:w-5" />
            <span className="truncate text-xs font-semibold text-slate-200 sm:text-sm">{title}</span>
          </div>

          <div className="flex w-full min-w-0 items-center justify-start sm:justify-end gap-1 sm:gap-2.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden overscroll-x-contain py-0.5 sm:w-auto">
            <button
              type="button"
              onClick={handleZoomOut}
              className={toolbarButtonClass}
              title="Zoom arrière"
              aria-label="Zoom arrière"
            >
              <ZoomOut className={toolbarIconClass} strokeWidth={1.8} />
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              className={toolbarButtonClass}
              title="Zoom avant"
              aria-label="Zoom avant"
            >
              <ZoomIn className={toolbarIconClass} strokeWidth={1.8} />
            </button>

            {/* Bouton Zoom tactile */}
            <button
              type="button"
              onClick={toggleTouchZoomMode}
              className={`${toolbarButtonClass} ${
                touchZoomEnabled
                  ? "border-emerald-500/80 bg-emerald-500/20 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.35)] ring-1 ring-emerald-500/50"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title={
                touchZoomEnabled
                  ? "Zoom tactile activé (pincez avec 2 doigts pour zoomer directement dans l'image)"
                  : "Zoom tactile désactivé (cliquez pour zoomer dans l'image avec les doigts plutôt que sur le site)"
              }
              aria-label={
                touchZoomEnabled
                  ? "Désactiver le zoom tactile de l'image"
                  : "Activer le zoom tactile de l'image"
              }
              aria-pressed={touchZoomEnabled}
            >
              <Hand className={toolbarIconClass} strokeWidth={1.8} />
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
              <MoveHorizontal className={toolbarIconClass} strokeWidth={1.8} />
            </button>
            <button
              type="button"
              onClick={handleImageFitScreen}
              aria-pressed={imageViewMode === "screen" && scale === 1}
              className={imageModeButtonClass(imageViewMode === "screen" && scale === 1)}
              title="Ajuster à l'écran"
              aria-label="Ajuster à l'écran"
            >
              <Maximize2 className={toolbarIconClass} strokeWidth={1.8} />
            </button>
            <button
              type="button"
              onClick={handleImageResetZoom}
              aria-pressed={imageViewMode === "actual" && scale === 1}
              className={imageModeButtonClass(imageViewMode === "actual" && scale === 1)}
              title="Réinitialiser le zoom à 100%"
              aria-label="Réinitialiser le zoom à 100%"
            >
              <RotateCcw className={toolbarIconClass} strokeWidth={1.8} />
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
                <Minimize2 className={toolbarIconClass} strokeWidth={1.8} />
              ) : (
                <Fullscreen className={toolbarIconClass} strokeWidth={1.8} />
              )}
            </button>

            <a
              href={blobUrl || "#"}
              download={title || "image"}
              className={toolbarButtonClass}
              title="Télécharger l'image"
              aria-label="Télécharger l'image"
            >
              <Download className={toolbarIconClass} strokeWidth={1.8} />
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
            style={{
              touchAction: touchZoomEnabled ? "pan-x pan-y" : "auto",
            }}
            className={`h-full w-full overflow-auto scroll-smooth p-4 ${
              imageCanPan ? (isImagePanning ? "cursor-grabbing" : "cursor-grab") : "cursor-default"
            }`}
            onPointerDown={handleImagePointerDown}
            onPointerMove={handleImagePointerMove}
            onPointerUp={stopImagePan}
            onPointerCancel={stopImagePan}
          >
            <div
              style={
                isPinching
                  ? {
                      transform: `scale(${pinchFactor})`,
                      transformOrigin: `${pinchCenter.x}px ${pinchCenter.y}px`,
                      willChange: "transform",
                      transition: "none",
                    }
                  : undefined
              }
              className="flex min-h-full min-w-full items-center justify-center"
            >
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
      className={`flex flex-col overflow-hidden rounded-[24px] border border-[#202838] bg-slate-950 shadow-2xl select-none transition-all relative ${isExpandedView ? "fixed inset-0 z-[120] h-[100dvh] w-full rounded-none border-none" : "h-[80vh]"}`}
      onContextMenu={(event) => event.preventDefault()}
    >
      {/* Toast de confirmation du mode de zoom tactile */}
      {touchFeedbackMsg && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 px-3.5 py-1.5 rounded-full bg-slate-900/95 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold shadow-2xl backdrop-blur-md pointer-events-none animate-in fade-in slide-in-from-top-2 duration-200 flex items-center gap-2 max-w-[90%] text-center">
          <Hand className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
          <span className="truncate">{touchFeedbackMsg}</span>
        </div>
      )}

      {/* Top Header Banner: Executive Performance Académique White-label */}
      <div className="flex items-center justify-between border-b border-[#1c2433] bg-[#070b12] px-3 py-1.5 sm:px-4 sm:py-2 text-xs text-slate-400">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-400">
            <BookOpen className="h-3.5 w-3.5" />
          </span>
          <span className="truncate font-semibold text-slate-200 text-[11px] sm:text-xs">{title}</span>
          <span className="hidden sm:inline-block text-[#324058]">•</span>
          <span className="hidden sm:inline-block text-[11px] text-slate-400 font-medium">Performance Académique • Support officiel</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/60 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-800/40">
            <ShieldCheck className="h-3 w-3" />
            Lecture sécurisée
          </span>
        </div>
      </div>

      {/* Main Office/Acrobat-tier Toolbar */}
      <div
        className={viewerToolbarClass}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-1 sm:gap-3 flex-wrap sm:flex-nowrap min-w-0">
          {/* Sidebar Toggle for Page Thumbnails */}
          <button
            type="button"
            onClick={() => setShowSidebar((prev) => !prev)}
            className={`${toolbarButtonClass} ${showSidebar ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]" : ""}`}
            title="Miniatures des pages (volet latéral)"
            aria-label="Miniatures des pages (volet latéral)"
          >
            <PanelLeft className={toolbarIconClass} strokeWidth={1.8} />
          </button>

          {/* Continuous Scroll vs Single Page Toggle */}
          <button
            type="button"
            onClick={() => setScrollMode((prev) => (prev === "continuous" ? "single" : "continuous"))}
            className={`${toolbarButtonClass} ${scrollMode === "continuous" ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-400" : ""}`}
            title={scrollMode === "continuous" ? "Mode défilement continu (actif)" : "Passer en défilement continu"}
            aria-label={scrollMode === "continuous" ? "Mode défilement continu (actif)" : "Passer en défilement continu"}
          >
            <ScrollText className={toolbarIconClass} strokeWidth={1.8} />
          </button>

          {/* Page Indicator Pill with Navigation Buttons */}
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
                <ChevronLeft className={toolbarIconClass} strokeWidth={1.8} />
              </button>
              <span className="min-w-[3.6rem] px-1 text-center text-xs font-bold tabular-nums text-slate-100 sm:min-w-[5rem] sm:px-1.5 sm:text-lg">
                {pageNumber} <span className="mx-0.5 font-medium text-slate-500">/</span> {numPages}
              </span>
              <button
                type="button"
                onClick={() => changePage(1)}
                disabled={!numPages || pageNumber >= numPages}
                className={toolbarPillButtonClass}
                title="Page suivante"
                aria-label="Page suivante"
              >
                <ChevronRight className={toolbarIconClass} strokeWidth={1.8} />
              </button>
            </div>
          ) : (
            <div className={`${toolbarPillClass} gap-2 px-3 text-xs sm:gap-3 sm:px-4 sm:text-sm font-semibold text-slate-300`} role="status">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent sm:h-4 sm:w-4" />
              Chargement du document…
            </div>
          )}
        </div>

        {/* Right Controls: Zoom, Rotate, Fullscreen, Download (if allowed) */}
        <div className="w-full sm:w-auto min-w-0 flex items-center justify-start sm:justify-end gap-1 sm:gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden overscroll-x-contain py-0.5">
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            <button
              type="button"
              onClick={handleZoomOut}
              className={toolbarButtonClass}
              title="Zoom arrière"
              aria-label="Zoom arrière"
            >
              <ZoomOut className={toolbarIconClass} strokeWidth={1.8} />
            </button>
            <span className="min-w-[2.4rem] px-0.5 text-center text-[11px] font-bold tabular-nums text-slate-300 sm:min-w-[3.2rem] sm:px-1 sm:text-sm">
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              className={toolbarButtonClass}
              title="Zoom avant"
              aria-label="Zoom avant"
            >
              <ZoomIn className={toolbarIconClass} strokeWidth={1.8} />
            </button>
          </div>

          {/* Bouton Zoom tactile PDF */}
          <button
            type="button"
            onClick={toggleTouchZoomMode}
            className={`${toolbarButtonClass} ${
              touchZoomEnabled
                ? "border-emerald-500/80 bg-emerald-500/20 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.35)] ring-1 ring-emerald-500/50"
                : "text-slate-400 hover:text-slate-200"
            }`}
            title={
              touchZoomEnabled
                ? "Zoom tactile PDF activé (pincez l'écran pour zoomer directement dans le document)"
                : "Zoom tactile PDF désactivé (cliquez pour zoomer dans le document plutôt que sur le site)"
            }
            aria-label={
              touchZoomEnabled
                ? "Désactiver le zoom tactile PDF"
                : "Activer le zoom tactile PDF"
            }
            aria-pressed={touchZoomEnabled}
          >
            <Hand className={toolbarIconClass} strokeWidth={1.8} />
          </button>

          <span className={toolbarDividerClass} aria-hidden="true" />

          {/* Fit Width */}
          <button
            type="button"
            onClick={handleImageFitWidth}
            className={toolbarButtonClass}
            title="Ajuster à la largeur"
            aria-label="Ajuster à la largeur"
          >
            <MoveHorizontal className={toolbarIconClass} strokeWidth={1.8} />
          </button>

          {/* Fit Screen */}
          <button
            type="button"
            onClick={handleImageFitScreen}
            className={toolbarButtonClass}
            title="Ajuster à l'écran"
            aria-label="Ajuster à l'écran"
          >
            <Maximize2 className={toolbarIconClass} strokeWidth={1.8} />
          </button>

          {/* Reset Zoom */}
          <button
            type="button"
            onClick={handleImageResetZoom}
            className={toolbarButtonClass}
            title="Réinitialiser le zoom à 100%"
            aria-label="Réinitialiser le zoom à 100%"
          >
            <RotateCcw className={toolbarIconClass} strokeWidth={1.8} />
          </button>

          {/* 90 degree clockwise rotation */}
          <button
            type="button"
            onClick={rotateClockwise}
            className={toolbarButtonClass}
            title="Pivoter de 90°"
            aria-label="Pivoter de 90°"
          >
            <RotateCw className={toolbarIconClass} strokeWidth={1.8} />
          </button>

          <span className={toolbarDividerClass} aria-hidden="true" />

          {/* Immersive Fullscreen Mode */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className={toolbarButtonClass}
            title={isExpandedView ? "Quitter le plein écran" : "Plein écran"}
            aria-label={isExpandedView ? "Quitter le plein écran" : "Plein écran"}
          >
            {isExpandedView ? (
              <Minimize2 className={toolbarIconClass} strokeWidth={1.8} />
            ) : (
              <Fullscreen className={toolbarIconClass} strokeWidth={1.8} />
            )}
          </button>

          {/* Download Button ONLY if explicitly permitted (e.g. Legal Documents) */}
          {allowDownload ? (
            <a
              href={blobUrl}
              download={resolvedDownloadFileName}
              className={toolbarButtonClass}
              title="Télécharger le PDF"
              aria-label="Télécharger le PDF"
            >
              <Download className={toolbarIconClass} strokeWidth={1.8} />
            </a>
          ) : null}
        </div>
      </div>

      {/* Main Reading Workspace with Collapsible Thumbnails Sidebar */}
      <div className="flex flex-1 overflow-hidden bg-[#090d14] relative">
        <Document
          file={pdfFile}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={handleDocumentLoadError}
          loading={
            <div className="flex h-[50vh] w-full items-center justify-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            </div>
          }
          error={null}
          className="flex flex-1 overflow-hidden w-full h-full"
        >
          {/* Left Thumbnails Sidebar (Acrobat/WPS Style) */}
          {showSidebar && viewerState === "READY" && numPages ? (
            <aside
              className="w-48 sm:w-56 shrink-0 border-r border-[#1c2433] bg-[#0c121e] overflow-y-auto flex flex-col p-3 gap-3 select-none [scrollbar-width:thin] z-20 shadow-2xl transition-all"
              aria-label="Volet des miniatures des pages"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#202838]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                  Miniatures ({numPages})
                </span>
                <button
                  type="button"
                  onClick={() => setShowSidebar(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
                  title="Fermer le volet"
                  aria-label="Fermer le volet"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              </div>
              <div className="flex flex-col gap-3">
                {Array.from({ length: numPages }, (_, i) => {
                  const p = i + 1;
                  const isCurrent = p === pageNumber;
                  return (
                    <button
                      key={`thumb-${p}`}
                      type="button"
                      onClick={() => goToPage(p)}
                      className={`group flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all border ${
                        isCurrent
                          ? "bg-emerald-500/10 border-emerald-500/70 shadow-[0_0_12px_rgba(16,185,129,0.25)] text-emerald-400 font-bold"
                          : "bg-[#121827] border-[#1e2738] hover:border-emerald-500/40 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <div className="w-28 overflow-hidden rounded bg-white shadow-md pointer-events-none">
                        <Page
                          pageNumber={p}
                          width={112}
                          rotate={rotation}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                        />
                      </div>
                      <span className="text-[11px]">Page {p}</span>
                    </button>
                  );
                })}
              </div>
            </aside>
          ) : null}

          {/* Central PDF Stage with Smooth Scrolling and Text Layer */}
          <div
            ref={containerRef}
            onScroll={handleContainerScroll}
            style={{
              touchAction: touchZoomEnabled ? "pan-x pan-y" : "auto",
            }}
            className="flex-1 overflow-auto p-4 sm:p-6 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]"
            onContextMenu={(event) => event.preventDefault()}
          >
            {scrollMode === "continuous" && numPages ? (
              /* Continuous Scroll View (WPS / Word / Acrobat style) */
              <div
                style={
                  isPinching
                    ? {
                        transform: `scale(${pinchFactor})`,
                        transformOrigin: `${pinchCenter.x}px ${pinchCenter.y}px`,
                        willChange: "transform",
                        transition: "none",
                      }
                    : undefined
                }
                className="flex flex-col items-center gap-6 py-4 min-h-full"
              >
                {Array.from({ length: numPages }, (_, index) => {
                  const p = index + 1;
                  return (
                    <div
                      key={`continuous-page-${p}`}
                      data-page-number={p}
                      className="relative mx-auto shadow-[0_20px_50px_rgba(0,0,0,0.65)] ring-1 ring-white/10 transition-transform duration-200 rounded-sm bg-white"
                    >
                      <Page
                        key={`page-${p}-${renderWidth}-${rotation}`}
                        pageNumber={p}
                        width={renderWidth}
                        rotate={rotation}
                        className="bg-white"
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                      />
                      <div className="pointer-events-none absolute inset-0 z-10" aria-hidden="true" />
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Single Page View */
              <div
                style={
                  isPinching
                    ? {
                        transform: `scale(${pinchFactor})`,
                        transformOrigin: `${pinchCenter.x}px ${pinchCenter.y}px`,
                        willChange: "transform",
                        transition: "none",
                      }
                    : undefined
                }
                className="flex min-h-full items-center justify-center"
              >
                <div className="relative mx-auto w-fit shadow-[0_20px_50px_rgba(0,0,0,0.65)] ring-1 ring-white/10 transition-transform duration-200 rounded-sm bg-white">
                  <Page
                    key={`${pageNumber}-${renderWidth}-${rotation}`}
                    pageNumber={pageNumber}
                    width={renderWidth}
                    rotate={rotation}
                    className="bg-white"
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                  />
                  <div className="pointer-events-none absolute inset-0 z-10" aria-hidden="true" />
                </div>
              </div>
            )}
          </div>
        </Document>
      </div>
    </div>
  );
}
