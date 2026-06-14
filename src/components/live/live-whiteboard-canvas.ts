import type { LiveSyncPoint, LiveWhiteboardStroke } from "../../live/live-sync";

export function normalizeCanvasPoint(x: number, y: number, canvasWidth: number, canvasHeight: number): LiveSyncPoint {
  return {
    x: canvasWidth > 0 ? x / canvasWidth : 0,
    y: canvasHeight > 0 ? y / canvasHeight : 0,
  };
}

export function denormalizeCanvasPoint(point: LiveSyncPoint, canvasWidth: number, canvasHeight: number) {
  return {
    x: point.x * canvasWidth,
    y: point.y * canvasHeight,
  };
}

export function drawStrokeOnCanvas(
  context: CanvasRenderingContext2D,
  stroke: LiveWhiteboardStroke,
  canvasWidth: number,
  canvasHeight: number,
) {
  if (stroke.points.length === 0) return;
  context.strokeStyle = stroke.color;
  context.lineWidth = stroke.width;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  const [firstPoint, ...rest] = stroke.points;
  const start = denormalizeCanvasPoint(firstPoint, canvasWidth, canvasHeight);
  context.moveTo(start.x, start.y);
  for (const point of rest) {
    const next = denormalizeCanvasPoint(point, canvasWidth, canvasHeight);
    context.lineTo(next.x, next.y);
  }
  context.stroke();
}

export function redrawWhiteboard(
  context: CanvasRenderingContext2D,
  strokes: LiveWhiteboardStroke[],
  canvasWidth: number,
  canvasHeight: number,
) {
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, canvasWidth, canvasHeight);
  for (const stroke of strokes) {
    drawStrokeOnCanvas(context, stroke, canvasWidth, canvasHeight);
  }
}

export function createWhiteboardStrokeId(identity: string) {
  return `${identity}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
