/**
 * PhaseScheduler - Inspired by Vercel Labs Phase
 * 
 * Slices rendering work into deterministic execution phases:
 * 1. READ phase (DOM rects, scroll positions, compute dimensions)
 * 2. WRITE phase (DOM style updates, class mutations, state updates)
 * 3. DEFERRED / IDLE phase (background caches, telemetry, heavy parsing)
 * 
 * Prevents Layout Thrashing (interleaved DOM reads & writes) and guarantees
 * frames stay within the 6.94ms (144Hz) / 8.33ms (120Hz) / 16.6ms (60Hz) budget.
 */

type Task = () => void;

class PhaseScheduler {
  private static instance: PhaseScheduler;

  private readQueue: Task[] = [];
  private writeQueue: Task[] = [];
  private idleQueue: Task[] = [];
  private isScheduled = false;
  private currentFrameBudgetMs = 6.94; // 144 FPS target

  private constructor() {}

  public static getInstance(): PhaseScheduler {
    if (!PhaseScheduler.instance) {
      PhaseScheduler.instance = new PhaseScheduler();
    }
    return PhaseScheduler.instance;
  }

  /**
   * Set target budget according to detected monitor refresh rate
   */
  public setFrameBudget(budgetMs: number) {
    this.currentFrameBudgetMs = budgetMs;
  }

  /**
   * Queue a DOM read operation (getBoundingClientRect, offsetTop, scrollLeft, etc.)
   */
  public read(task: Task): void {
    this.readQueue.push(task);
    this.scheduleFlush();
  }

  /**
   * Queue a DOM write or mutation (element.style.transform, className, innerText)
   */
  public write(task: Task): void {
    this.writeQueue.push(task);
    this.scheduleFlush();
  }

  /**
   * Queue non-critical work to run in requestIdleCallback or next slice
   */
  public defer(task: Task): void {
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => task(), { timeout: 100 });
    } else {
      this.idleQueue.push(task);
      this.scheduleFlush();
    }
  }

  private scheduleFlush(): void {
    if (this.isScheduled) return;
    this.isScheduled = true;

    requestAnimationFrame((timestamp) => {
      this.flush(timestamp);
    });
  }

  private flush(frameStart: number): void {
    this.isScheduled = false;
    const deadline = frameStart + this.currentFrameBudgetMs;

    // 1. Flush all READ tasks together (Batch DOM reads -> zero layout recalculations)
    while (this.readQueue.length > 0) {
      const task = this.readQueue.shift();
      if (task) {
        try {
          task();
        } catch (e) {
          console.error('[PhaseScheduler] Error during READ phase:', e);
        }
      }
    }

    // 2. Flush all WRITE tasks together (Batch DOM mutations -> single reflow)
    while (this.writeQueue.length > 0) {
      const task = this.writeQueue.shift();
      if (task) {
        try {
          task();
        } catch (e) {
          console.error('[PhaseScheduler] Error during WRITE phase:', e);
        }
      }
    }

    // 3. Process IDLE queue if frame time remains
    while (this.idleQueue.length > 0 && performance.now() < deadline) {
      const task = this.idleQueue.shift();
      if (task) {
        try {
          task();
        } catch (e) {
          console.error('[PhaseScheduler] Error during IDLE phase:', e);
        }
      }
    }

    // If leftover idle tasks, schedule next frame
    if (this.idleQueue.length > 0 || this.readQueue.length > 0 || this.writeQueue.length > 0) {
      this.scheduleFlush();
    }
  }
}

export const phaseScheduler = PhaseScheduler.getInstance();
