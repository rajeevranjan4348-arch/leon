export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface HarnessHealthMetrics {
  circuitBreakerState: CircuitBreakerState;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  consecutiveFailures: number;
  lastFailureReason?: string;
  averageExecutionMs: number;
  reliabilityScore: number; // 0.0 to 1.0
}

export interface AgentExecutionTrace {
  traceId: string;
  agentName: string;
  stepName: string;
  startTime: string;
  endTime?: string;
  status: 'passed' | 'failed' | 'retried' | 'bypassed';
  retryCount: number;
  outputSummary?: string;
  errorMessage?: string;
}

export interface HarnessEvaluationResult {
  evalId: string;
  testSuiteName: string;
  totalTests: number;
  passedCount: number;
  failedCount: number;
  accuracyRate: number; // 0.0 to 1.0
  performanceLatencyMs: number;
  traces: AgentExecutionTrace[];
}
