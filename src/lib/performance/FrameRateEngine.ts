/**
 * FrameRateEngine - High-Precision 144Hz & High-Refresh-Rate Performance Core
 * 
 * Features:
 * - Real hardware display refresh rate detection (60Hz, 75Hz, 90Hz, 120Hz, 144Hz, 165Hz, 240Hz)
 * - Actual timestamp delta measurement (target 6.94ms per frame at 144 FPS)
 * - Centralized RAF animation coordinator (single loop for all subscribers)
 * - Long task monitoring (PerformanceObserver) & dropped frame tracker
 * - Memory & hardware diagnostic metrics without mock/faked values
 */

export interface FrameRateMetrics {
  detectedHz: number;
  targetFPS: number;
  currentFPS: number;
  frameTimeMs: number;
  targetFrameBudgetMs: number;
  droppedFramesCount: number;
  longTasksCount: number;
  lastLongTaskDurationMs: number;
  jitterMs: number;
  isHighRefreshRate: boolean;
  memoryUsedMB?: number;
  memoryTotalMB?: number;
}

type AnimationCallback = (deltaMs: number, timestamp: number) => void;

class FrameRateEngine {
  private static instance: FrameRateEngine;

  private detectedHz = 60;
  private targetFPS = 144;
  private currentFPS = 60;
  private frameTimeMs = 16.67;
  private targetFrameBudgetMs = 6.94;
  private droppedFramesCount = 0;
  private longTasksCount = 0;
  private lastLongTaskDurationMs = 0;
  private jitterMs = 0;

  // Single centralized RAF loop subscribers
  private subscribers = new Set<AnimationCallback>();
  private globalRafId: number | null = null;
  private lastFrameTimestamp = 0;
  private frameTimesBuffer: number[] = [];
  private fpsBuffer: number[] = [];
  private frameCount = 0;
  private lastFpsSampleTime = 0;

  // Hardware detection state
  private isDetectingHz = true;
  private hzSampleDeltas: number[] = [];

  // Observers
  private longTaskObserver: PerformanceObserver | null = null;
  private listeners = new Set<(metrics: FrameRateMetrics) => void>();

  private constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  public static getInstance(): FrameRateEngine {
    if (!FrameRateEngine.instance) {
      FrameRateEngine.instance = new FrameRateEngine();
    }
    return FrameRateEngine.instance;
  }

