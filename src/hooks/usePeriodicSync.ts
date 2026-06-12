import { useEffect, useRef } from "react";

/**
 * Runs `callback` on an interval when `enabled`. Skips a tick if the previous
 * invocation is still in flight.
 */
export function usePeriodicSync(
  callback: () => void | Promise<void>,
  intervalMs: number,
  enabled: boolean,
) {
  const callbackRef = useRef(callback);
  const inFlightRef = useRef(false);

  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled) return;

    const tick = () => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      void Promise.resolve(callbackRef.current()).finally(() => {
        inFlightRef.current = false;
      });
    };

    const id = window.setInterval(tick, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, enabled]);
}
