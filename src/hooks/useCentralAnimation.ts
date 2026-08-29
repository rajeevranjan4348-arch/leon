import { useEffect, useRef } from 'react';
import { frameRateEngine } from '@/lib/performance/FrameRateEngine';

/**
 * Hook to run an animation step synchronized with the central 144Hz FrameRateEngine.
 * Automatically unsubscribes on unmount or when `enabled` is false.
 */
export function useCentralAnimation(
  callback: (deltaMs: number, timestamp: number) => void,
  enabled = true
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = frameRateEngine.subscribe((deltaMs, timestamp) => {
      callbackRef.current(deltaMs, timestamp);
    });

    return unsubscribe;
  }, [enabled]);
}
