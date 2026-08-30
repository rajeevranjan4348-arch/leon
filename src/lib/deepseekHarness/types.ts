/**
 * DeepSeek Harness - Core Architecture Type Definitions
 * Inspired by deepseek-ai/deepseek-harness (Cordis-inspired plugin & agent orchestration meta-framework)
 * MIT License
 */

// ==========================================
// 1. Task State Machine & Agent Lifecycle
// ==========================================

export type TaskState =
  | 'IDLE'
  | 'PLANNING'
  | 'EXECUTING'
  | 'WAITING_FOR_TOOL'
  | 'OBSERVING'
  | 'VALIDATING'
  | 'RECOVERING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface StateTransitionEvent {
  from: TaskState;
  to: TaskState;
  timestamp: number;
  reason?: string;
  metadata?: Record<string, any>;
}

// ==========================================
// 2. Event Bus & Messaging
// ==========================================

export type HarnessEventType =
  | 'agent.started'
  | 'agent.intent.detected'
  | 'agent.plan.created'
  | 'agent.plan.updated'
  | 'agent.step.started'
  | 'agent.step.completed'
  | 'agent.step.failed'
  | 'tool.before_execute'
  | 'tool.executed'
  | 'tool.failed'
  | 'tool.validation_failed'
  | 'plugin.loaded'
  | 'plugin.unloaded'
  | 'plugin.enabled'
  | 'plugin.disabled'
  | 'session.created'
  | 'session.updated'
  | 'session.cleared'
  | 'task.state_changed'
  | 'task.completed'
  | 'task.failed'
  | 'task.cancelled'
  | 'recovery.started'
  | 'recovery.succeeded'
  | 'recovery.failed';

export interface HarnessEvent<T = any> {
  id: string;
  type: HarnessEventType | string;
  timestamp: number;
  sessionId: string;
  taskId?: string;
  payload: T;
}

export type HarnessEventHandler<T = any> = (event: HarnessEvent<T>) => void | Promise<void>;

// ==========================================
// 3. Permissions & Capability Model
// ==========================================

export type PermissionScope =
  | 'tools:execute'
  | 'tools:read'
  | 'system:control'
  | 'system:app_launch'
  | 'network:fetch'
  | 'network:search'
  | 'storage:read'
  | 'storage:write'
  | 'memory:read'
  | 'memory:write'
  | 'contacts:read'
  | 'code:execute'
  | 'plugins:manage';

export interface PermissionRequest {
  pluginId: string;
  toolName?: string;
  scope: PermissionScope;
  reason: string;
}

export interface PermissionGrant {
  scope: PermissionScope;
  grantedAt: number;
  grantedBy: 'system' | 'user' | 'policy';
  expiresAt?: number;
}

// ==========================================
// 4. Unified Tool Interface
// ==========================================

export interface ToolParameterSchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  enum?: string[];
  required?: boolean;
  default?: any;
  items?: ToolParameterSchema;
  properties?: Record<string, ToolParameterSchema>;
}

export interface ToolSchema {
  type: 'object';
  properties: Record<string, ToolParameterSchema>;
  required?: string[];
}

export interface ToolExecutionContext {
  sessionId: string;
  taskId: string;
  stepId: string;
  signal?: AbortSignal;
  pluginId?: string;
  scratchpad: Map<string, any>;
  logger: (message: string, level?: 'info' | 'warn' | 'error') => void;
}

export interface HarnessToolResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  executionTimeMs?: number;
  retryable?: boolean;
  metadata?: Record<string, any>;
}

export interface HarnessTool<TInput = Record<string, any>, TOutput = any> {
  name: string;
  description: string;
  category: 'system' | 'search' | 'memory' | 'research' | 'code' | 'multimodal' | 'general';
  inputSchema: ToolSchema;
  outputSchema?: Record<string, any>;
  requiredPermissions: PermissionScope[];
  timeoutMs?: number;
  maxRetries?: number;
  supportsCancellation?: boolean;
  
  execute: (input: TInput, context: ToolExecutionContext) => Promise<HarnessToolResult<TOutput>>;
  validateResult?: (result: HarnessToolResult<TOutput>, input: TInput) => boolean | Promise<boolean>;
}

