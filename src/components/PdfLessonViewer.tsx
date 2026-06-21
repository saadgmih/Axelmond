import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Maximize,
  Maximize2,
  Minimize2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
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

type ImageViewMode = "width" | "screen" | "actual";

const viewerToolbarClass =
  "sticky top-0 z-30 flex min-h-16 flex-wrap items-center gap-2 border-b border-slate-700/70 bg-slate-950/95 px-3 py-2.5 text-slate-200 shadow-[0_10px_30px_rgba(2,6,23,0.28)] backdrop-blur-xl sm:flex-nowrap sm:gap-3 sm:px-4";
const toolbarGroupClass =
  "flex h-11 shrink-0 items-center rounded-md border border-slate-700/80 bg-slate-900 p-1 shadow-sm";
const toolbarButtonClass =
  "touch-target inline-flex h-9 min-h-9 w-9 min-w-9 items-center justify-center rounded-[5px] text-slate-300 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/80 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-300";
const toolbarDividerClass = "hidden h-6 w-px shrink-0 bg-slate-700/80 sm:block";

function getToolbarModeClass(active: boolean) {
  return `inline-flex h-9 min-h-9 items-center justify-center gap-2 rounded-[5px] px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/80 ${
    active ? "bg-indigo-500 text-white shadow-sm" : "text-slate-300 hover:bg-slate-800 hover:text-white"
  }`;
}

