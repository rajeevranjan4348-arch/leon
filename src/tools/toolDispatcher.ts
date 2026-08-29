import { toolRegistry } from './toolRegistry';
import { ToolResult } from '@/controllers/appController';
import { harnessEngineeringEngine } from '@/lib/importedSystems/harnessEngineering/HarnessEngineeringEngine';
import { formatAppError } from '@/lib/errorHandler';

export interface ToolCallRequest {
  name: string;
  arguments: Record<string, any>;
}

export interface ToolExecutionOptions {
  maxRetries?: number;
  agentName?: string;
  bypassCircuitBreaker?: boolean;
}

export class ToolDispatcher {
  private static instance: ToolDispatcher;

  private constructor() {}

  public static getInstance(): ToolDispatcher {
    if (!ToolDispatcher.instance) {
      ToolDispatcher.instance = new ToolDispatcher();
    }
    return ToolDispatcher.instance;
  }

  /**
   * Helper to evaluate if a tool error is transient and eligible for retry.
   */
  private isRetryableError(error: unknown, result?: ToolResult): boolean {
    if (result && result.success === false && result.error) {
      const appErr = formatAppError(result.error);
      return appErr.retryable;
    }
    if (error) {
      const appErr = formatAppError(error);
      return appErr.retryable;
    }
    return false;
  }

  /**
   * Generate actionable recovery hint for failing tool calls to aid agent self-correction.
   */
  private generateRecoveryHint(toolName: string, args: Record<string, any>, errorMsg: string): string {
    const lower = (errorMsg || '').toLowerCase();
    if (lower.includes('unknown tool') || lower.includes('not found')) {
      return `Tool '${toolName}' is not registered. Verify registered tool list using toolRegistry.`;
    }
    if (lower.includes('rate limit') || lower.includes('quota') || lower.includes('429')) {
      return `Rate limit encountered for '${toolName}'. Exponential backoff applied. Consider throttling request frequency.`;
    }
    if (lower.includes('required') || lower.includes('invalid') || lower.includes('parameter') || lower.includes('schema')) {
      return `Parameter schema mismatch for '${toolName}'. Inspect tool arguments schema and provide valid parameters.`;
    }
    if (lower.includes('network') || lower.includes('timeout') || lower.includes('fetch')) {
      return `Network or connection timeout executing '${toolName}'. Service endpoint may be transiently unavailable.`;
    }
    if (lower.includes('circuit breaker')) {
      return `Circuit Breaker is OPEN for '${toolName}'. Execution temporarily bypassed to prevent cascade failure. Try again shortly or use an alternative tool.`;
    }
    return `Execution of '${toolName}' failed. Check arguments '${JSON.stringify(args).slice(0, 100)}' or retry with alternative tool.`;
  }

  /**
   * Execute a tool by name with arguments using harness-engineering reliability rules (Circuit Breaker, Retries, Telemetry).
   */
  public async executeTool(
    name: string,
    args: Record<string, any>,
    options: ToolExecutionOptions = {}
  ): Promise<ToolResult> {
    const maxRetries = options.maxRetries ?? 2;
    const agentName = options.agentName || 'AgentCore';

    const tool = toolRegistry.getTool(name);
    if (!tool) {
      const errMsg = `Unknown tool name: '${name}'`;
      return {
        success: false,
        action: name,
        error: errMsg,
        message: this.generateRecoveryHint(name, args, errMsg),
      };
    }

    // Execute through Harness Engineering Engine with circuit breaker, retries, and telemetry tracing
    const harnessResult = await harnessEngineeringEngine.executeWithHarness<ToolResult>(
      agentName,
      `tool_call_${name}`,
      async () => {
        const result = await tool.handler(args);
        
        // If handler returned an explicit failure result that is retryable, throw to trigger harness retry loop
        if (result && result.success === false && this.isRetryableError(null, result)) {
          throw new Error(result.error || result.message || `Tool '${name}' returned retryable failure result.`);
        }
        
        return result;
      },
      maxRetries
    );

    if (harnessResult.success && harnessResult.result) {
      return {
        ...harnessResult.result,
        value: harnessResult.result.value ?? harnessResult.result,
      };
    }

    // Harness execution failed after retries or was bypassed by Circuit Breaker
    const errorDetail = harnessResult.error || `Tool '${name}' execution failed after retries.`;
    const appErr = formatAppError(errorDetail);

    return {
      success: false,
      action: name,
      error: appErr.message,
      message: this.generateRecoveryHint(name, args, appErr.message),
      value: {
        circuitBreakerState: harnessEngineeringEngine.getHealthMetrics().circuitBreakerState,
        trace: harnessResult.trace,
        retryCount: harnessResult.trace?.retryCount || 0,
        isRetryable: appErr.retryable,
      },
    };
  }

  /**
   * Parse potential JSON tool call strings embedded in model output or handle structured tool calls.
   */
  public async parseAndExecuteToolCalls(text: string): Promise<ToolResult[]> {
    const results: ToolResult[] = [];
    if (!text) return results;

    try {
      // Check for JSON block tool call patterns like {"name": "app_controller", "arguments": {...}}
      const regex = /\{\s*"name"\s*:\s*"[a-zA-Z0-9_]+"\s*,\s*"arguments"\s*:\s*\{[^}]*\}\s*\}/g;
      const matches = text.match(regex);

      if (matches) {
        const promises = matches.map(async (m) => {
          try {
            const parsed = JSON.parse(m);
            if (parsed.name && parsed.arguments) {
              return await this.executeTool(parsed.name, parsed.arguments);
            }
          } catch (e) {
            // Ignore parse errors
          }
          return null;
        });

        const resolved = await Promise.all(promises);
        return resolved.filter((r): r is ToolResult => r !== null);
      }
    } catch (err) {
      console.warn('[ToolDispatcher] Error parsing tool call pattern:', err);
    }

    return results;
  }
}

export const toolDispatcher = ToolDispatcher.getInstance();

