import { useState, useEffect } from 'react';
import { frameRateEngine, FrameRateMetrics } from '@/lib/performance/FrameRateEngine';

export interface PerformanceStats {
  fps: number;
  detectedHz: number;
  targetFPS: number;
  frameTimeMs: number;
  targetFrameBudgetMs: number;
  droppedFramesCount: number;
  longTasksCount: number;
  jitterMs: number;
  isHighRefreshRate: boolean;
  isLowResource: boolean;
  isTabInactive: boolean;
  isBatterySaving: boolean;
  deviceMemoryGB?: number;
  hardwareConcurrency?: number;
  networkEffectiveType?: string;
  shouldPauseHeavyAnimations: boolean;
}

/**
 * Hook to continuously monitor system performance (FPS up to 144+ Hz, frame time in ms,
 * dropped frames, memory, hardware threads, page visibility, battery status, and window focus)
 * to dynamically throttle heavy animations and conserve CPU/GPU during intensive tasks.
 */
export function useSystemPerformance(): PerformanceStats {
  const [metrics, setMetrics] = useState<FrameRateMetrics>(() => frameRateEngine.getMetrics());
  const [isLowResource, setIsLowResource] = useState<boolean>(false);
  const [isTabInactive, setIsTabInactive] = useState<boolean>(false);
  const [isBatterySaving, setIsBatterySaving] = useState<boolean>(false);
  const [deviceMemoryGB, setDeviceMemoryGB] = useState<number | undefined>(undefined);
  const [hardwareConcurrency, setHardwareConcurrency] = useState<number | undefined>(undefined);
  const [networkEffectiveType, setNetworkEffectiveType] = useState<string | undefined>(undefined);

  // 1. Subscribe to centralized FrameRateEngine
  useEffect(() => {
    const unsubscribe = frameRateEngine.addListener((newMetrics) => {
      setMetrics(newMetrics);
      if (newMetrics.currentFPS < 26 && !document.hidden) {
        setIsLowResource(true);
      } else if (newMetrics.currentFPS >= 50 && (!deviceMemoryGB || deviceMemoryGB >= 4)) {
        setIsLowResource(false);
      }
    });
    return unsubscribe;
  }, [deviceMemoryGB]);

  // 2. Monitor Page Visibility and Window Focus
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleVisibility = () => {
      const inactive = document.hidden;
      setIsTabInactive(inactive);
    };

    const handleBlur = () => {
      setIsTabInactive(true);
    };

    const handleFocus = () => {
      if (!document.hidden) {
        setIsTabInactive(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    setIsTabInactive(document.hidden);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // 3. Hardware and Device Memory Check
  useEffect(() => {
    if (typeof navigator === 'undefined') return;

    const nav = navigator as any;
    if (nav.deviceMemory) {
      setDeviceMemoryGB(nav.deviceMemory);
      if (nav.deviceMemory < 4) {
        setIsLowResource(true);
      }
    }
    if (nav.hardwareConcurrency) {
      setHardwareConcurrency(nav.hardwareConcurrency);
      if (nav.hardwareConcurrency <= 2) {
        setIsLowResource(true);
      }
    }
    if (nav.connection?.effectiveType) {
      setNetworkEffectiveType(nav.connection.effectiveType);
    }

    // Battery API check (if supported)
    if (typeof nav.getBattery === 'function') {
      nav.getBattery().then((battery: any) => {
        const updateBattery = () => {
          if (!battery.charging && battery.level < 0.2) {
            setIsBatterySaving(true);
          } else {
            setIsBatterySaving(false);
          }
        };
        updateBattery();
        battery.addEventListener('levelchange', updateBattery);
        battery.addEventListener('chargingchange', updateBattery);
      }).catch(() => {});
    }
  }, []);

  const shouldPauseHeavyAnimations = isTabInactive || isLowResource || isBatterySaving;

  return {
    fps: metrics.currentFPS,
    detectedHz: metrics.detectedHz,
    targetFPS: metrics.targetFPS,
    frameTimeMs: metrics.frameTimeMs,
    targetFrameBudgetMs: metrics.targetFrameBudgetMs,
    droppedFramesCount: metrics.droppedFramesCount,
    longTasksCount: metrics.longTasksCount,
    jitterMs: metrics.jitterMs,
    isHighRefreshRate: metrics.isHighRefreshRate,
    isLowResource,
    isTabInactive,
    isBatterySaving,
    deviceMemoryGB,
    hardwareConcurrency,
    networkEffectiveType,
    shouldPauseHeavyAnimations,
  };
}