export default function PdfLessonViewer({ contentId, title, mediaType = "PDF" }: PdfLessonViewerProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

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
  const imageZoomLabel =
    scale === 1
      ? imageViewMode === "width"
        ? "Largeur"
        : imageViewMode === "screen"
          ? "Écran"
          : "100%"
      : `${Math.round(imageActiveScale * 100)}%`;

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
  }, [loading, blobUrl, mediaType]);

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

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
    setScale(1.0);
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
    setScale((prev) => Math.min(prev + 0.25, mediaType === "IMAGE" ? 6.0 : 4.0));
  }

  function handleZoomOut() {
    setScale((prev) => Math.max(prev - 0.25, mediaType === "IMAGE" ? 0.25 : 0.5));
  }

  function handlePdfFitWidth() {
    setScale(1.0);
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

    const loadDocument = async () => {
      setLoading(true);
      setError("");
      setBlobUrl(null);
      setScale(1.0);
      setImageViewMode("width");
      setImageNaturalSize({ width: 0, height: 0 });
      imageDragRef.current.active = false;
      setIsImagePanning(false);

      try {
        const token = await getFreshSessionToken();
        if (!token) throw new Error("Session expirée. Reconnectez-vous.");

        const response = await fetch(`/api/lesson-contents/${contentId}/document`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(30_000),
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

  useEffect(() => {
    if (mediaType !== "IMAGE" || !imageRenderWidth || !imageRenderHeight) return;
    centerImageStage();
  }, [mediaType, imageRenderWidth, imageRenderHeight, isExpandedView]);

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
        ref={wrapperRef}
        className={`flex flex-col rounded-2xl border border-slate-200 bg-slate-950 shadow-lg overflow-hidden select-none transition-all ${isExpandedView ? "fixed inset-0 z-[120] h-[100dvh] w-full rounded-none border-none" : "h-[75vh]"}`}
      >
        <div
          className={viewerToolbarClass}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3 py-0.5">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-indigo-400/25 bg-indigo-500/10 text-indigo-300">
              <Camera className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Support visuel</p>
              <p className="max-w-[18rem] truncate text-sm font-semibold text-slate-100 lg:max-w-[26rem]">{title}</p>
            </div>
          </div>

          <div className="flex w-full items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:w-auto sm:pb-0">
            <div className={toolbarGroupClass}>
              <button type="button" onClick={handleZoomOut} className={toolbarButtonClass} title="Zoom arrière">
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="min-w-[4.75rem] px-2 text-center text-xs font-semibold tabular-nums text-slate-200">
                {imageZoomLabel}
              </span>
              <button type="button" onClick={handleZoomIn} className={toolbarButtonClass} title="Zoom avant">
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>

            <span className={toolbarDividerClass} aria-hidden="true" />

            <div className={toolbarGroupClass}>
              <button
                type="button"
                onClick={handleImageFitWidth}
                aria-pressed={imageViewMode === "width" && scale === 1}
                className={getToolbarModeClass(imageViewMode === "width" && scale === 1)}
                title="Ajuster à la largeur"
              >
                Largeur
              </button>
              <button
                type="button"
                onClick={handleImageFitScreen}
                aria-pressed={imageViewMode === "screen" && scale === 1}
                className={`${toolbarButtonClass} ${
                  imageViewMode === "screen" && scale === 1 ? "bg-indigo-500 text-white hover:bg-indigo-500" : ""
                }`}
                title="Ajuster à l'écran"
                aria-label="Ajuster à l'écran"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleImageResetZoom}
                aria-pressed={imageViewMode === "actual" && scale === 1}
                className={`${toolbarButtonClass} ${
                  imageViewMode === "actual" && scale === 1 ? "bg-indigo-500 text-white hover:bg-indigo-500" : ""
                }`}
                title="Réinitialiser le zoom à 100%"
                aria-label="Réinitialiser le zoom à 100%"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>

            <span className={toolbarDividerClass} aria-hidden="true" />

            <button
              type="button"
              onClick={toggleFullscreen}
              className={`${toolbarButtonClass} h-11 min-h-11 w-11 min-w-11 border border-slate-700/80 bg-slate-900`}
              title={isExpandedView ? "Quitter le plein écran" : "Plein écran"}
              aria-label={isExpandedView ? "Quitter le plein écran" : "Plein écran"}
            >
              {isExpandedView ? <Minimize2 className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </button>

            <a
              href={blobUrl || "#"}
              download={title || "image"}
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md border border-indigo-400/30 bg-indigo-500 px-3 text-white shadow-sm transition-colors hover:bg-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
              title="Télécharger l'image"
            >
              <Download className="h-4 w-4" />
              <span className="hidden text-xs font-semibold md:inline">Télécharger</span>
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
  const zoomLabel = scale === 1 ? "Largeur" : `${Math.round(scale * 100)}%`;

  return (
    <div
      ref={wrapperRef}
      className={`flex flex-col rounded-2xl border border-slate-200 bg-slate-950 shadow-lg overflow-hidden select-none transition-all ${isExpandedView ? "fixed inset-0 z-[120] h-[100dvh] w-full rounded-none border-none" : "h-[75vh]"}`}
    >
      <div
        className={viewerToolbarClass}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={toolbarGroupClass}>
          <button
            type="button"
            onClick={() => changePage(-1)}
            disabled={pageNumber <= 1}
            className={toolbarButtonClass}
            title="Page précédente"
            aria-label="Page précédente"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="min-w-[5.25rem] px-2 text-center text-sm font-semibold tabular-nums text-slate-100">
            {pageNumber} <span className="mx-1 font-normal text-slate-600">/</span> {numPages || "?"}
          </span>
          <button
            type="button"
            onClick={() => changePage(1)}
            disabled={!numPages || pageNumber >= numPages}
            className={toolbarButtonClass}
            title="Page suivante"
            aria-label="Page suivante"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="ml-auto flex min-w-0 items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:pb-0">
          <div className={toolbarGroupClass}>
            <button
              type="button"
              onClick={handleZoomOut}
              className={toolbarButtonClass}
              title="Zoom arrière"
              aria-label="Zoom arrière"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handlePdfFitWidth}
              aria-pressed={scale === 1}
              className={`${getToolbarModeClass(scale === 1)} min-w-[5rem] tabular-nums`}
              title="Ajuster à la largeur"
              aria-label="Ajuster à la largeur"
            >
              {zoomLabel}
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              className={toolbarButtonClass}
              title="Zoom avant"
              aria-label="Zoom avant"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>

          <span className={toolbarDividerClass} aria-hidden="true" />

          <button
            type="button"
            onClick={toggleFullscreen}
            className={`${toolbarButtonClass} h-11 min-h-11 w-11 min-w-11 border border-slate-700/80 bg-slate-900`}
            title={isExpandedView ? "Quitter le plein écran" : "Plein écran"}
            aria-label={isExpandedView ? "Quitter le plein écran" : "Plein écran"}
          >
            {isExpandedView ? <Minimize2 className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>
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
            loading={
              <div className="flex h-[50vh] w-full items-center justify-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
              </div>
            }
            error={
              <div className="flex h-[50vh] w-full items-center justify-center text-sm font-semibold text-rose-500">
                Impossible de lire ce PDF.
              </div>
            }
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