// ==========================================
// 5. Plugin Architecture
// ==========================================

export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  homepage?: string;
  icon?: string;
}

export interface PluginLifecycleHooks {
  onInit?: (context: PluginContext) => Promise<void> | void;
  beforeStep?: (step: HarnessPlanStep, context: ToolExecutionContext) => Promise<void> | void;
  afterStep?: (step: HarnessPlanStep, result: HarnessToolResult, context: ToolExecutionContext) => Promise<void> | void;
  onToolExecute?: (toolName: string, args: any, context: ToolExecutionContext) => Promise<void> | void;
  onError?: (error: Error, context: ToolExecutionContext) => Promise<void> | void;
  onCleanup?: () => Promise<void> | void;
}

export interface PluginContext {
  pluginId: string;
  registerTool: (tool: HarnessTool) => void;
  unregisterTool: (toolName: string) => void;
  getPluginState: <T = any>(key: string) => T | undefined;
  setPluginState: <T = any>(key: string, value: T) => void;
  emitEvent: (type: string, payload: any) => void;
  hasPermission: (scope: PermissionScope) => boolean;
}

export interface HarnessPlugin {
  metadata: PluginMetadata;
  capabilities: string[];
  requiredPermissions: PermissionScope[];
  tools?: HarnessTool[];
  hooks?: PluginLifecycleHooks;
  config?: Record<string, any>;
  enabled: boolean;
  
  initialize: (context: PluginContext) => Promise<void> | void;
  cleanup?: () => Promise<void> | void;
}

// ==========================================
// 6. Plan & Step Orchestration
// ==========================================

export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'recovering';

export interface HarnessPlanStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  assignedTool?: string;
  inputArguments?: Record<string, any>;
  dependencies?: string[]; // IDs of prerequisite steps
  expectedOutcome?: string;
  status: StepStatus;
  result?: HarnessToolResult;
  error?: string;
  retryCount: number;
  maxRetries: number;
  startedAt?: number;
  completedAt?: number;
}

export interface HarnessPlan {
  id: string;
  objective: string;
  steps: HarnessPlanStep[];
  createdAt: number;
  updatedAt: number;
  isComplete: boolean;
  totalSteps: number;
  completedSteps: number;
}

// ==========================================
// 7. Model Adapter Abstraction
// ==========================================

export interface ModelMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  name?: string;
}

export interface ModelCallOptions {
  messages: ModelMessage[];
  systemInstruction?: string;
  tools?: HarnessTool[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  signal?: AbortSignal;
  responseFormat?: 'text' | 'json';
}

export interface ModelToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface ModelResponse {
  text: string;
  toolCalls?: ModelToolCall[];
  finishReason: 'stop' | 'tool_calls' | 'length' | 'error';
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface HarnessModelAdapter {
  id: string;
  name: string;
  provider: 'gemini' | 'openai' | 'nvidia' | 'minimax' | 'local';
  
  generateResponse: (options: ModelCallOptions) => Promise<ModelResponse>;
  generateStructuredOutput?: <T = any>(prompt: string, schema: Record<string, any>, signal?: AbortSignal) => Promise<T>;
  streamResponse?: (options: ModelCallOptions, onChunk: (chunk: string) => void) => Promise<ModelResponse>;
}

// ==========================================
// 8. Session & Scratchpad Context
// ==========================================

export interface HarnessSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  currentObjective?: string;
  activePlan?: HarnessPlan;
  scratchpad: Map<string, any>;
  pluginStates: Map<string, Record<string, any>>;
  history: ModelMessage[];
  executionLogs: Array<{
    timestamp: number;
    stepId?: string;
    action: string;
    status: 'success' | 'warning' | 'error';
    details: any;
  }>;
}

// ==========================================
// 9. Runtime Execution Output
// ==========================================

export interface HarnessExecutionResult {
  sessionId: string;
  objective: string;
  status: 'success' | 'failed' | 'cancelled';
  finalAnswer: string;
  plan?: HarnessPlan;
  stepsExecuted: number;
  totalDurationMs: number;
  toolCallsCount: number;
  errors: Array<{ stepId?: string; error: string; timestamp: number }>;
}
