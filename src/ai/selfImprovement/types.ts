/**
 * BerriAI Self-Improving Agent System Types
 */

export type ProposalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'APPLIED' | 'FAILED';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type FailureCategory =
  | 'TOOL_FAILURE'
  | 'INCORRECT_TOOL_SELECTION'
  | 'UNEXPECTED_OUTPUT'
  | 'USER_CORRECTION'
  | 'API_ERROR'
  | 'UI_ACTION_FAILURE'
  | 'APP_LAUNCH_FAILURE'
  | 'VOICE_FAILURE'
  | 'MEMORY_FAILURE'
  | 'REPEATED_MISTAKE';

export interface ImprovementProposal {
  id: string; // e.g. "prop_1700000000"
  title: string;
  problem: string;
  observedBehavior: string;
  expectedBehavior: string;
  rootCause: string;
  affectedFiles: string[];
  proposedChange: string;
  riskLevel: RiskLevel;
  expectedBenefit: string;
  testPlan: string;
  status: ProposalStatus;
  createdAt: string;
  appliedAt?: string;
  rejectedAt?: string;
  toolInvolved?: string;
  failureCategory?: FailureCategory;
  failureContext?: Record<string, any>;
  gitBranch?: string;
  pullRequestUrl?: string;
}

export interface LearnedLesson {
  id: string;
  problem: string;
  solution: string;
  date: string;
  affectedFeature: string;
  toolInvolved: string;
  resultStatus: 'SUCCESS' | 'FAILED';
  proposalId: string;
  keywords: string[];
}

export interface ExecutionContext {
  userQuery: string;
  feature?: string;
  toolName?: string;
  toolArgs?: any;
  toolResult?: any;
  error?: any;
  userFeedback?: string;
  executionTimeMs?: number;
}

export interface EvaluationResult {
  isSuccess: boolean;
  failureCategory?: FailureCategory;
  reason?: string;
  shouldProposeImprovement: boolean;
  confidence: number;
}

export interface ImprovementAuditLog {
  id: string;
  timestamp: string;
  action: 'PROPOSAL_CREATED' | 'PROPOSAL_APPROVED' | 'PROPOSAL_REJECTED' | 'PROPOSAL_APPLIED' | 'PROPOSAL_FAILED' | 'LESSON_STORED';
  proposalId: string;
  details: string;
}
