export type AdkModel =
  | 'gemini-2.5-flash'
  | 'gemini-1.5-pro'
  | 'gemini-1.5-flash'
  | 'gemini-2.5-pro'
  | 'claude-3-5-sonnet'
  | 'gpt-4o';

export type DeploymentTarget = 'cloud-run' | 'vertex-agent-builder' | 'docker' | 'fastapi';

export interface AgentToolConfig {
  name: string;
  description: string;
  parameters: Record<string, any>;
  handlerType: 'builtin' | 'api' | 'code_sandbox' | 'mcp' | 'custom';
  endpointUrl?: string;
}

export interface SubAgentRef {
  id: string;
  name: string;
  role: string;
  delegationCriteria: string;
}

export interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  role: string;
  model: AdkModel;
  systemPrompt: string;
  tools: AgentToolConfig[];
  subAgents?: SubAgentRef[];
  reasoningBudget?: 'low' | 'medium' | 'high' | 'extended';
  memoryPolicy?: 'short_term' | 'sliding_window' | 'semantic_rag' | 'persistent';
  maxSteps?: number;
  temperature?: number;
  version: string;
  createdAt: string;
  updatedAt: string;
  author?: string;
  tags: string[];
}

export interface EvaluationMetric {
  name: string;
  score: number; // 0 to 100
  weight: number;
  status: 'passed' | 'warning' | 'failed';
  details: string;
}

export interface AgentEvaluationResult {
  evaluationId: string;
  agentId: string;
  agentName: string;
  timestamp: string;
  overallScore: number; // 0 to 100
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  metrics: {
    taskCompletion: EvaluationMetric;
    groundingAndFaithfulness: EvaluationMetric;
    toolExecutionPrecision: EvaluationMetric;
    reasoningEfficiency: EvaluationMetric;
    safetyCompliance: EvaluationMetric;
    latencyAndCost: EvaluationMetric;
  };
  sampleTestCases: Array<{
    prompt: string;
    expectedBehavior: string;
    actualOutcome: string;
    passed: boolean;
    durationMs: number;
  }>;
  actionableInsights: string[];
}

export interface ExecutionTraceStep {
  stepNumber: number;
  phase: 'think' | 'plan' | 'tool_call' | 'tool_result' | 'synthesize' | 'delegate';
  thought?: string;
  toolCall?: {
    toolName: string;
    args: Record<string, any>;
  };
  toolResult?: any;
  delegationTarget?: string;
  durationMs: number;
  timestamp: string;
}

export interface AgentExecutionTrace {
  traceId: string;
  agentId: string;
  agentName: string;
  inputPrompt: string;
  status: 'running' | 'completed' | 'failed' | 'timeout';
  steps: ExecutionTraceStep[];
  finalOutput?: string;
  totalDurationMs: number;
  totalTokensUsed?: {
    prompt: number;
    completion: number;
    total: number;
  };
  error?: string;
}

export interface AgentDeploymentManifest {
  agentId: string;
  target: DeploymentTarget;
  projectName: string;
  region: string;
  serviceName: string;
  dockerfileContent: string;
  cloudRunYaml: string;
  requirementsTxt: string;
  deployCliCommand: string;
  estimatedMonthlyCostUsd: string;
}

export interface CliCommandResult {
  command: string;
  action: string;
  success: boolean;
  outputText: string;
  data?: any;
  executionTimeMs: number;
}