  private init() {
    this.lastFrameTimestamp = performance.now();
    this.lastFpsSampleTime = performance.now();

    // 1. Detect Screen refresh rate via high-res RAF timing
    this.detectHardwareRefreshRate();

    // 2. Setup Long Task PerformanceObserver
    this.setupLongTaskObserver();

    // 3. Tab visibility handling
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.stopCentralLoop();
      } else {
        this.lastFrameTimestamp = performance.now();
        this.startCentralLoop();
      }
    });

    // 4. Start Central RAF Loop
    this.startCentralLoop();
  }

  /**
   * Samples 40 consecutive frames to mathematically detect the hardware display refresh rate
   */
  private detectHardwareRefreshRate() {
    let samples = 0;
    const maxSamples = 45;
    let prevTime = performance.now();

    const sampleFrame = (now: number) => {
      const delta = now - prevTime;
      prevTime = now;

      if (samples > 2 && delta > 2 && delta < 50) {
        this.hzSampleDeltas.push(delta);
      }
      samples++;

      if (samples < maxSamples) {
        requestAnimationFrame(sampleFrame);
      } else {
        // Calculate median delta
        this.hzSampleDeltas.sort((a, b) => a - b);
        const medianDelta = this.hzSampleDeltas[Math.floor(this.hzSampleDeltas.length / 2)] || 16.67;
        const calculatedHz = Math.round(1000 / medianDelta);

        // Snap to standard monitor refresh rates
        let detected = 60;
        if (calculatedHz >= 220) detected = 240;
        else if (calculatedHz >= 155) detected = 165;
        else if (calculatedHz >= 135) detected = 144;
        else if (calculatedHz >= 110) detected = 120;
        else if (calculatedHz >= 82) detected = 90;
        else if (calculatedHz >= 70) detected = 75;
        else detected = 60;

        this.detectedHz = detected;
        // Default target FPS adapts to display or 144 if supported
        this.targetFPS = detected >= 144 ? 144 : detected;
        this.targetFrameBudgetMs = +(1000 / this.targetFPS).toFixed(2);
        this.isDetectingHz = false;
        this.notifyListeners();
      }
    };

    requestAnimationFrame(sampleFrame);
  }

  private setupLongTaskObserver() {
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        const supportedTypes = PerformanceObserver.supportedEntryTypes || [];
        if (supportedTypes.includes('longtask')) {
          this.longTaskObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              this.longTasksCount++;
              this.lastLongTaskDurationMs = Math.round(entry.duration);
              this.droppedFramesCount += Math.max(1, Math.floor(entry.duration / this.targetFrameBudgetMs));
            }
            this.notifyListeners();
          });
          this.longTaskObserver.observe({ entryTypes: ['longtask'] });
        }
      } catch {
        // Ignored if unsupported in certain iframe sandboxes
      }
    }
  }

  private startCentralLoop() {
    if (this.globalRafId !== null) return;

    const tick = (now: number) => {
      const deltaMs = Math.max(0.1, now - this.lastFrameTimestamp);
      this.lastFrameTimestamp = now;
      this.frameCount++;

      // Track frame times
      this.frameTimeMs = +deltaMs.toFixed(2);
      this.frameTimesBuffer.push(deltaMs);
      if (this.frameTimesBuffer.length > 30) {
        this.frameTimesBuffer.shift();
      }

      // Check dropped frames (delta took > 1.6x expected budget)
      const expectedBudget = 1000 / (this.targetFPS || 60);
      if (deltaMs > expectedBudget * 1.6 && !document.hidden) {
        this.droppedFramesCount++;
      }

      // Compute rolling FPS every 300ms for stable, accurate telemetry
      const elapsedSample = now - this.lastFpsSampleTime;
      if (elapsedSample >= 300) {
        const measuredFps = Math.round((this.frameCount * 1000) / elapsedSample);
        this.currentFPS = Math.min(240, measuredFps);
        this.fpsBuffer.push(this.currentFPS);
        if (this.fpsBuffer.length > 10) this.fpsBuffer.shift();

        // Calculate jitter (standard deviation of frame times)
        if (this.frameTimesBuffer.length > 2) {
          const mean = this.frameTimesBuffer.reduce((a, b) => a + b, 0) / this.frameTimesBuffer.length;
          const variance = this.frameTimesBuffer.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / this.frameTimesBuffer.length;
          this.jitterMs = +Math.sqrt(variance).toFixed(2);
        }

        this.frameCount = 0;
        this.lastFpsSampleTime = now;
        this.notifyListeners();
      }

      // Dispatch to all subscribers
      for (const sub of this.subscribers) {
        try {
          sub(deltaMs, now);
        } catch (err) {
          console.error('[FrameRateEngine] Subscriber error:', err);
        }
      }

      this.globalRafId = requestAnimationFrame(tick);
    };

    this.globalRafId = requestAnimationFrame(tick);
  }

  private stopCentralLoop() {
    if (this.globalRafId !== null) {
      cancelAnimationFrame(this.globalRafId);
      this.globalRafId = null;
    }
  }

  /**
   * Subscribe an animation callback to run on the centralized frame ticker
   */
  public subscribe(callback: AnimationCallback): () => void {
    this.subscribers.add(callback);
    if (this.globalRafId === null && !document.hidden) {
      this.startCentralLoop();
    }
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Set custom target FPS (60, 75, 90, 120, 144, 240)
   */
  public setTargetFPS(fps: number) {
    this.targetFPS = fps;
    this.targetFrameBudgetMs = +(1000 / fps).toFixed(2);
    this.notifyListeners();
  }

  public getMetrics(): FrameRateMetrics {
    let memoryUsedMB: number | undefined;
    let memoryTotalMB: number | undefined;

    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const mem = (performance as any).memory;
      memoryUsedMB = Math.round(mem.usedJSHeapSize / (1024 * 1024));
      memoryTotalMB = Math.round(mem.totalJSHeapSize / (1024 * 1024));
    }

    return {
      detectedHz: this.detectedHz,
      targetFPS: this.targetFPS,
      currentFPS: this.currentFPS,
      frameTimeMs: this.frameTimeMs,
      targetFrameBudgetMs: this.targetFrameBudgetMs,
      droppedFramesCount: this.droppedFramesCount,
      longTasksCount: this.longTasksCount,
      lastLongTaskDurationMs: this.lastLongTaskDurationMs,
      jitterMs: this.jitterMs,
      isHighRefreshRate: this.detectedHz >= 90,
      memoryUsedMB,
      memoryTotalMB,
    };
  }

  public addListener(listener: (metrics: FrameRateMetrics) => void): () => void {
    this.listeners.add(listener);
    listener(this.getMetrics());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    const metrics = this.getMetrics();
    for (const listener of this.listeners) {
      listener(metrics);
    }
  }

  public resetStats() {
    this.droppedFramesCount = 0;
    this.longTasksCount = 0;
    this.lastLongTaskDurationMs = 0;
    this.notifyListeners();
  }
}

export const frameRateEngine = FrameRateEngine.getInstance();
