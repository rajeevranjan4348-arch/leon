/**
 * Centralized Request Isolation & Intent Classification Engine
 *
 * Guarantees that every user request (chat, voice, app launcher, tools) receives:
 * 1. A unique Request ID (crypto.randomUUID())
 * 2. An auto-incrementing Request Version
 * 3. An AbortController signal to cancel stale in-flight AI streams / tool executions
 * 4. Strict intent classification (never reuses previous intent)
 * 5. Current request validation before state modification, app launches, or rendering
 */

export type IntentType =
  | "chat"
  | "app_launch"
  | "image_generation"
  | "video_generation"
  | "diagram_generation"
  | "web_search"
  | "file_analysis"
  | "other";

export interface ActiveRequestState {
  requestId: string;
  version: number;
  intent: IntentType;
  signal: AbortSignal;
  userMessage: string;
  timestamp: number;
}

class RequestIsolationEngine {
  private static instance: RequestIsolationEngine;

  private activeRequestId: string | null = null;
  private activeRequestVersion: number = 0;
  private activeController: AbortController | null = null;
  private activeIntent: IntentType = "chat";
  private activeUserMessage: string = "";
  private pendingActionState: any = null;

  private constructor() {}

  public static getInstance(): RequestIsolationEngine {
    if (!RequestIsolationEngine.instance) {
      RequestIsolationEngine.instance = new RequestIsolationEngine();
    }
    return RequestIsolationEngine.instance;
  }

  /**
   * Start a new isolated request.
   * Immediately aborts any previous pending request, increments version, and creates a fresh requestId.
   */
  public startNewRequest(userMessage: string): ActiveRequestState {
    // 1. Abort previous AI stream and async operations
    if (this.activeController) {
      try {
        this.activeController.abort();
      } catch (err) {
        console.warn('[RequestIsolationEngine] Error aborting previous controller:', err);
      }
    }

    // 2. Create fresh AbortController and increment version
    this.activeController = new AbortController();
    this.activeRequestVersion += 1;
    this.activeRequestId = crypto.randomUUID();
    this.activeUserMessage = userMessage;

    // 3. Clear stale pending actions/launcher states
    this.pendingActionState = null;

    // 4. Classify current intent strictly from current message (never reuse previous intent)
    this.activeIntent = this.classifyIntent(userMessage);

    console.log(`[RequestIsolationEngine] Started new request ${this.activeRequestId} (v${this.activeRequestVersion}) for intent: ${this.activeIntent}`);

    return {
      requestId: this.activeRequestId,
      version: this.activeRequestVersion,
      intent: this.activeIntent,
      signal: this.activeController.signal,
      userMessage,
      timestamp: Date.now(),
    };
  }

  /**
   * Classify intent strictly from the current user prompt.
   */
  public classifyIntent(query: string): IntentType {
    if (!query || typeof query !== 'string') return "chat";
    const lower = query.trim().toLowerCase();

    // Diagram generation intent check
    if (
      /\b(diagram|flowchart|mind\s*map|chart\s*of|visualize|sequence\s*diagram|architecture\s*diagram|tree\s*diagram|graph\s*of|population\s*diagram)\b/i.test(lower) ||
      (/\b(make|draw|generate|create|show|build)\b/i.test(lower) && /\b(diagram|flowchart|graph|chart|visualization)\b/i.test(lower))
    ) {
      return "diagram_generation";
    }

    // Explicit App Launching Intent Check (MUST have explicit verb)
    if (
      /^(?:can\s+you\s+|please\s+|could\s+you\s+|i\s+want\s+to\s+|hey\s+rishi\s+|rishi\s+|will\s+you\s+)?(?:open|launch|start|run|bring\s+up|fire\s+up|go\s+to)\s+(?:the\s+|my\s+)?[a-z0-9\s._-]+/i.test(lower) ||
      /\b(open|launch)\s+([a-z0-9._-]+)\s+(?:app|application)?\b/i.test(lower) ||
      /\b(search|play|find)\s+.+?\s+(?:on|in|using|via)\s+([a-z0-9._-]+)\b/i.test(lower)
    ) {
      return "app_launch";
    }

    // Image generation intent check
    if (/\b(generate\s+image|draw\s+a|create\s+a\s+picture|image\s+of|photo\s+of)\b/i.test(lower)) {
      return "image_generation";
    }

    // Video generation intent check
    if (/\b(generate\s+video|create\s+a\s+video|make\s+a\s+video|minimax\s+video|veo\s+video)\b/i.test(lower)) {
      return "video_generation";
    }

    // Web search intent check
    if (/\b(search\s+the\s+web|look\s+up|latest\s+news|google\s+search|current\s+weather|today's\s+score)\b/i.test(lower)) {
      return "web_search";
    }

    // File analysis intent check
    if (/\b(analyze\s+this\s+file|read\s+this\s+pdf|summarize\s+this\s+document|examine\s+attachment)\b/i.test(lower)) {
      return "file_analysis";
    }

    return "chat";
  }

  /**
   * Central validation method: Verifies if a given requestId / version is still the active request.
   * Returns false for stale, overridden, or aborted requests.
   */
  public isCurrentRequest(requestId: string, version?: number): boolean {
    if (!requestId || requestId !== this.activeRequestId) {
      return false;
    }
    if (version !== undefined && version !== this.activeRequestVersion) {
      return false;
    }
    if (this.activeController?.signal.aborted) {
      return false;
    }
    return true;
  }

  /**
   * Get active requestId
   */
  public getActiveRequestId(): string | null {
    return this.activeRequestId;
  }

  /**
   * Get active version
   */
  public getActiveVersion(): number {
    return this.activeRequestVersion;
  }

  /**
   * Get active intent
   */
  public getActiveIntent(): IntentType {
    return this.activeIntent;
  }

  /**
   * Abort current request
   */
  public abortCurrentRequest(): void {
    if (this.activeController) {
      try {
        this.activeController.abort();
      } catch (e) {
        // ignore
      }
    }
    this.activeRequestId = null;
    this.pendingActionState = null;
  }

  /**
   * Clear pending action/launcher state
   */
  public clearPendingState(): void {
    this.pendingActionState = null;
  }

  public setPendingState(state: any): void {
    this.pendingActionState = state;
  }

  public getPendingState(): any {
    return this.pendingActionState;
  }
}

export const requestIsolationEngine = RequestIsolationEngine.getInstance();
