/**
 * DeepSeek Harness - Public Integration API & Subsystem Exports
 * MIT License
 * 
 * Subsystems:
 * - Agent Runtime (Life cycle: Goal -> Plan -> Tool Select -> Execute -> Observe -> Validate -> Next -> Result)
 * - Plugin-First Architecture (Cordis-inspired)
 * - Unified Tool Execution & Auto-Bridging
 * - Model Abstraction (Gemini, OpenAI, NVIDIA, MiniMax, Local)
 * - Session Management & Isolation
 * - Task State Machine
 * - Planning & DAG Execution
 * - Capability & Permission Manager
 * - Sandboxed Execution Layer
 * - High-Throughput Event Bus
 */

export * from './types';
export { HarnessEventBus, harnessEventBus } from './events/HarnessEventBus';
export { PermissionManager, permissionManager } from './permissions/PermissionManager';
export { ExecutionSandbox, executionSandbox } from './sandbox/ExecutionSandbox';
export { HarnessToolRegistry, harnessToolRegistry } from './tools/HarnessToolRegistry';
export { HarnessPluginRegistry, harnessPluginRegistry } from './plugins/HarnessPluginRegistry';
export { HarnessSessionManager, harnessSessionManager } from './session/HarnessSessionManager';
export { HarnessPlanner, harnessPlanner } from './planner/HarnessPlanner';
export { TaskStateMachine } from './runtime/TaskStateMachine';
export { DeepSeekAgentRuntime, deepSeekAgentRuntime } from './runtime/DeepSeekAgentRuntime';
export {
  ModelAdapterManager,
  modelAdapterManager,
  GeminiModelAdapter,
  OpenAIModelAdapter,
  LocalRuleBasedModelAdapter,
} from './models/ModelAdapter';

import { deepSeekAgentRuntime, AgentRuntimeOptions } from './runtime/DeepSeekAgentRuntime';
import { HarnessExecutionResult } from './types';

/**
 * Convenient helper to execute any user prompt or multi-step goal through DeepSeek Harness.
 */
export async function executeWithDeepSeekHarness(
  objective: string,
  options?: AgentRuntimeOptions
): Promise<HarnessExecutionResult> {
  return deepSeekAgentRuntime.executeTask(objective, options);
}
