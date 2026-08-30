/**
 * DeepSeek Harness - Session & Scratchpad Context Manager
 * Enforces task isolation, persistent state tracking, and scratchpad memory.
 * MIT License
 */

import { HarnessSession, HarnessPlan, ModelMessage } from '../types';
import { harnessEventBus } from '../events/HarnessEventBus';

export class HarnessSessionManager {
  private static instance: HarnessSessionManager;
  private sessions: Map<string, HarnessSession> = new Map();
  private activeSessionId: string = 'default-session';

  private constructor() {
    this.getOrCreateSession(this.activeSessionId, 'Main Session');
  }

  public static getInstance(): HarnessSessionManager {
    if (!HarnessSessionManager.instance) {
      HarnessSessionManager.instance = new HarnessSessionManager();
    }
    return HarnessSessionManager.instance;
  }

  /**
   * Retrieve existing session or create a new isolated session.
   */
  public getOrCreateSession(id: string, title?: string): HarnessSession {
    if (this.sessions.has(id)) {
      return this.sessions.get(id)!;
    }

    const session: HarnessSession = {
      id,
      title: title || `Task Session ${new Date().toLocaleTimeString()}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      scratchpad: new Map(),
      pluginStates: new Map(),
      history: [],
      executionLogs: [],
    };

    this.sessions.set(id, session);
    harnessEventBus.emit('session.created', { sessionId: id, title: session.title });
    return session;
  }

  /**
   * Set active session ID.
   */
  public setActiveSession(id: string): HarnessSession {
    const session = this.getOrCreateSession(id);
    this.activeSessionId = id;
    return session;
  }

  /**
   * Get active session.
   */
  public getActiveSession(): HarnessSession {
    return this.getOrCreateSession(this.activeSessionId);
  }

  /**
   * Update active task objective and plan in session.
   */
  public setSessionObjective(sessionId: string, objective: string, plan?: HarnessPlan): void {
    const session = this.getOrCreateSession(sessionId);
    session.currentObjective = objective;
    session.activePlan = plan;
    session.updatedAt = Date.now();
    harnessEventBus.emit('session.updated', { sessionId, objective, planId: plan?.id });
  }

  /**
   * Append a message to the session dialogue history.
   */
  public addMessage(sessionId: string, message: ModelMessage): void {
    const session = this.getOrCreateSession(sessionId);
    session.history.push(message);
    session.updatedAt = Date.now();

    // Cap history size to prevent memory bloat
    if (session.history.length > 100) {
      session.history = session.history.slice(-100);
    }
  }

  /**
   * Log an execution event in the session journal.
   */
  public logExecution(
    sessionId: string,
    action: string,
    status: 'success' | 'warning' | 'error',
    details: any,
    stepId?: string
  ): void {
    const session = this.getOrCreateSession(sessionId);
    session.executionLogs.push({
      timestamp: Date.now(),
      stepId,
      action,
      status,
      details,
    });
    session.updatedAt = Date.now();

    if (session.executionLogs.length > 200) {
      session.executionLogs.shift();
    }
  }

  /**
   * Clear session history and scratchpad.
   */
  public clearSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.scratchpad.clear();
      session.history = [];
      session.executionLogs = [];
      session.currentObjective = undefined;
      session.activePlan = undefined;
      session.updatedAt = Date.now();
      harnessEventBus.emit('session.cleared', { sessionId });
    }
  }

  /**
   * Delete a session completely.
   */
  public deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * List all stored sessions.
   */
  public getAllSessions(): HarnessSession[] {
    return Array.from(this.sessions.values());
  }
}

export const harnessSessionManager = HarnessSessionManager.getInstance();
