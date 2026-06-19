import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Maximize,
  Maximize2,
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
  const toolbarButtonClass =
    "touch-target inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-slate-300 transition-colors cursor-pointer hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed";

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
          className="sticky top-0 z-30 flex flex-wrap items-center justify-center gap-2 border-b border-slate-800 bg-slate-900 px-3 py-2 text-slate-200 shadow-md sm:justify-between sm:gap-3 sm:px-4 sm:py-3"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex min-w-0 items-center gap-2 bg-slate-800/80 rounded-lg p-1.5 border border-slate-700/50">
            <Camera className="h-4 w-4 shrink-0 text-indigo-300" />
            <span className="max-w-[14rem] truncate px-1 text-xs font-semibold text-slate-200">{title}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center bg-slate-800/80 rounded-lg p-1 border border-slate-700/50">
              <button
                type="button"
                onClick={handleZoomOut}
                className={toolbarButtonClass}
                title="Zoom arrière"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="px-2 text-xs font-mono font-bold text-slate-300 min-w-[4.5rem] text-center">
                {imageZoomLabel}
              </span>
              <button
                type="button"
                onClick={handleZoomIn}
                className={toolbarButtonClass}
                title="Zoom avant"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            <div className="w-px h-6 bg-slate-700 mx-1 hidden sm:block"></div>

            <div className="flex items-center bg-slate-800/80 rounded-lg p-1 border border-slate-700/50">
              <button
                type="button"
                onClick={handleImageFitWidth}
                aria-pressed={imageViewMode === "width" && scale === 1}
                className={`px-2 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                  imageViewMode === "width" && scale === 1
                    ? "bg-indigo-600 text-white"
                    : "text-slate-300 hover:bg-slate-700"
                }`}
                title="Ajuster à la largeur"
              >
                Largeur
              </button>
              <button
                type="button"
                onClick={handleImageFitScreen}
                aria-pressed={imageViewMode === "screen" && scale === 1}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  imageViewMode === "screen" && scale === 1
                    ? "bg-indigo-600 text-white"
                    : "text-slate-300 hover:bg-slate-700"
                }`}
                title="Ajuster à l'écran"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleImageResetZoom}
                aria-pressed={imageViewMode === "actual" && scale === 1}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  imageViewMode === "actual" && scale === 1
                    ? "bg-indigo-600 text-white"
                    : "text-slate-300 hover:bg-slate-700"
                }`}
                title="Réinitialiser le zoom à 100%"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            <div className="w-px h-6 bg-slate-700 mx-1 hidden sm:block"></div>

            <button
              type="button"
              onClick={toggleFullscreen}
              className={`${toolbarButtonClass} rounded-lg border border-slate-700/50 bg-slate-800/80`}
              title="Plein écran"
            >
              <Maximize className="w-4 h-4" />
            </button>

            <a
              href={blobUrl || "#"}
              download={title || "image"}
              className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/50 text-white transition-colors cursor-pointer flex items-center gap-2"
              title="Télécharger l'image"
            >
              <Download className="w-4 h-4" />
              <span className="text-xs font-semibold hidden sm:inline">Télécharger</span>
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
        className="sticky top-0 z-30 flex flex-wrap items-center justify-center gap-2 border-b border-slate-800 bg-slate-900 px-3 py-2 text-slate-200 shadow-md sm:justify-between sm:gap-3 sm:px-4 sm:py-3"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-1 rounded-lg border border-slate-700/50 bg-slate-800/80 p-1">
          <button
            type="button"
            onClick={() => changePage(-1)}
            disabled={pageNumber <= 1}
            className={toolbarButtonClass}
            title="Page précédente"
            aria-label="Page précédente"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="min-w-[5rem] px-2 text-center text-sm font-semibold font-mono text-slate-200">
            {pageNumber} <span className="mx-0.5 text-slate-500">/</span> {numPages || "?"}
          </span>
          <button
            type="button"
            onClick={() => changePage(1)}
            disabled={!numPages || pageNumber >= numPages}
            className={toolbarButtonClass}
            title="Page suivante"
            aria-label="Page suivante"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          <div className="flex items-center rounded-lg border border-slate-700/50 bg-slate-800/80 p-1">
            <button type="button" onClick={handleZoomOut} className={toolbarButtonClass} title="Zoom arrière" aria-label="Zoom arrière">
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handlePdfFitWidth}
              className={`min-h-[44px] rounded-md px-2 text-xs font-mono font-bold transition-colors ${
                scale === 1 ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-700"
              }`}
              title="Ajuster à la largeur"
              aria-label="Ajuster à la largeur"
            >
              {zoomLabel}
            </button>
            <button type="button" onClick={handleZoomIn} className={toolbarButtonClass} title="Zoom avant" aria-label="Zoom avant">
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            className={`${toolbarButtonClass} rounded-lg border border-slate-700/50 bg-slate-800/80`}
            title="Plein écran"
            aria-label="Plein écran"
          >
            <Maximize className="w-4 h-4" />
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
