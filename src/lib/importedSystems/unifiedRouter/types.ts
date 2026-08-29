/**
 * Unified System Request Pipeline Architecture
 * Integrates all 10 imported system engines:
 * 1. Awesome Resources (sindresorhus/awesome)
 * 2. Public APIs (public-apis/public-apis)
 * 3. Scrapling Crawler (D4Vinci/Scrapling)
 * 4. Free-For-Dev Catalog (ripienaar/free-for-dev)
 * 5. Ollama Local Models (ollama/ollama)
 * 6. Langflow Graph Workflows (langflow-ai/langflow)
 * 7. Awesome MCP Servers & Tools (punkpeye/awesome-mcp-servers)
 * 8. OpenDesign UI Planner (nexu-io/open-design)
 * 9. Awesome LLM Apps Patterns (Shubhamsaboo/awesome-llm-apps)
 * 10. OpenHands Autonomous Coding (All-Hands-AI/OpenHands)
 */

export type UnifiedSystemIntent =
  | 'developer_resource_lookup'
  | 'public_api_execution'
  | 'web_crawl_extraction'
  | 'free_tier_discovery'
  | 'local_model_inference'
  | 'workflow_graph_execution'
  | 'mcp_tool_invocation'
  | 'ui_design_planning'
  | 'evaluator_optimizer_refinement'
  | 'autonomous_code_fix'
  | 'general_ai_assistant';

export interface UnifiedPipelineRequest {
  userQuery: string;
  explicitIntent?: UnifiedSystemIntent;
  context?: Record<string, any>;
  options?: {
    allowWebSearch?: boolean;
    allowLocalOllama?: boolean;
    qualityThreshold?: number;
    maxCrawlPages?: number;
  };
}

export interface PipelineStageLog {
  stage: 'analyzer' | 'intent_classifier' | 'security_check' | 'task_planner' | 'router' | 'execution' | 'validator' | 'recovery';
  status: 'started' | 'success' | 'warning' | 'failed' | 'skipped';
  message: string;
  durationMs: number;
  data?: any;
}

export interface UnifiedPipelineResponse {
  success: boolean;
  intent: UnifiedSystemIntent;
  primaryEngineUsed: string;
  finalAnswer: string;
  structuredOutput?: any;
  sources?: string[];
  stages: PipelineStageLog[];
  executionTimeMs: number;
  recoveredFromError?: boolean;
}
