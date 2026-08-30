/**
 * DeepSeek Harness - Sandboxed Execution Layer
 * Provides controlled execution, timeout enforcement, signal cancellation,
 * and untrusted data sanitization.
 * MIT License
 */

import { HarnessTool, HarnessToolResult, ToolExecutionContext } from '../types';
import { permissionManager } from '../permissions/PermissionManager';
import { harnessEventBus } from '../events/HarnessEventBus';

export interface SandboxExecutionOptions {
  timeoutMs?: number;
  pluginId?: string;
  signal?: AbortSignal;
  validateOutput?: boolean;
}

export class ExecutionSandbox {
  private static instance: ExecutionSandbox;
  private readonly DEFAULT_TIMEOUT_MS = 20000; // 20s default timeout

  private constructor() {}

  public static getInstance(): ExecutionSandbox {
    if (!ExecutionSandbox.instance) {
      ExecutionSandbox.instance = new ExecutionSandbox();
    }
    return ExecutionSandbox.instance;
  }

  /**
   * Sanitizes input arguments to guard against prototype pollution or malformed payloads.
   */
  private sanitizeInput(input: any): any {
    if (input === null || input === undefined) return input;
    if (typeof input !== 'object') return input;

    if (Array.isArray(input)) {
      return input.map((item) => this.sanitizeInput(item));
    }

    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(input)) {
      // Disallow dangerous prototype injection keys
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      clean[key] = this.sanitizeInput(value);
    }
    return clean;
  }

  /**
   * Execute a tool within isolated sandbox bounds with strict timeout & permission verification.
   */
  public async executeInSandbox<TInput = any, TOutput = any>(
    tool: HarnessTool<TInput, TOutput>,
    rawInput: TInput,
    context: ToolExecutionContext,
    options: SandboxExecutionOptions = {}
  ): Promise<HarnessToolResult<TOutput>> {
    const startTime = performance.now();
    const pluginId = options.pluginId || tool.category || 'global';
    const timeoutMs = options.timeoutMs || tool.timeoutMs || this.DEFAULT_TIMEOUT_MS;

    // 1. Capability Permission Check
    const permCheck = permissionManager.checkAllPermissions(
      pluginId,
      tool.requiredPermissions || []
    );

    if (!permCheck.allowed) {
      const errMsg = `Permission Denied: Plugin/Tool requires [${permCheck.missingScopes.join(', ')}]`;
      harnessEventBus.emit('tool.failed', {
        toolName: tool.name,
        error: errMsg,
        reason: 'permission_denied',
      }, { sessionId: context.sessionId, taskId: context.taskId });

      return {
        success: false,
        error: errMsg,
        retryable: false,
        executionTimeMs: Math.round(performance.now() - startTime),
      };
    }

    // 2. Input Sanitization
    const sanitizedInput = this.sanitizeInput(rawInput);

    // 3. Setup Timeout & Cancellation Signal
    const abortController = new AbortController();
    const timeoutTimer = setTimeout(() => {
      abortController.abort(new Error(`Tool '${tool.name}' execution timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    // Link parent signal if provided
    if (context.signal) {
      context.signal.addEventListener('abort', () => abortController.abort(context.signal?.reason), { once: true });
    }
    if (options.signal) {
      options.signal.addEventListener('abort', () => abortController.abort(options.signal?.reason), { once: true });
    }

    // Enrich context with linked abort signal
    const sandboxedContext: ToolExecutionContext = {
      ...context,
      signal: abortController.signal,
    };

    harnessEventBus.emit('tool.before_execute', {
      toolName: tool.name,
      input: sanitizedInput,
      stepId: context.stepId,
    }, { sessionId: context.sessionId, taskId: context.taskId });

    try {
      // Execute the tool handler with cancellation race
      const executionPromise = tool.execute(sanitizedInput, sandboxedContext);

      const abortPromise = new Promise<never>((_, reject) => {
        if (abortController.signal.aborted) {
          reject(abortController.signal.reason || new Error('Operation aborted'));
        }
        abortController.signal.addEventListener('abort', () => {
          reject(abortController.signal.reason || new Error('Operation aborted'));
        });
      });

      const rawResult = await Promise.race([executionPromise, abortPromise]);
      clearTimeout(timeoutTimer);

      const duration = Math.round(performance.now() - startTime);

      // 4. Output Validation
      let isValid = true;
      if (options.validateOutput !== false && tool.validateResult && rawResult.success) {
        try {
          isValid = await tool.validateResult(rawResult, sanitizedInput);
        } catch (valErr) {
          isValid = false;
          context.logger(`Result validation threw error: ${valErr}`, 'warn');
        }
      }

      if (!isValid) {
        const valErrMsg = `Tool '${tool.name}' returned data that failed output validation rules.`;
        harnessEventBus.emit('tool.validation_failed', {
          toolName: tool.name,
          result: rawResult,
        }, { sessionId: context.sessionId, taskId: context.taskId });

        return {
          success: false,
          error: valErrMsg,
          retryable: true,
          executionTimeMs: duration,
          data: rawResult.data,
        };
      }

      const finalResult: HarnessToolResult<TOutput> = {
        ...rawResult,
        executionTimeMs: duration,
      };

      harnessEventBus.emit('tool.executed', {
        toolName: tool.name,
        success: finalResult.success,
        durationMs: duration,
      }, { sessionId: context.sessionId, taskId: context.taskId });

      return finalResult;
    } catch (err: any) {
      clearTimeout(timeoutTimer);
      const duration = Math.round(performance.now() - startTime);
      const isTimeout = err?.message?.includes('timed out');
      const isAbort = abortController.signal.aborted;

      const errorMessage = isTimeout
        ? `Execution timed out (${timeoutMs}ms)`
        : isAbort
        ? 'Execution was cancelled by user or parent workflow'
        : err?.message || String(err);

      harnessEventBus.emit('tool.failed', {
        toolName: tool.name,
        error: errorMessage,
        durationMs: duration,
        isTimeout,
      }, { sessionId: context.sessionId, taskId: context.taskId });

      return {
        success: false,
        error: errorMessage,
        retryable: isTimeout || !isAbort,
        executionTimeMs: duration,
      };
    }
  }
}

export const executionSandbox = ExecutionSandbox.getInstance();
