import React, { useEffect, useRef, useState, useCallback } from "react";
import type { AnnotationPoint, AnnotationStroke, UniOfficeTool } from "./types";

interface UniOfficeAnnotationLayerProps {
  pageNumber: number;
  contentId?: string;
  width: number;
  height: number;
  tool: UniOfficeTool;
  color: string;
  strokeWidth: number;
  strokes: AnnotationStroke[];
  onUpdateStrokes: (pageNumber: number, strokes: AnnotationStroke[]) => void;
  touchZoomEnabled?: boolean;
}

export const UniOfficeAnnotationLayer: React.FC<UniOfficeAnnotationLayerProps> = ({
  pageNumber,
  width,
  height,
  tool,
  color,
  strokeWidth,
  strokes,
  onUpdateStrokes,
  touchZoomEnabled = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentStroke, setCurrentStroke] = useState<AnnotationStroke | null>(null);
  const isDrawingRef = useRef(false);

  // Redraw canvas with all existing strokes and active in-progress stroke
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || width <= 0 || height <= 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const allStrokes = currentStroke ? [...strokes, currentStroke] : strokes;

    for (const stroke of allStrokes) {
      if (!stroke.points || stroke.points.length < 1) continue;

      ctx.save();
      if (stroke.tool === "highlighter") {
        ctx.globalAlpha = 0.38;
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = Math.max(stroke.width, 14);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      } else {
        ctx.globalAlpha = 0.95;
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = Math.max(stroke.width, 2);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }

      ctx.beginPath();
      const first = stroke.points[0];
      ctx.moveTo(first.x * width, first.y * height);

      if (stroke.points.length === 1) {
        ctx.lineTo(first.x * width + 0.1, first.y * height + 0.1);
      } else {
        for (let i = 1; i < stroke.points.length; i++) {
          const pt = stroke.points[i];
          ctx.lineTo(pt.x * width, pt.y * height);
        }
      }
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }, [width, height, strokes, currentStroke]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // Pointer event handlers for drawing or erasing
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool === "select" || touchZoomEnabled || e.button !== 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;
    const normX = Math.max(0, Math.min(1, rawX / rect.width));
    const normY = Math.max(0, Math.min(1, rawY / rect.height));

    if (tool === "eraser") {
      // Find stroke closest to eraser click
      const eraseThreshold = 20 / width;
      const filtered = strokes.filter((s) => {
        return !s.points.some((p) => Math.hypot(p.x - normX, p.y - normY) < eraseThreshold);
      });
      if (filtered.length !== strokes.length) {
        onUpdateStrokes(pageNumber, filtered);
      }
      return;
    }

    // Start pen or highlighter stroke
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {}

    isDrawingRef.current = true;
    const newStroke: AnnotationStroke = {
      id: `stroke-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      tool: tool === "highlighter" ? "highlighter" : "pen",
      color,
      width: tool === "highlighter" ? Math.max(strokeWidth, 16) : strokeWidth,
      points: [{ x: normX, y: normY }],
    };
    setCurrentStroke(newStroke);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !currentStroke || tool === "select" || tool === "eraser") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;
    const normX = Math.max(0, Math.min(1, rawX / rect.width));
    const normY = Math.max(0, Math.min(1, rawY / rect.height));

    setCurrentStroke((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        points: [...prev.points, { x: normX, y: normY }],
      };
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {}
    }

    if (currentStroke && currentStroke.points.length > 0) {
      const updated = [...strokes, currentStroke];
      onUpdateStrokes(pageNumber, updated);
    }
    setCurrentStroke(null);
  };

  const isInteractive = tool !== "select" && !touchZoomEnabled;

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        touchAction: isInteractive ? "none" : "auto",
      }}
      className={`absolute inset-0 z-15 ${
        isInteractive
          ? tool === "eraser"
            ? "cursor-crosshair pointer-events-auto"
            : tool === "highlighter"
            ? "cursor-cell pointer-events-auto"
            : "cursor-crosshair pointer-events-auto"
          : "pointer-events-none"
      }`}
    />
  );
};

export default UniOfficeAnnotationLayer;
