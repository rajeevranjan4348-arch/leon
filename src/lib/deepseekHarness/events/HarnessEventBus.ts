/**
 * DeepSeek Harness - High Throughput Decoupled Event Bus
 * MIT License
 */

import { HarnessEvent, HarnessEventHandler, HarnessEventType } from '../types';

export class HarnessEventBus {
  private static instance: HarnessEventBus;
  private handlers: Map<string, Set<HarnessEventHandler>> = new Map();
  private wildcardHandlers: Set<HarnessEventHandler> = new Set();
  private eventHistory: HarnessEvent[] = [];
  private readonly MAX_HISTORY_SIZE = 200;

  private constructor() {}

  public static getInstance(): HarnessEventBus {
    if (!HarnessEventBus.instance) {
      HarnessEventBus.instance = new HarnessEventBus();
    }
    return HarnessEventBus.instance;
  }

  /**
   * Subscribe to a specific event type or wildcard topic (e.g. 'tool.*', 'agent.*').
   */
  public on<T = any>(
    eventType: HarnessEventType | string,
    handler: HarnessEventHandler<T>
  ): () => void {
    if (eventType === '*' || eventType === '#') {
      this.wildcardHandlers.add(handler);
      return () => this.wildcardHandlers.delete(handler);
    }

    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }

    this.handlers.get(eventType)!.add(handler);

    // Unsubscribe callback
    return () => {
      const set = this.handlers.get(eventType);
      if (set) {
        set.delete(handler);
        if (set.size === 0) {
          this.handlers.delete(eventType);
        }
      }
    };
  }

  /**
   * Subscribe to an event exactly once.
   */
  public once<T = any>(
    eventType: HarnessEventType | string,
    handler: HarnessEventHandler<T>
  ): () => void {
    const unsub = this.on<T>(eventType, (event) => {
      unsub();
      handler(event);
    });
    return unsub;
  }

  /**
   * Emit an event asynchronously across all matching listeners safely.
   */
  public emit<T = any>(
    type: HarnessEventType | string,
    payload: T,
    options: { sessionId?: string; taskId?: string } = {}
  ): HarnessEvent<T> {
    const event: HarnessEvent<T> = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      timestamp: Date.now(),
      sessionId: options.sessionId || 'default',
      taskId: options.taskId,
      payload,
    };

    // Keep ring buffer history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.MAX_HISTORY_SIZE) {
      this.eventHistory.shift();
    }

    // Direct handlers
    const directHandlers = this.handlers.get(type);
    if (directHandlers) {
      directHandlers.forEach((fn) => {
        try {
          const res = fn(event);
          if (res instanceof Promise) {
            res.catch((err) => console.warn(`[HarnessEventBus] Handler error for ${type}:`, err));
          }
        } catch (err) {
          console.warn(`[HarnessEventBus] Sync handler error for ${type}:`, err);
        }
      });
    }

    // Pattern / Wildcard prefix matching (e.g. 'agent.' matches 'agent.step.started')
    this.handlers.forEach((set, pattern) => {
      if (pattern.endsWith('*') && type.startsWith(pattern.slice(0, -1))) {
        set.forEach((fn) => {
          try {
            fn(event);
          } catch (e) {
            console.warn(`[HarnessEventBus] Wildcard error for ${pattern}:`, e);
          }
        });
      }
    });

    // Global wildcard handlers
    this.wildcardHandlers.forEach((fn) => {
      try {
        fn(event);
      } catch (err) {
        console.warn(`[HarnessEventBus] Global handler error:`, err);
      }
    });

    return event;
  }

  /**
   * Retrieve past event history for diagnostics or audit.
   */
  public getHistory(filterType?: string): HarnessEvent[] {
    if (!filterType) return [...this.eventHistory];
    return this.eventHistory.filter((e) => e.type === filterType || e.type.startsWith(filterType));
  }

  /**
   * Clear all event handlers and history (useful for test isolation).
   */
  public clear(): void {
    this.handlers.clear();
    this.wildcardHandlers.clear();
    this.eventHistory = [];
  }
}

export const harnessEventBus = HarnessEventBus.getInstance();
