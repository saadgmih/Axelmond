import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";

export type FloatingAnchor = "sidebar" | "topbar";

export interface FloatingPoint {
  x: number;
  y: number;
}

interface NormalizedPoint {
  xRatio: number;
  yRatio: number;
}

const DRAG_CLICK_THRESHOLD_PX = 6;
const VIEWPORT_MARGIN_PX = 8;
const CONTROL_SIZE_PX = 24;

const DEFAULT_RATIOS: Record<FloatingAnchor, NormalizedPoint> = {
  sidebar: { xRatio: 0.03, yRatio: 0.2 },
  topbar: { xRatio: 0.92, yRatio: 0.05 },
};

function getViewportSize() {
  if (typeof window === "undefined") {
    return { width: 1280, height: 720 };
  }
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

export function clampFloatingControlPosition(
  point: FloatingPoint,
  viewportWidth = getViewportSize().width,
  viewportHeight = getViewportSize().height,
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

export function normalizedToFloatingPoint(
  normalized: NormalizedPoint,
  viewportWidth = getViewportSize().width,
  viewportHeight = getViewportSize().height,
  controlSize = CONTROL_SIZE_PX,
  margin = VIEWPORT_MARGIN_PX,
): FloatingPoint {
  const usableWidth = Math.max(controlSize + margin * 2, viewportWidth - controlSize - margin * 2);
  const usableHeight = Math.max(controlSize + margin * 2, viewportHeight - controlSize - margin * 2);
  return clampFloatingControlPosition(
    {
      x: margin + normalized.xRatio * usableWidth,
      y: margin + normalized.yRatio * usableHeight,
    },
    viewportWidth,
    viewportHeight,
    controlSize,
    margin,
  );
}

export function floatingPointToNormalized(
  point: FloatingPoint,
  viewportWidth = getViewportSize().width,
  viewportHeight = getViewportSize().height,
  controlSize = CONTROL_SIZE_PX,
  margin = VIEWPORT_MARGIN_PX,
): NormalizedPoint {
  const usableWidth = Math.max(1, viewportWidth - controlSize - margin * 2);
  const usableHeight = Math.max(1, viewportHeight - controlSize - margin * 2);
  return {
    xRatio: Math.min(1, Math.max(0, (point.x - margin) / usableWidth)),
    yRatio: Math.min(1, Math.max(0, (point.y - margin) / usableHeight)),
  };
}

function readStoredNormalizedPosition(storageKey: string): NormalizedPoint | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as
      | { v?: number; xRatio?: number; yRatio?: number; x?: number; y?: number }
      | null;
    if (!parsed) return null;

    if (parsed.v === 2 && typeof parsed.xRatio === "number" && typeof parsed.yRatio === "number") {
      if (!Number.isFinite(parsed.xRatio) || !Number.isFinite(parsed.yRatio)) return null;
      return {
        xRatio: Math.min(1, Math.max(0, parsed.xRatio)),
        yRatio: Math.min(1, Math.max(0, parsed.yRatio)),
      };
    }

    if (typeof parsed.x === "number" && typeof parsed.y === "number") {
      return floatingPointToNormalized({ x: parsed.x, y: parsed.y });
    }

    return null;
  } catch {
    return null;
  }
}

function resolveInitialPosition(storageKey: string, anchor: FloatingAnchor): FloatingPoint {
  const stored = readStoredNormalizedPosition(storageKey);
  const defaults = DEFAULT_RATIOS[anchor];
  return normalizedToFloatingPoint(stored ?? defaults);
}

export function useDraggableFloatingControl(storageKey: string, anchor: FloatingAnchor) {
  const [position, setPosition] = useState<FloatingPoint>(() => resolveInitialPosition(storageKey, anchor));

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
      const normalized = floatingPointToNormalized(next);
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          v: 2,
          xRatio: normalized.xRatio,
          yRatio: normalized.yRatio,
        }),
      );
    },
    [storageKey],
  );

  const syncPositionToViewport = useCallback(() => {
    const stored = readStoredNormalizedPosition(storageKey);
    const defaults = DEFAULT_RATIOS[anchor];
    setPosition(normalizedToFloatingPoint(stored ?? defaults));
  }, [anchor, storageKey]);

  useEffect(() => {
    syncPositionToViewport();
  }, [syncPositionToViewport]);

  useEffect(() => {
    const handleViewportChange = () => {
      syncPositionToViewport();
    };

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("orientationchange", handleViewportChange);
    window.visualViewport?.addEventListener("resize", handleViewportChange);

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("orientationchange", handleViewportChange);
      window.visualViewport?.removeEventListener("resize", handleViewportChange);
    };
  }, [syncPositionToViewport]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
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
    },
    [position.x, position.y],
  );

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
