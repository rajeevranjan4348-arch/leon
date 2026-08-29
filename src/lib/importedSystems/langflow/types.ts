/**
 * Langflow Workflow Graph & Node Execution Engine
 * Reference: https://github.com/langflow-ai/langflow (MIT)
 * 
 * Defines schemas for graph-based agent workflows, node types, DAG topological
 * execution, state passing, and reusable workflow templates.
 */

export type LangflowNodeType =
  | 'prompt'
  | 'model'
  | 'tool'
  | 'retrieval'
  | 'memory'
  | 'document_processor'
  | 'router'
  | 'evaluator'
  | 'output';

export interface LangflowNode {
  id: string;
  type: LangflowNodeType;
  name: string;
  description?: string;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  config?: Record<string, any>;
}

export interface LangflowEdge {
  id: string;
  sourceNodeId: string;
  sourceHandle: string;
  targetNodeId: string;
  targetHandle: string;
}

export interface LangflowGraph {
  id: string;
  name: string;
  description: string;
  nodes: LangflowNode[];
  edges: LangflowEdge[];
  metadata?: Record<string, any>;
}

export interface LangflowExecutionContext {
  graphId: string;
  executionId: string;
  initialInputs: Record<string, any>;
  nodeOutputs: Record<string, any>; // nodeId -> outputData
  logs: Array<{
    timestamp: string;
    nodeId: string;
    nodeType: string;
    status: 'started' | 'success' | 'failed' | 'skipped';
    output?: any;
    error?: string;
    durationMs: number;
  }>;
  startTime: number;
  endTime?: number;
  status: 'running' | 'completed' | 'failed';
}

export interface LangflowWorkflowResult {
  graphId: string;
  executionId: string;
  success: boolean;
  finalOutput: any;
  context: LangflowExecutionContext;
  executionTimeMs: number;
  error?: string;
}
