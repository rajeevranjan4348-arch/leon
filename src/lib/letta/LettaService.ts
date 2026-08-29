import {
  LettaAgentState,
  LettaExecutionResult,
  LettaExecutionStatus,
  ArchivalSearchResult,
  RecallEvent,
  CoreMemory,
} from './types';
import { LettaStore } from './LettaStore';
import { LettaAgentEngine } from './LettaAgentEngine';
import { MultimodalMediaItem } from '../multimodalMediaHandler';

export interface LettaConnectionStatus {
  isRemoteConnected: boolean;
  serverUrl?: string;
  agentId: string;
  activeMode: 'embedded_engine' | 'remote_server';
  lastChecked: string;
}

export class LettaService {
  private static cachedConnectionStatus: LettaConnectionStatus | null = null;
  private static lastCheckTime = 0;

  /**
   * Check connection status to remote Letta server or embedded engine.
   */
  public static async checkStatus(): Promise<LettaConnectionStatus> {
    const now = Date.now();
    if (this.cachedConnectionStatus && (now - this.lastCheckTime) < 30000) {
      return this.cachedConnectionStatus;
    }

    const agentId = LettaStore.getActiveAgentId();
    let isRemoteConnected = false;
    let serverUrl: string | undefined;

    try {
      const res = await fetch('/api/letta/health', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json().catch(() => ({}));
        isRemoteConnected = Boolean(data.connected);
        serverUrl = data.serverUrl;
      }
    } catch {
      isRemoteConnected = false;
    }

    this.cachedConnectionStatus = {
      isRemoteConnected,
      serverUrl,
      agentId,
      activeMode: isRemoteConnected ? 'remote_server' : 'embedded_engine',
      lastChecked: new Date().toISOString(),
    };
    this.lastCheckTime = now;

    return this.cachedConnectionStatus;
  }

  /**
   * Primary entry point to dispatch user queries through the Letta Agent Brain.
   */
  public static async processMessage(
    query: string,
    conversationId: string,
    options?: {
      agentId?: string;
      mode?: 'chat' | 'search' | 'research';
      onStatusUpdate?: (status: LettaExecutionStatus) => void;
      onChunk?: (accumulated: string) => void;
      mediaItems?: MultimodalMediaItem[];
      history?: Array<{ role: 'user' | 'assistant' | 'model'; content: string }>;
      signal?: AbortSignal;
    }
  ): Promise<LettaExecutionResult> {
    const agentId = options?.agentId || LettaStore.getActiveAgentId();

    // Check if remote Letta server endpoint can handle the request
    try {
      const remoteRes = await fetch('/api/letta/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          conversationId,
          agentId,
          mode: options?.mode || 'chat',
        }),
      }).catch(() => null);

      if (remoteRes && remoteRes.ok) {
        const data = await remoteRes.json();
        if (data && data.text) {
          if (options?.onChunk) options.onChunk(data.text);
          return {
            text: data.text,
            agentState: data.agentState || LettaStore.getOrCreateAgent(agentId),
            toolCallsExecuted: data.toolCallsExecuted || [],
            retrievedPassages: data.retrievedPassages || [],
            sources: data.sources || [],
            groundingMetadata: data.groundingMetadata,
          };
        }
      }
    } catch (err) {
      console.info('Letta Remote Server not reached, using Embedded Letta Brain Engine:', err);
    }

    // Execute stateful embedded Letta Agent Engine
    return await LettaAgentEngine.execute(query, conversationId, {
      ...options,
      agentId,
    });
  }

  /**
   * Get active Core Memory blocks for an agent.
   */
  public static getCoreMemory(agentId?: string): CoreMemory {
    const targetId = agentId || LettaStore.getActiveAgentId();
    const agent = LettaStore.getOrCreateAgent(targetId);
    return agent.coreMemory;
  }

  /**
   * Update Core Memory block.
   */
  public static updateCoreMemory(
    blockName: keyof CoreMemory | string,
    value: string,
    agentId?: string
  ): CoreMemory {
    const targetId = agentId || LettaStore.getActiveAgentId();
    return LettaStore.updateCoreMemory(targetId, blockName, value);
  }

  /**
   * Search Archival Passages.
   */
  public static searchArchivalPassages(
    query: string,
    limit = 5,
    agentId?: string
  ): ArchivalSearchResult[] {
    const targetId = agentId || LettaStore.getActiveAgentId();
    return LettaStore.searchArchivalPassages(targetId, query, limit);
  }

  /**
   * Insert a passage into Archival Memory.
   */
  public static insertArchivalPassage(
    content: string,
    tags: string[] = [],
    metadata?: any,
    agentId?: string
  ) {
    const targetId = agentId || LettaStore.getActiveAgentId();
    return LettaStore.insertArchivalPassage(targetId, content, tags, metadata);
  }

  /**
   * Get Recall Events for a conversation or agent.
   */
  public static getRecallEvents(agentId?: string): RecallEvent[] {
    const targetId = agentId || LettaStore.getActiveAgentId();
    return LettaStore.getAllRecallEvents(targetId);
  }

  /**
   * Get Agent State.
   */
  public static getAgentState(agentId?: string): LettaAgentState {
    const targetId = agentId || LettaStore.getActiveAgentId();
    return LettaStore.getOrCreateAgent(targetId);
  }
}
