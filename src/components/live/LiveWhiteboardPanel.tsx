import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, PenTool, Shapes, ZoomIn, ZoomOut } from "lucide-react";
import type { LiveWhiteboardStroke } from "../../live/live-sync";
import {
  createWhiteboardStrokeId,
  normalizeCanvasPoint,
  redrawWhiteboard,
} from "./live-whiteboard-canvas";

interface LiveWhiteboardPanelProps {
  expanded: boolean;
  onToggleExpanded: () => void;
  canModerate: boolean;
  strokes: LiveWhiteboardStroke[];
  localIdentity: string;
  onStrokeComplete: (stroke: LiveWhiteboardStroke) => void;
  onClear: () => void;
}

export default function LiveWhiteboardPanel({
  expanded,
  onToggleExpanded,
  canModerate,
  strokes,
  localIdentity,
  onStrokeComplete,
  onClear,
}: LiveWhiteboardPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDrawingRef = useRef(false);
  const currentPointsRef = useRef<Array<{ x: number; y: number }>>([]);
  const [zoom, setZoom] = useState(1);
  const [tool, setTool] = useState<"draw" | "shapes">("draw");

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (context) {
          redrawWhiteboard(context, strokes, canvas.width, canvas.height);
        }
      }
    };

    resizeCanvas();
    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(container);
    return () => observer.disconnect();
  }, [expanded, strokes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    redrawWhiteboard(context, strokes, canvas.width, canvas.height);
  }, [strokes]);

  const getCoordinates = (
    event: React.PointerEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement,
  ) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = "touches" in event ? event.touches[0]?.clientX ?? 0 : event.clientX;
    const clientY = "touches" in event ? event.touches[0]?.clientY ?? 0 : event.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (event: React.PointerEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const { x, y } = getCoordinates(event, canvas);
    isDrawingRef.current = true;
    currentPointsRef.current = [{ x, y }];
    context.strokeStyle = tool === "shapes" ? "#22d3ee" : "#8b5cf6";
    context.lineWidth = (tool === "shapes" ? 2 : 3) * zoom;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(x, y);
  };

  const draw = (event: React.PointerEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const { x, y } = getCoordinates(event, canvas);
    currentPointsRef.current.push({ x, y });
    context.lineTo(x, y);
    context.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    const points = currentPointsRef.current;
    isDrawingRef.current = false;
    currentPointsRef.current = [];
    if (!canvas || points.length === 0) return;

    const normalizedPoints = points.map((point) =>
      normalizeCanvasPoint(point.x, point.y, canvas.width, canvas.height),
    );
    onStrokeComplete({
      id: createWhiteboardStrokeId(localIdentity),
      tool,
      color: tool === "shapes" ? "#22d3ee" : "#8b5cf6",
      width: (tool === "shapes" ? 2 : 3) * zoom,
      points: normalizedPoints,
    });
  };

  const clearWhiteboard = () => {
    if (!canModerate) return;
    onClear();
  };

  return (
    <div className={`flex h-full flex-col ${expanded ? "min-h-[min(72dvh,780px)]" : "min-h-[320px]"}`}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setTool("draw")}
          className={`rounded-xl border px-3 py-2 text-[11px] font-bold transition ${
            tool === "draw" ? "border-indigo-400/40 bg-indigo-500/10 text-indigo-200" : "border-white/10 bg-zinc-900 text-zinc-300"
          }`}
        >
          <PenTool className="mr-1 inline h-4 w-4" />
          Dessin libre
        </button>
        <button
          type="button"
          onClick={() => setTool("shapes")}
          className={`rounded-xl border px-3 py-2 text-[11px] font-bold transition ${
            tool === "shapes" ? "border-cyan-400/40 bg-cyan-500/10 text-cyan-200" : "border-white/10 bg-zinc-900 text-zinc-300"
          }`}
        >
          <Shapes className="mr-1 inline h-4 w-4" />
          Géométrie
        </button>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={() => setZoom((value) => Math.max(0.5, Number((value - 0.1).toFixed(2))))} className="rounded-lg border border-white/10 p-2 text-zinc-300 hover:bg-zinc-800" aria-label="Zoom arrière">
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="min-w-[3rem] text-center text-[10px] font-bold text-zinc-400">{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => setZoom((value) => Math.min(2, Number((value + 0.1).toFixed(2))))} className="rounded-lg border border-white/10 p-2 text-zinc-300 hover:bg-zinc-800" aria-label="Zoom avant">
            <ZoomIn className="h-4 w-4" />
          </button>
          <button type="button" onClick={onToggleExpanded} className="rounded-lg border border-white/10 p-2 text-zinc-300 hover:bg-zinc-800" aria-label={expanded ? "Réduire le tableau" : "Tableau plein écran"}>
            {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div ref={containerRef} className="relative flex-1 overflow-hidden rounded-2xl border border-white/10 bg-[#eef2ff] shadow-inner">
        <canvas
          ref={canvasRef}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          onTouchCancel={stopDrawing}
          className="h-full w-full touch-none cursor-crosshair"
        />
      </div>

      {canModerate && (
        <button
          type="button"
          onClick={clearWhiteboard}
          className="mt-3 w-full rounded-xl border border-red-500/20 bg-red-500/10 py-2.5 text-xs font-bold text-red-300 transition hover:bg-red-500/20"
        >
          Nettoyer le tableau
        </button>
      )}
    </div>
  );
}
