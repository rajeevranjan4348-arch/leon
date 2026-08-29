/**
 * WebVitalsMonitor - Inspired by Google Chrome web-vitals
 * 
 * Internal, zero-overhead Web Vitals & Performance Observer layer.
 * Measures:
 * - INP (Interaction to Next Paint)
 * - LCP (Largest Contentful Paint)
 * - CLS (Cumulative Layout Shift)
 * - FCP (First Contentful Paint)
 * - TTFB (Time to First Byte)
 * - Long Animation Frames (LoAF) & Long Tasks
 * 
 * Fully passive, non-intrusive, zero external calls.
 */

export interface WebVitalsSummary {
  fcp?: number;
  lcp?: number;
  cls: number;
  inp?: number;
  ttfb?: number;
  longTaskCount: number;
  totalLongTaskDurationMs: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

class WebVitalsMonitor {
  private static instance: WebVitalsMonitor;

  private fcp?: number;
  private lcp?: number;
  private cls = 0;
  private inp?: number;
  private ttfb?: number;
  private longTaskCount = 0;
  private totalLongTaskDurationMs = 0;

  private subscribers = new Set<(metrics: WebVitalsSummary) => void>();

  private constructor() {
    if (typeof window !== 'undefined') {
      this.initObservers();
    }
  }

  public static getInstance(): WebVitalsMonitor {
    if (!WebVitalsMonitor.instance) {
      WebVitalsMonitor.instance = new WebVitalsMonitor();
    }
    return WebVitalsMonitor.instance;
  }

  private initObservers(): void {
    // 1. Navigation Timing (TTFB)
    try {
      const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      if (navEntry) {
        this.ttfb = Math.round(navEntry.responseStart - navEntry.requestStart);
      }
    } catch {}

    if (typeof PerformanceObserver === 'undefined') return;

    // 2. FCP (First Contentful Paint)
    try {
      const paintObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            this.fcp = Math.round(entry.startTime);
            this.notify();
          }
        }
      });
      paintObserver.observe({ type: 'paint', buffered: true });
    } catch {}

    // 3. LCP (Largest Contentful Paint)
    try {
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        if (entries.length > 0) {
          const lastEntry = entries[entries.length - 1];
          this.lcp = Math.round(lastEntry.startTime);
          this.notify();
        }
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {}

    // 4. CLS (Cumulative Layout Shift)
    try {
      const clsObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            this.cls += (entry as any).value || 0;
            this.cls = +this.cls.toFixed(3);
            this.notify();
          }
        }
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch {}

    // 5. INP / Event Timing (Interaction to Next Paint)
    try {
      const eventObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          const duration = (entry as any).duration;
          if (duration && (!this.inp || duration > this.inp)) {
            this.inp = Math.round(duration);
            this.notify();
          }
        }
      });
      eventObserver.observe({ type: 'event', buffered: true, durationThreshold: 16 } as any);
    } catch {}

    // 6. Long Tasks
    try {
      const longTaskObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          this.longTaskCount++;
          this.totalLongTaskDurationMs += entry.duration;
          this.notify();
        }
      });
      longTaskObserver.observe({ type: 'longtask', buffered: true });
    } catch {}
  }

  public getSummary(): WebVitalsSummary {
    let rating: 'good' | 'needs-improvement' | 'poor' = 'good';
    if ((this.inp && this.inp > 200) || this.cls > 0.1 || (this.lcp && this.lcp > 2500)) {
      rating = 'needs-improvement';
    }
    if ((this.inp && this.inp > 500) || this.cls > 0.25 || (this.lcp && this.lcp > 4000)) {
      rating = 'poor';
    }

    return {
      fcp: this.fcp,
      lcp: this.lcp,
      cls: this.cls,
      inp: this.inp,
      ttfb: this.ttfb,
      longTaskCount: this.longTaskCount,
      totalLongTaskDurationMs: Math.round(this.totalLongTaskDurationMs),
      rating,
    };
  }

  public subscribe(callback: (summary: WebVitalsSummary) => void): () => void {
    this.subscribers.add(callback);
    callback(this.getSummary());
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notify(): void {
    const summary = this.getSummary();
    for (const sub of this.subscribers) {
      try {
        sub(summary);
      } catch {}
    }
  }
}

export const webVitalsMonitor = WebVitalsMonitor.getInstance();
