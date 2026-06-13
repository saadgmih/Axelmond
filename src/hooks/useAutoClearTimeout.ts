import { useCallback, useEffect, useRef } from "react";

/** Clears pending success/error toasts on unmount. */
export function useAutoClearTimeout() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  return useCallback((callback: () => void, delayMs: number) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      callback();
    }, delayMs);
  }, []);
}
