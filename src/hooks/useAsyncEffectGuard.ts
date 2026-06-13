import { useCallback, useEffect, useRef } from "react";

export interface AsyncRequestToken {
  readonly requestId: number;
  isActive(): boolean;
}

/** Tracks mount state and invalidates in-flight async work on unmount or superseding requests. */
export function useAsyncEffectGuard() {
  const mountedRef = useRef(true);
  const seqRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      seqRef.current += 1;
    };
  }, []);

  const startRequest = useCallback((): AsyncRequestToken => {
    seqRef.current += 1;
    const requestId = seqRef.current;
    return {
      requestId,
      isActive: () => mountedRef.current && seqRef.current === requestId,
    };
  }, []);

  return { startRequest };
}
