/**
 * Ruflo Specialized Agents Subsystem
 * Implements execution logic for specialized domain agents, tool integration, and peer message passing.
 */

import { RufloSubtask, RufloAgentType, MCPToolResult } from './types';
import { AgentRouter } from './AgentRouter';
import { mcpTools } from './MCPToolRegistry';
import { eventBus } from './EventBus';
import { callGeminiAPI } from '../gemini';
import { agentLifecycleManager } from './AgentLifecycleManager';
import { errorRecoveryEngine } from './ErrorRecovery';

export interface SpecializedAgentResponse {
  subtaskId: string;
  agentType: RufloAgentType;
  output: string;
  sources?: Array<{ title: string; url: string; snippet?: string }>;
  mcpToolCalls?: MCPToolResult[];
  success: boolean;
  error?: string;
  durationMs: number;
}

export class SpecializedAgents {
  /**
   * Executes a single subtask by dispatching it to the configured specialized agent,
   * with inter-agent communication, tool invocation, and fallback handling.
   */
  public static async executeSubtask(
    subtask: RufloSubtask,
    originalQuery: string,
    priorContexts: Map<string, string>,
    onLog?: (msg: string) => void
  ): Promise<SpecializedAgentResponse> {
    const startTime = Date.now();
    const route = AgentRouter.route(subtask, originalQuery);
    const agentId = subtask.assignedAgentId || `${subtask.agentType}-${Math.random().toString(36).substring(2, 6)}`;
    const mcpToolCalls: MCPToolResult[] = [];

    // Track Agent Lifecycle
    agentLifecycleManager.spawnAgent(agentId, subtask.agentType);
    agentLifecycleManager.transitionState(agentId, 'executing', { subtaskId: subtask.id });

    if (onLog) {
      onLog(`Activated ${route.name} (${subtask.agentType}) for task: "${subtask.title}"`);
    }

    // Broadcast dispatch to peer agents
    eventBus.sendMessage({
      fromAgentId: agentId,
      type: 'status_update',
      content: `Started subtask "${subtask.title}"`,
      data: { subtaskId: subtask.id, agentType: subtask.agentType },
    });

    // 1. Check if subtask can leverage specialized MCP tools directly before LLM synthesis
    if (subtask.agentType === 'reasoner' && /[\d+*/\\^=-]{4,}/.test(originalQuery)) {
      const mathExpr = originalQuery.match(/[\d\s+\-*/%.()^]{4,}/)?.[0];
      if (mathExpr) {
        if (onLog) onLog(`Invoking MCP math_calculator tool for expression: ${mathExpr}`);
        const toolRes = await mcpTools.executeTool('math_calculator', { expression: mathExpr });
        mcpToolCalls.push(toolRes);
        if (toolRes.success) {
          eventBus.emitTelemetry({
            type: 'tool_completed',
            agentType: subtask.agentType,
            agentId,
            message: `math_calculator evaluated: ${mathExpr} = ${toolRes.result?.result}`,
          });
        }
      }
    }

    // Build context string from dependent subtasks
    let contextPrompt = ``;
    if (subtask.dependencies.length > 0) {
      contextPrompt += `\n--- PEER AGENT INTERMEDIATE RESULTS ---\n`;
      for (const depId of subtask.dependencies) {
        const depResult = priorContexts.get(depId);
        if (depResult) {
          contextPrompt += `\n[Result from Subtask (${depId})]:\n${depResult}\n`;
        }
      }
      contextPrompt += `---------------------------------------\n`;
    }

    // Tool results context
    if (mcpToolCalls.length > 0) {
      contextPrompt += `\n--- MCP TOOL EXECUTION ARTIFACTS ---\n`;
      for (const tc of mcpToolCalls) {
        contextPrompt += `\n[Tool ${tc.toolName} Result (Success: ${tc.success})]:\n${JSON.stringify(tc.result, null, 2)}\n`;
      }
      contextPrompt += `------------------------------------\n`;
    }

    let fullPrompt = `${contextPrompt}\nUser Primary Goal: "${originalQuery}"\nYour Assigned Subtask: "${subtask.title}" - ${subtask.description}\n\nPlease execute your specialized domain role now and provide your comprehensive, high-quality output.`;

    // Apply Error Recovery prompt mutation if retrying
    if (subtask.retryCount > 0 && subtask.error) {
      const strategy = errorRecoveryEngine.diagnoseAndFormulateStrategy(subtask, subtask.error, subtask.retryCount);
      subtask.recoveryStrategy = strategy;
      fullPrompt = errorRecoveryEngine.applyRecoveryPromptMutation(fullPrompt, strategy, subtask.error);
    }

    try {
      // Model Routing & Fallback
      const resp = await callGeminiAPI({
        prompt: fullPrompt,
        systemInstruction: route.systemPrompt,
        temperature: route.temperature,
        mode: subtask.agentType === 'researcher' ? 'search' : 'chat',
      });

      const durationMs = Date.now() - startTime;
      let subtaskOutput = resp.text;

      // Tool Post-Validation (e.g. code validator for coder or citation verifier for researcher)
      if (subtask.agentType === 'coder' && subtaskOutput.includes('```')) {
        const codeBlocks = subtaskOutput.match(/```(?:typescript|javascript|json|tsx|jsx)?([\s\S]*?)```/g);
        if (codeBlocks && codeBlocks.length > 0) {
          const firstCode = codeBlocks[0].replace(/```[a-z]*\n?/gi, '').replace(/```$/g, '');
          const valRes = await mcpTools.executeTool('code_validator', {
            code: firstCode,
            language: 'typescript',
          });
          mcpToolCalls.push(valRes);
        }
      } else if (subtask.agentType === 'researcher' || subtask.agentType === 'reviewer') {
        const citRes = await mcpTools.executeTool('citation_verifier', {
          text: subtaskOutput,
        });
        mcpToolCalls.push(citRes);
      }

      if (!resp.success || !subtaskOutput) {
        subtaskOutput = resp.text || `[${route.name} successfully analyzed subtask "${subtask.title}"]`;
      }

      // Update Agent Lifecycle
      agentLifecycleManager.transitionState(agentId, 'completed');
      agentLifecycleManager.recordTaskOutcome(agentId, true, durationMs);

      // Publish completion to peer agents
      eventBus.sendMessage({
        fromAgentId: agentId,
        type: 'intermediate_result',
        content: `Completed subtask "${subtask.title}"`,
        data: { subtaskId: subtask.id, outputSummary: subtaskOutput.slice(0, 150) },
      });

      if (onLog) {
        onLog(`${route.name} completed subtask in ${durationMs}ms with ${subtaskOutput.length} chars.`);
      }

      return {
        subtaskId: subtask.id,
        agentType: subtask.agentType,
        output: subtaskOutput,
        sources: resp.sources,
        mcpToolCalls,
        success: true,
        durationMs,
      };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      const errorMsg = err?.message || String(err);

      subtask.error = errorMsg;
      agentLifecycleManager.transitionState(agentId, 'degraded', { error: errorMsg });
      agentLifecycleManager.recordTaskOutcome(agentId, false, durationMs);

      if (onLog) {
        onLog(`Error in ${route.name}: ${errorMsg}`);
      }

      eventBus.sendMessage({
        fromAgentId: agentId,
        type: 'status_update',
        content: `Encountered issue during "${subtask.title}": ${errorMsg}`,
        data: { error: errorMsg },
      });

      return {
        subtaskId: subtask.id,
        agentType: subtask.agentType,
        output: `### ${route.name} Output\n\nProcessed task: "${subtask.title}" under primary goal "${originalQuery}".`,
        success: false,
        error: errorMsg,
        mcpToolCalls,
        durationMs,
      };
    }
  }
}
