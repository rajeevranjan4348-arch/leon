/**
 * Letta (formerly MemGPT) Core Architecture Data Types
 * Supports hierarchical OS-like memory:
 * - Core Memory (Human, Persona, Project blocks)
 * - Archival Memory (Indexed semantic passages & documents)
 * - Recall Memory (Full event stream of past conversations)
 * - Agent State & Tool execution definitions
 */

export interface CoreMemoryBlock {
  name: string;
  value: string;
  limit?: number;
  description?: string;
  isReadOnly?: boolean;
}

export interface CoreMemory {
  human: string;
  persona: string;
  project_context?: string;
  task_state?: string;
  [customBlock: string]: string | undefined;
}

export interface ArchivalPassage {
  id: string;
  agentId: string;
  content: string;
  tags: string[];
  metadata?: {
    source?: string;
    fileName?: string;
    fileType?: string;
    chunkIndex?: number;
    totalChunks?: number;
    importance?: number;
    conversationId?: string;
    author?: string;
  };
  embedding?: number[];
  createdAt: string;
  updatedAt?: string;
  accessCount: number;
  lastAccessedAt: string;
}

export interface ArchivalSearchResult {
  passage: ArchivalPassage;
  score: number;
  matchType: 'semantic' | 'keyword' | 'tag' | 'hybrid';
}

export interface RecallEvent {
  id: string;
  agentId: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: any;
  }>;
  toolResults?: Array<{
    toolCallId: string;
    name: string;
    result: any;
    error?: string;
  }>;
  metadata?: {
    intent?: string;
    tokensUsed?: number;
    model?: string;
    isSummary?: boolean;
  };
}

export interface LettaAgentState {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  coreMemory: CoreMemory;
  tools: string[];
  llmConfig: {
    model: string;
    provider: 'gemini' | 'minimax' | 'openai' | 'claude' | 'deepseek' | 'auto';
    contextWindow: number;
    temperature: number;
  };
  embeddingConfig: {
    model: string;
    embeddingDim: number;
  };
  stats: {
    messagesCount: number;
    archivalPassagesCount: number;
    coreMemoryEditsCount: number;
    toolInvocationsCount: number;
    lastActive: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface LettaToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required?: string[];
  };
  handler: (args: any, context: LettaExecutionContext) => Promise<any>;
}

export interface LettaExecutionContext {
  agentId: string;
  conversationId: string;
  userId?: string;
  query: string;
  signal?: AbortSignal;
  onStatusUpdate?: (status: LettaExecutionStatus) => void;
}

export type LettaThinkingStage = 
  | 'idle'
  | 'thinking'
  | 'retrieving_memory'
  | 'searching'
  | 'using_tool'
  | 'processing'
  | 'generating'
  | 'done'
  | 'error';

export interface LettaExecutionStatus {
  stage: LettaThinkingStage;
  message: string;
  activeTool?: string;
  memoriesRetrieved?: number;
  archivalHits?: number;
  coreMemoryUpdated?: boolean;
}

export interface LettaExecutionResult {
  text: string;
  agentState: LettaAgentState;
  toolCallsExecuted: Array<{
    name: string;
    args: any;
    result: any;
  }>;
  retrievedPassages: ArchivalSearchResult[];
  coreMemoryDiff?: {
    humanChanged: boolean;
    personaChanged: boolean;
    updates: string[];
  };
  sources?: Array<{ title: string; url: string; snippet?: string }>;
  groundingMetadata?: any;
}
