import { useEffect, useRef } from "react";
import type { LiveWhiteboardStroke } from "../../live/live-sync";
import { createWhiteboardStrokeId, normalizeCanvasPoint, redrawWhiteboard } from "./live-whiteboard-canvas";

const STROKE_WIDTH = 3;

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
    context.strokeStyle = "#05C2A5";
    context.lineWidth = STROKE_WIDTH;
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

    const normalizedPoints = points.map((point) => normalizeCanvasPoint(point.x, point.y, canvas.width, canvas.height));
    onStrokeComplete({
      id: createWhiteboardStrokeId(localIdentity),
      tool: "draw",
      color: "#05C2A5",
      width: STROKE_WIDTH,
      points: normalizedPoints,
    });
  };

  return (
    <div className={`flex h-full flex-col ${expanded ? "min-h-[min(72dvh,780px)]" : "min-h-[320px]"}`}>
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
