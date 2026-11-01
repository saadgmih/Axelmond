import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

interface UseVideoPinchZoomOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  enabled?: boolean;
  minScale?: number;
  maxScale?: number;
}

export function useVideoPinchZoom({
  containerRef,
  videoRef: _videoRef,
  enabled = true,
  minScale = 1,
  maxScale = 4.5,
}: UseVideoPinchZoomOptions) {
  const [scale, setScale] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isInteracting, setIsInteracting] = useState<boolean>(false);
  const [showIndicator, setShowIndicator] = useState<boolean>(false);

  const scaleRef = useRef<number>(1);
  const panRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isInteractingRef = useRef<boolean>(false);
  const indicatorTimeoutRef = useRef<number | null>(null);

  // Gesture tracking refs
  const initialDistanceRef = useRef<number>(0);
  const startScaleRef = useRef<number>(1);
  const startPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialMidpointRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const startTouchPointRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchMovedRef = useRef<boolean>(false);
  const lastGestureEndTimeRef = useRef<number>(0);
  const lastTapTimeRef = useRef<number>(0);

  const triggerIndicatorTemporarily = useCallback(() => {
    setShowIndicator(true);
    if (indicatorTimeoutRef.current) {
      window.clearTimeout(indicatorTimeoutRef.current);
    }
    indicatorTimeoutRef.current = window.setTimeout(() => {
      setShowIndicator(false);
    }, 2400);
  }, []);

  const resetZoom = useCallback(() => {
    scaleRef.current = 1;
    panRef.current = { x: 0, y: 0 };
    setScale(1);
    setPan({ x: 0, y: 0 });
    setIsInteracting(false);
    setShowIndicator(false);
    if (indicatorTimeoutRef.current) {
      window.clearTimeout(indicatorTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    const clampPan = (targetX: number, targetY: number, currentScale: number) => {
      const rect = container.getBoundingClientRect();
      const maxPanX = Math.max(0, (rect.width * (currentScale - 1)) / 2);
      const maxPanY = Math.max(0, (rect.height * (currentScale - 1)) / 2);
      return {
        x: Math.min(maxPanX, Math.max(-maxPanX, targetX)),
        y: Math.min(maxPanY, Math.max(-maxPanY, targetY)),
      };
    };

    const handleTouchStart = (e: TouchEvent) => {
      // Don't intercept touches if user is interacting with controls bar or popovers
      const target = e.target as HTMLElement | null;
      if (
        target?.closest(".course-video-controls") ||
        target?.closest(".group\\/settings") ||
        target?.closest("button") ||
        target?.closest("input")
      ) {
        return;
      }

      if (e.touches.length === 2) {
        // 2-finger pinch start (YouTube style)
        isInteractingRef.current = true;
        setIsInteracting(true);
        touchMovedRef.current = false;

        const t1 = e.touches[0];
        const t2 = e.touches[1];
        initialDistanceRef.current = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        startScaleRef.current = scaleRef.current;
        startPanRef.current = { ...panRef.current };
        initialMidpointRef.current = {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2,
        };
      } else if (e.touches.length === 1 && scaleRef.current > 1.05) {
        // 1-finger panning while zoomed in
        isInteractingRef.current = true;
        setIsInteracting(true);
        touchMovedRef.current = false;
        startTouchPointRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
        startPanRef.current = { ...panRef.current };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && isInteractingRef.current) {
        // 2-finger pinch zoom
        if (e.cancelable) e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const currentDistance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

        if (initialDistanceRef.current > 0) {
          const ratio = currentDistance / initialDistanceRef.current;
          let newScale = startScaleRef.current * ratio;
          newScale = Math.min(maxScale, Math.max(0.85, newScale));

          const currentMidX = (t1.clientX + t2.clientX) / 2;
          const currentMidY = (t1.clientY + t2.clientY) / 2;
          const deltaX = currentMidX - initialMidpointRef.current.x;
          const deltaY = currentMidY - initialMidpointRef.current.y;

          const rawPanX = startPanRef.current.x + deltaX;
          const rawPanY = startPanRef.current.y + deltaY;
          const boundedPan = clampPan(rawPanX, rawPanY, newScale);

          scaleRef.current = newScale;
          panRef.current = boundedPan;
          setScale(newScale);
          setPan(boundedPan);
          touchMovedRef.current = true;
          triggerIndicatorTemporarily();
        }
      } else if (e.touches.length === 1 && isInteractingRef.current && scaleRef.current > 1.05) {
        // 1-finger panning when zoomed in
        const deltaX = e.touches[0].clientX - startTouchPointRef.current.x;
        const deltaY = e.touches[0].clientY - startTouchPointRef.current.y;

        if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
          if (e.cancelable) e.preventDefault();
          touchMovedRef.current = true;
          const rawPanX = startPanRef.current.x + deltaX;
          const rawPanY = startPanRef.current.y + deltaY;
          const boundedPan = clampPan(rawPanX, rawPanY, scaleRef.current);

          panRef.current = boundedPan;
          setPan(boundedPan);
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        if (touchMovedRef.current) {
          lastGestureEndTimeRef.current = Date.now();
        }
        isInteractingRef.current = false;
        setIsInteracting(false);

        // Snap back if scale was pinched under threshold or near 1
        if (scaleRef.current < 1.08) {
          resetZoom();
        } else {
          // Keep zoomed scale, ensure within bounds
          const currentScale = Math.min(maxScale, Math.max(minScale, scaleRef.current));
          const boundedPan = clampPan(panRef.current.x, panRef.current.y, currentScale);
          scaleRef.current = currentScale;
          panRef.current = boundedPan;
          setScale(currentScale);
          setPan(boundedPan);
          triggerIndicatorTemporarily();
        }

        // Double-tap detection to reset zoom when already zoomed in
        if (!touchMovedRef.current && scaleRef.current > 1.05) {
          const now = Date.now();
          if (now - lastTapTimeRef.current < 300) {
            resetZoom();
            lastTapTimeRef.current = 0;
            return;
          }
          lastTapTimeRef.current = now;
        }
      } else if (e.touches.length === 1) {
        // Transition from 2 fingers to 1 finger
        startTouchPointRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
        startPanRef.current = { ...panRef.current };
      }
    };

    // Trackpad pinch gesture support (Wheel with ctrlKey)
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const zoomDelta = -e.deltaY * 0.008;
        const targetScale = Math.min(maxScale, Math.max(1, scaleRef.current + zoomDelta));

        if (targetScale <= 1.02) {
          resetZoom();
        } else {
          const boundedPan = clampPan(panRef.current.x, panRef.current.y, targetScale);
          scaleRef.current = targetScale;
          panRef.current = boundedPan;
          setScale(targetScale);
          setPan(boundedPan);
          triggerIndicatorTemporarily();
        }
      }
    };

    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });
    container.addEventListener("touchcancel", handleTouchEnd, { passive: true });
    container.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
      container.removeEventListener("touchcancel", handleTouchEnd);
      container.removeEventListener("wheel", handleWheel);
      if (indicatorTimeoutRef.current) {
        window.clearTimeout(indicatorTimeoutRef.current);
      }
    };
  }, [containerRef, enabled, minScale, maxScale, resetZoom, triggerIndicatorTemporarily]);

  const isZoomed = scale > 1.05;

  const zoomStyle: CSSProperties = {
    transform: `translate3d(${pan.x}px, ${pan.y}px, 0px) scale(${scale})`,
    transformOrigin: "center center",
    transition: isInteracting ? "none" : "transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
    willChange: "transform",
  };

  const wasJustZoomGesturing = useCallback(() => {
    return touchMovedRef.current || Date.now() - lastGestureEndTimeRef.current < 350;
  }, []);

  return {
    scale,
    isZoomed,
    showIndicator: showIndicator && isZoomed,
    resetZoom,
    zoomStyle,
    wasJustZoomGesturing,
  };
}
