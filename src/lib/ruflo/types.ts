/**
 * Ruflo Multi-Agent AI System - Core Type Definitions
 * Inspired by and adapted from Ruflo (https://github.com/ruvnet/ruflo)
 */

export type SwarmTopology = 'hierarchical-mesh' | 'mesh' | 'hierarchical' | 'centralized';

export type AgentDomain = 'core' | 'security' | 'research' | 'code' | 'reasoning' | 'quality' | 'memory' | 'tools' | 'deployment';

export type RufloAgentType =
  | 'queen-coordinator'
  | 'task-planner'
  | 'researcher'
  | 'coder'
  | 'reasoner'
  | 'security-architect'
  | 'reviewer'
  | 'memory-specialist'
  | 'mcp-specialist'
  | 'aggregator';

export type SubtaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'retrying';

export type AgentLifecycleState = 'uninitialized' | 'idle' | 'assigned' | 'executing' | 'peer_evaluating' | 'completed' | 'degraded' | 'terminated';

export interface VectorEmbedding {
  vector: number[];
  dimensions: number;
}

export interface RAGChunk {
  id: string;
  docId: string;
  content: string;
  embedding?: number[];
  tokens: number;
  metadata: Record<string, any>;
}

export interface SwarmPattern {
  id: string;
  patternName: string;
  queryIntent: string;
  complexityScore: number;
  recommendedTopology: SwarmTopology;
  subtaskTemplates: Array<{
    title: string;
    description: string;
    agentType: RufloAgentType;
    priority?: 'critical' | 'high' | 'medium' | 'low';
  }>;
  successRate: number;
  usageCount: number;
  averageExecutionTimeMs: number;
  createdAt: number;
  lastUsedAt: number;
}

export interface ErrorRecoveryStrategy {
  strategyName: 'retry_with_backoff' | 'model_fallback' | 'subtask_mutation' | 'peer_assistance' | 'scope_reduction';
  description: string;
  attempt: number;
  maxAttempts: number;
  targetAgentType?: RufloAgentType;
}

export interface AgentMessage {
  id: string;
  fromAgentId: string;
  toAgentId?: string; // If undefined, broadcast to all agents in swarm
  type: 'task_dispatch' | 'status_update' | 'intermediate_result' | 'peer_query' | 'peer_response' | 'consensus_vote' | 'tool_request';
  content: string;
  data?: Record<string, any>;
  timestamp: number;
}

export interface MCPToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required?: string[];
  };
  execute: (args: Record<string, any>, context?: Record<string, any>) => Promise<any>;
}

export interface MCPToolResult {
  toolName: string;
  success: boolean;
  result: any;
  durationMs: number;
  error?: string;
}

export interface RufloSubtask {
  id: string;
  title: string;
  description: string;
  agentType: RufloAgentType;
  assignedAgentId?: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  status: SubtaskStatus;
  dependencies: string[]; // subtask IDs that must complete before this subtask
  result?: string;
  sources?: Array<{ title: string; url: string; snippet?: string }>;
  mcpToolCalls?: MCPToolResult[];
  logs: string[];
  retryCount: number;
  maxRetries: number;
  durationMs?: number;
  error?: string;
  recoveryStrategy?: ErrorRecoveryStrategy;
}

export type ExecutionStrategy = 'simple' | 'parallel' | 'sequential' | 'hierarchical_swarm';

export interface RufloPlan {
  id: string;
  originalQuery: string;
  isComplex: boolean;
  strategy: ExecutionStrategy;
  topology: SwarmTopology;
  subtasks: RufloSubtask[];
  createdAt: number;
  estimatedSteps: number;
  complexityScore: number;
  rationale: string;
  patternMatchId?: string;
}

export type RufloEventType =
  | 'plan_created'
  | 'agent_spawned'
  | 'agent_state_change'
  | 'agent_assigned'
  | 'agent_message'
  | 'subtask_start'
  | 'subtask_progress'
  | 'tool_invoked'
  | 'tool_completed'
  | 'subtask_complete'
  | 'subtask_failed'
  | 'subtask_retry'
  | 'error_recovery_attempt'
  | 'consensus_reached'
  | 'memory_stored'
  | 'rag_retrieved'
  | 'pattern_learned'
  | 'aggregation_start'
  | 'completed'
  | 'error';

export interface RufloProgressEvent {
  id: string;
  timestamp: number;
  type: RufloEventType;
  subtaskId?: string;
  agentType?: RufloAgentType;
  agentId?: string;
  message: string;
  details?: any;
}

export interface AgentMetrics {
  agentId: string;
  agentType: RufloAgentType;
  state: AgentLifecycleState;
  tasksCompleted: number;
  tasksFailed: number;
  successRate: number;
  averageExecutionTimeMs: number;
  health: 'healthy' | 'degraded' | 'unhealthy';
  lastHeartbeat: number;
}

export interface RufloMemoryItem {
  id: string;
  agentId: string;
  key: string;
  content: string;
  type: 'task-result' | 'fact' | 'plan' | 'code-snippet' | 'verification' | 'event' | 'rag-document';
  timestamp: number;
  tags: string[];
  embedding?: number[];
  score?: number;
  metadata?: Record<string, any>;
}

export interface RufloExecutionResult {
  finalAnswer: string;
  plan: RufloPlan;
  subtaskResults: Map<string, string>;
  sources?: Array<{ title: string; url: string; snippet?: string }>;
  mcpToolCalls?: MCPToolResult[];
  executionTimeMs: number;
  telemetryLogs: RufloProgressEvent[];
  interAgentMessages: AgentMessage[];
  patternLearned?: boolean;
}
