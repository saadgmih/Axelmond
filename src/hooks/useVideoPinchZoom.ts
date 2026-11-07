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
  videoRef,
  enabled = true,
  minScale = 1,
  maxScale = 5,
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
    isInteractingRef.current = false;
    setIsInteracting(false);
    touchMovedRef.current = false;
    lastGestureEndTimeRef.current = 0;
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
      if (!rect.width || !rect.height) return { x: 0, y: 0 };
      if (currentScale <= 1.02) return { x: 0, y: 0 };

      // Calculate actual rendered video dimensions inside the container (accounting for letterbox/pillarbox)
      const video = videoRef?.current;
      let displayWidth = rect.width;
      let displayHeight = rect.height;

      if (video && video.videoWidth && video.videoHeight && rect.width && rect.height) {
        const videoAspect = video.videoWidth / video.videoHeight;
        const containerAspect = rect.width / rect.height;
        if (videoAspect > containerAspect) {
          // Video is letterboxed (bars on top/bottom)
          displayWidth = rect.width;
          displayHeight = rect.width / videoAspect;
        } else {
          // Video is pillarboxed (bars on left/right)
          displayHeight = rect.height;
          displayWidth = rect.height * videoAspect;
        }
      }

      // Exact YouTube bounds: the zoomed video edges CANNOT exceed or cross inside the container
      // maxPan is strictly the margin between scaled video edge and container edge
      const maxPanX = Math.max(0, (displayWidth * (currentScale - 1)) / 2);
      const maxPanY = Math.max(0, (displayHeight * (currentScale - 1)) / 2);

      return {
        x: Math.min(maxPanX, Math.max(-maxPanX, targetX)),
        y: Math.min(maxPanY, Math.max(-maxPanY, targetY)),
      };
    };

    const handleTouchStart = (e: TouchEvent) => {
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
        // 2-finger pinch start (YouTube style focal point tracking)
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
        // 1-finger panning while zoomed in (gauche, droite, haut, bas, milieu)
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
        // 2-finger pinch zoom with true focal point tracking
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

          const rect = container.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;

          // Focal point offset relative to container center
          const focalOffsetX = initialMidpointRef.current.x - centerX;
          const focalOffsetY = initialMidpointRef.current.y - centerY;

          // Exact focal point compensation: anchors the zoom to where the user's fingers are
          const scaleGrowth = newScale / Math.max(0.01, startScaleRef.current);
          const focalShiftX = focalOffsetX * (1 - scaleGrowth);
          const focalShiftY = focalOffsetY * (1 - scaleGrowth);

          // Real-time finger movement across screen (pan with 2 fingers)
          const deltaX = currentMidX - initialMidpointRef.current.x;
          const deltaY = currentMidY - initialMidpointRef.current.y;

          const rawPanX = startPanRef.current.x + deltaX + focalShiftX;
          const rawPanY = startPanRef.current.y + deltaY + focalShiftY;
          const boundedPan = clampPan(rawPanX, rawPanY, newScale);

          scaleRef.current = newScale;
          panRef.current = boundedPan;
          setScale(newScale);
          setPan(boundedPan);
          touchMovedRef.current = true;
          triggerIndicatorTemporarily();
        }
      } else if (e.touches.length === 1 && isInteractingRef.current && scaleRef.current > 1.05) {
        // 1-finger panning when zoomed in (free dynamic travel in all directions)
        const deltaX = e.touches[0].clientX - startTouchPointRef.current.x;
        const deltaY = e.touches[0].clientY - startTouchPointRef.current.y;

        if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
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
        // Always reset gesture motion flags so subsequent taps/clicks work immediately
        touchMovedRef.current = false;
        isInteractingRef.current = false;
        setIsInteracting(false);

        // Snap back if scale was pinched under threshold or near 1
        if (scaleRef.current < 1.08) {
          resetZoom();
        } else {
          // Keep zoomed scale, ensure strictly within bounds
          const currentScale = Math.min(maxScale, Math.max(minScale, scaleRef.current));
          const boundedPan = clampPan(panRef.current.x, panRef.current.y, currentScale);
          scaleRef.current = currentScale;
          panRef.current = boundedPan;
          setScale(currentScale);
          setPan(boundedPan);
          triggerIndicatorTemporarily();
        }
      } else if (e.touches.length === 1) {
        // Smooth transition from 2 fingers to 1 finger
        startTouchPointRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
        startPanRef.current = { ...panRef.current };
      }
    };

    // Desktop mouse drag panning when zoomed in
    let isMouseDown = false;
    let startMousePoint = { x: 0, y: 0 };
    let startMousePan = { x: 0, y: 0 };

    const handleMouseDown = (e: MouseEvent) => {
      if (scaleRef.current <= 1.05) return;
      if (e.button !== 0) return;
      const target = e.target as HTMLElement | null;
      if (
        target?.closest(".course-video-controls") ||
        target?.closest(".group\\/settings") ||
        target?.closest("button") ||
        target?.closest("input")
      ) {
        return;
      }
      isMouseDown = true;
      isInteractingRef.current = true;
      setIsInteracting(true);
      touchMovedRef.current = false;
      startMousePoint = { x: e.clientX, y: e.clientY };
      startMousePan = { ...panRef.current };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isMouseDown || scaleRef.current <= 1.05) return;
      const deltaX = e.clientX - startMousePoint.x;
      const deltaY = e.clientY - startMousePoint.y;
      if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
        touchMovedRef.current = true;
        const rawPanX = startMousePan.x + deltaX;
        const rawPanY = startMousePan.y + deltaY;
        const boundedPan = clampPan(rawPanX, rawPanY, scaleRef.current);
        panRef.current = boundedPan;
        setPan(boundedPan);
      }
    };

    const handleMouseUp = () => {
      if (!isMouseDown) return;
      isMouseDown = false;
      isInteractingRef.current = false;
      setIsInteracting(false);
      if (touchMovedRef.current) {
        lastGestureEndTimeRef.current = Date.now();
      }
      touchMovedRef.current = false;
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
    container.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    container.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
      container.removeEventListener("touchcancel", handleTouchEnd);
      container.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      container.removeEventListener("wheel", handleWheel);
      if (indicatorTimeoutRef.current) {
        window.clearTimeout(indicatorTimeoutRef.current);
      }
    };
  }, [containerRef, enabled, minScale, maxScale, resetZoom, triggerIndicatorTemporarily]);

  const isZoomed = scale > 1.05;

  const zoomStyle: CSSProperties = {
    transform: `translate3d(${pan.x}px, ${pan.y}px, 0px) scale3d(${scale}, ${scale}, 1)`,
    transformOrigin: "center center",
    transition: isInteracting ? "none" : "transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
    imageRendering: isZoomed ? "-webkit-optimize-contrast" : "auto",
    WebkitBackfaceVisibility: "hidden",
    backfaceVisibility: "hidden",
    transformStyle: "preserve-3d",
    cursor: isZoomed ? (isInteracting ? "grabbing" : "grab") : "default",
    willChange: isInteracting ? "transform" : "auto",
  };

  const wasJustZoomGesturing = useCallback(() => {
    return isInteractingRef.current || Date.now() - lastGestureEndTimeRef.current < 260;
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
