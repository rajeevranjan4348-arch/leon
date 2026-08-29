/**
 * Agency Agents System Architecture
 * Based on msitarzewski/agency-agents (MIT License)
 * 
 * Defines core types, division categories, agent contracts, shared context,
 * workflow specifications, and verification schemas.
 */

export type AgentDivision =
  | 'engineering'
  | 'design'
  | 'research'
  | 'testing'
  | 'security'
  | 'product'
  | 'strategy'
  | 'support'
  | 'marketing';

export interface AgentContext {
  task: string;
  intent: string;
  requirements: string[];
  constraints: string[];
  files?: string[];
  previousResults?: unknown[];
  selectedAgents?: string[];
  tools?: string[];
  errors?: string[];
  verification?: unknown;
  sessionId?: string;
  conversationTopic?: string;
  userQuery?: string;
  memoryContext?: string;
  workingArtifacts?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface AgentResult {
  success: boolean;
  output: unknown;
  reasoningSummary?: string;
  actions?: string[];
  errors?: string[];
  warnings?: string[];
  confidence?: number;
  agentId?: string;
  agentName?: string;
  specialty?: string;
  executionTimeMs?: number;
  sources?: Array<{ title: string; url: string; snippet?: string }>;
  codeArtifacts?: Array<{ language: string; code: string; filename?: string }>;
  metadata?: Record<string, any>;
}

export interface SpecialistAgent {
  id: string;
  name: string;
  division: AgentDivision;
  specialty: string;
  systemInstructions: string;
  capabilities: string[];
  workflow: string[];
  constraints: string[];
  priorityScore?: number;
  execute(context: AgentContext): Promise<AgentResult>;
}

export interface SubTaskDefinition {
  id: string;
  title: string;
  description: string;
  assignedAgentId: string;
  division: AgentDivision;
  dependencies: string[];
  expectedOutputFormat: 'code' | 'analysis' | 'verification' | 'design_spec' | 'security_audit' | 'summary';
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'skipped';
  result?: AgentResult;
}

export interface TaskDecompositionPlan {
  originalQuery: string;
  isComplex: boolean;
  intent: string;
  primaryDivision: AgentDivision;
  subtasks: SubTaskDefinition[];
  executionStrategy: 'single_specialist' | 'sequential_pipeline' | 'dag_parallel';
  estimatedComplexity: 'low' | 'medium' | 'high' | 'expert';
}

export interface RoutingDecision {
  mode: 'single' | 'collaborative_pipeline' | 'fallback_general';
  primaryAgentId: string;
  collaboratingAgentIds?: string[];
  division: AgentDivision;
  reasoning: string;
  confidence: number;
  suggestedTools: string[];
}

export interface VerificationCheck {
  criterion: string;
  passed: boolean;
  feedback?: string;
  severity: 'low' | 'medium' | 'critical';
}

export interface VerificationReport {
  isApproved: boolean;
  overallScore: number; // 0 to 100
  checks: VerificationCheck[];
  securityAudited: boolean;
  hallucinationRisk: 'none' | 'low' | 'medium' | 'high';
  correctionsApplied?: string[];
}

export interface AgencyExecutionSummary {
  query: string;
  primaryAgent: string;
  collaboratingAgents: string[];
  plan: TaskDecompositionPlan;
  finalAnswer: string;
  verificationReport: VerificationReport;
  durationMs: number;
  isSuccessful: boolean;
  sources?: Array<{ title: string; url: string }>;
}
