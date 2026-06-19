import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";

export interface FloatingPoint {
  x: number;
  y: number;
}

const DRAG_CLICK_THRESHOLD_PX = 6;
const VIEWPORT_MARGIN_PX = 8;
const CONTROL_SIZE_PX = 24;

function readStoredPosition(storageKey: string): FloatingPoint | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FloatingPoint>;
    if (typeof parsed.x !== "number" || typeof parsed.y !== "number") return null;
    if (!Number.isFinite(parsed.x) || !Number.isFinite(parsed.y)) return null;
    return { x: parsed.x, y: parsed.y };
  } catch {
    return null;
  }
}

export function clampFloatingControlPosition(
  point: FloatingPoint,
  viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1280,
  viewportHeight = typeof window !== "undefined" ? window.innerHeight : 720,
  controlSize = CONTROL_SIZE_PX,
  margin = VIEWPORT_MARGIN_PX,
): FloatingPoint {
  const maxX = Math.max(margin, viewportWidth - controlSize - margin);
  const maxY = Math.max(margin, viewportHeight - controlSize - margin);
  return {
    x: Math.min(Math.max(margin, point.x), maxX),
    y: Math.min(Math.max(margin, point.y), maxY),
  };
}

export function useDraggableFloatingControl(storageKey: string, defaultPosition: FloatingPoint) {
  const [position, setPosition] = useState<FloatingPoint>(() => {
    const stored = readStoredPosition(storageKey);
    return clampFloatingControlPosition(stored ?? defaultPosition);
  });

  const dragRef = useRef({
    active: false,
    moved: false,
    pointerId: -1,
    startClientX: 0,
    startClientY: 0,
    originX: 0,
    originY: 0,
  });

  const persistPosition = useCallback(
    (next: FloatingPoint) => {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    },
    [storageKey],
  );

  useEffect(() => {
    const stored = readStoredPosition(storageKey);
    setPosition(clampFloatingControlPosition(stored ?? defaultPosition));
  }, [defaultPosition.x, defaultPosition.y, storageKey]);

  useEffect(() => {
    const handleResize = () => {
      setPosition((current) => clampFloatingControlPosition(current));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    dragRef.current = {
      active: true,
      moved: false,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      originX: position.x,
      originY: position.y,
    };
  }, [position.x, position.y]);

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag.active || event.pointerId !== drag.pointerId) return;

    const deltaX = event.clientX - drag.startClientX;
    const deltaY = event.clientY - drag.startClientY;
    if (!drag.moved && Math.hypot(deltaX, deltaY) >= DRAG_CLICK_THRESHOLD_PX) {
      drag.moved = true;
    }
    if (!drag.moved) return;

    const next = clampFloatingControlPosition({
      x: drag.originX + deltaX,
      y: drag.originY + deltaY,
    });
    setPosition(next);
  }, []);

  const finishDrag = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const drag = dragRef.current;
      if (!drag.active || event.pointerId !== drag.pointerId) return;

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      drag.active = false;
      if (drag.moved) {
        setPosition((current) => {
          const clamped = clampFloatingControlPosition(current);
          persistPosition(clamped);
          return clamped;
        });
      }
    },
    [persistPosition],
  );

  const consumeDragClick = useCallback(() => {
    const moved = dragRef.current.moved;
    dragRef.current.moved = false;
    return moved;
  }, []);

  const style: CSSProperties = {
    left: `${position.x}px`,
    top: `${position.y}px`,
  };

  return {
    style,
    pointerHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finishDrag,
      onPointerCancel: finishDrag,
    },
    consumeDragClick,
  };
}
