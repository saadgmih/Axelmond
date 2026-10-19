import { useEffect, useRef, useState } from "react";
import type { LiveWhiteboardStroke } from "../../live/live-sync";
import { createWhiteboardStrokeId, normalizeCanvasPoint, redrawWhiteboard } from "./live-whiteboard-canvas";

const AVAILABLE_COLORS = [
  { label: "Émeraude", value: "#05C2A5" },
  { label: "Noir Encre", value: "#0f172a" },
  { label: "Rouge", value: "#dc2626" },
  { label: "Bleu", value: "#2563eb" },
] as const;

const AVAILABLE_WIDTHS = [
  { label: "Fin", value: 2 },
  { label: "Moyen", value: 4 },
  { label: "Large", value: 7 },
] as const;

interface LiveWhiteboardPanelProps {
  expanded: boolean;
  strokes: LiveWhiteboardStroke[];
  localIdentity: string;
  onStrokeComplete: (stroke: LiveWhiteboardStroke) => void;
  onClear: () => void;
}

export default function LiveWhiteboardPanel({
  expanded,
  strokes,
  localIdentity,
  onStrokeComplete,
  onClear,
}: LiveWhiteboardPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDrawingRef = useRef(false);
  const currentPointsRef = useRef<Array<{ x: number; y: number }>>([]);
  const [selectedColor, setSelectedColor] = useState<string>("#05C2A5");
  const [selectedWidth, setSelectedWidth] = useState<number>(3);

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
    const clientX = "touches" in event ? (event.touches[0]?.clientX ?? 0) : event.clientX;
    const clientY = "touches" in event ? (event.touches[0]?.clientY ?? 0) : event.clientY;
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
    context.strokeStyle = selectedColor;
    context.lineWidth = selectedWidth;
    context.lineCap = "round";
    context.lineJoin = "round";
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

    const normalizedPoints = points.map((point) => normalizeCanvasPoint(point.x, point.y, canvas.width, canvas.height));
    onStrokeComplete({
      id: createWhiteboardStrokeId(localIdentity),
      tool: "draw",
      color: selectedColor,
      width: selectedWidth,
      points: normalizedPoints,
    });
  };

  return (
    <div className={`flex h-full flex-col ${expanded ? "min-h-[min(72dvh,780px)]" : "min-h-[320px]"}`}>
      {/* Palette d'outils du tableau */}
      <div className="mb-2.5 flex items-center justify-between gap-2 rounded-xl border border-white/5 bg-zinc-900/80 px-3 py-2">
        <div className="flex items-center gap-1.5" aria-label="Couleur du tracé">
          {AVAILABLE_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setSelectedColor(c.value)}
              title={c.label}
              aria-label={c.label}
              className={`h-5 w-5 rounded-full transition-transform ${
                selectedColor === c.value ? "scale-125 ring-2 ring-white ring-offset-1 ring-offset-zinc-900" : "opacity-80 hover:opacity-100"
              }`}
              style={{ backgroundColor: c.value }}
            />
          ))}
        </div>

        <div className="flex items-center gap-1 border-l border-white/10 pl-2">
          {AVAILABLE_WIDTHS.map((w) => (
            <button
              key={w.value}
              type="button"
              onClick={() => setSelectedWidth(w.value)}
              className={`rounded-lg px-2 py-1 text-[10px] font-bold transition-colors ${
                selectedWidth === w.value
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden rounded-2xl border border-white/10 bg-[#eef2ff] shadow-inner"
      >
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

      <button
        type="button"
        onClick={() => onClear()}
        className="mt-3 w-full rounded-xl border border-red-500/20 bg-red-500/10 py-2.5 text-xs font-bold text-red-300 transition hover:bg-red-500/20"
      >
        Nettoyer mon tableau
      </button>
    </div>
  );
}
