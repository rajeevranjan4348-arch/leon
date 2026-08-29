/**
 * Awesome LLM Apps & Agent Pattern Architecture
 * Reference: https://github.com/Shubhamsaboo/awesome-llm-apps (Apache-2.0)
 * 
 * Defines schemas for advanced agent orchestration patterns:
 * Evaluator-Optimizer, Hierarchical Supervisor, Self-Correcting RAG,
 * and structured JSON extraction with schema validation.
 */

export type AgentPatternType =
  | 'evaluator_optimizer'
  | 'hierarchical_supervisor'
  | 'self_correcting_rag'
  | 'sequential_chain'
  | 'multi_agent_debate';

export interface EvaluatorOptimizerConfig {
  taskPrompt: string;
  maxIterations?: number; // default: 3
  qualityThreshold?: number; // 0-100, default: 85
  systemContext?: string;
  evaluationCriteria: string[];
}

export interface EvaluatorOptimizerResult {
  finalOutput: string;
  iterations: Array<{
    iteration: number;
    draft: string;
    score: number;
    feedback: string;
    passed: boolean;
  }>;
  totalIterations: number;
  qualityScore: number;
  executionTimeMs: number;
}

export interface StructuredExtractionSchema {
  fields: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    description: string;
    required: boolean;
  }>;
}

export interface StructuredExtractionResult<T = any> {
  success: boolean;
  data: T | null;
  rawResponse: string;
  validationErrors: string[];
  recovered: boolean;
}
