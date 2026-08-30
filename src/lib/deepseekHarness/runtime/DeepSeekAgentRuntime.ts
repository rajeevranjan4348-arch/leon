/**
 * DeepSeek Harness - Core Agent Runtime & Orchestration Engine
 * Implements the full lifecycle:
 * User Request -> Intent/Goal -> Planning -> Tool/Plugin Selection -> Execution -> Observation -> Validation -> Next Step -> Final Result
 * MIT License
 */

import {
  HarnessExecutionResult,
  HarnessPlan,
  HarnessPlanStep,
  HarnessToolResult,
  ToolExecutionContext,
  ModelMessage,
} from '../types';
import { TaskStateMachine } from './TaskStateMachine';
import { harnessPlanner } from '../planner/HarnessPlanner';
import { harnessToolRegistry } from '../tools/HarnessToolRegistry';
import { harnessPluginRegistry } from '../plugins/HarnessPluginRegistry';
import { harnessSessionManager } from '../session/HarnessSessionManager';
import { modelAdapterManager } from '../models/ModelAdapter';
import { harnessEventBus } from '../events/HarnessEventBus';

export interface AgentRuntimeOptions {
  sessionId?: string;
  modelAdapterId?: string;
  maxExecutionSteps?: number;
  parallelExecution?: boolean;
  signal?: AbortSignal;
  onStepProgress?: (step: HarnessPlanStep, plan: HarnessPlan) => void;
  onTokenChunk?: (chunk: string) => void;
}

export class DeepSeekAgentRuntime {
  private static instance: DeepSeekAgentRuntime;
  private activeTasks: Map<string, AbortController> = new Map();

  private constructor() {}

  public static getInstance(): DeepSeekAgentRuntime {
    if (!DeepSeekAgentRuntime.instance) {
      DeepSeekAgentRuntime.instance = new DeepSeekAgentRuntime();
    }
    return DeepSeekAgentRuntime.instance;
  }

  /**
   * Execute an objective through the DeepSeek Harness agent lifecycle.
   */
  public async executeTask(
    objective: string,
    options: AgentRuntimeOptions = {}
  ): Promise<HarnessExecutionResult> {
    const startTime = performance.now();
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const sessionId = options.sessionId || 'default-session';
    const maxSteps = options.maxExecutionSteps || 10;

    const session = harnessSessionManager.getOrCreateSession(sessionId);
    const stateMachine = new TaskStateMachine(taskId, sessionId);
    const abortController = new AbortController();

    // Register active abort controller for cancellation
    this.activeTasks.set(taskId, abortController);
    if (options.signal) {
      options.signal.addEventListener('abort', () => abortController.abort(options.signal?.reason), { once: true });
    }

    const errors: Array<{ stepId?: string; error: string; timestamp: number }> = [];
    let toolCallsCount = 0;
    let finalAnswer = '';

    harnessEventBus.emit('agent.started', { taskId, objective, sessionId }, { sessionId, taskId });

    try {
      // 1. INTENT & PLANNING
      stateMachine.transition('PLANNING', 'Analyzing user objective and formulating DAG execution plan');
      const plan = await harnessPlanner.createPlan(objective, sessionId);
      harnessSessionManager.setSessionObjective(sessionId, objective, plan);

      // 2. STEP-BY-STEP EXECUTION LOOP
      stateMachine.transition('EXECUTING', 'Beginning step-by-step tool execution loop');
      
      const executedStepResults = new Map<string, HarnessToolResult>();

      for (let i = 0; i < plan.steps.length; i++) {
        // Check for loop limit or cancellation
        if (i >= maxSteps) {
          throw new Error(`Max step execution limit (${maxSteps}) reached. Halting to prevent runaway loop.`);
        }
        if (abortController.signal.aborted) {
          stateMachine.transition('CANCELLED', 'Task was aborted by user/system signal');
          break;
        }

        const step = plan.steps[i];

        // Check if prerequisite steps completed
        if (step.dependencies && step.dependencies.length > 0) {
          const allPrereqsMet = step.dependencies.every((depId) => {
            const depResult = executedStepResults.get(depId);
            return depResult && depResult.success;
          });

          if (!allPrereqsMet) {
            step.status = 'skipped';
            step.error = 'Prerequisite dependency failed or was skipped.';
            continue;
          }
        }

        step.status = 'running';
        step.startedAt = Date.now();
        options.onStepProgress?.(step, plan);

        harnessEventBus.emit('agent.step.started', {
          taskId,
          stepId: step.id,
          title: step.title,
          tool: step.assignedTool,
        }, { sessionId, taskId });

        // Tool Execution Context
        const context: ToolExecutionContext = {
          sessionId,
          taskId,
          stepId: step.id,
          signal: abortController.signal,
          scratchpad: session.scratchpad,
          logger: (msg, level) => {
            harnessSessionManager.logExecution(sessionId, step.title, level === 'error' ? 'error' : 'success', msg, step.id);
          },
        };

        // Execute Plugin lifecycle hooks: beforeStep
        await harnessPluginRegistry.executeBeforeStepHooks(step, context);

        let stepSuccess = false;
        let stepResult: HarnessToolResult = { success: false };

        if (step.assignedTool) {
          stateMachine.transition('WAITING_FOR_TOOL', `Executing tool '${step.assignedTool}' for step ${step.id}`);
          toolCallsCount++;

          // Execute tool with retry loop
          while (step.retryCount <= step.maxRetries && !stepSuccess && !abortController.signal.aborted) {
            stepResult = await harnessToolRegistry.executeTool(
              step.assignedTool,
              step.inputArguments || {},
              context
            );

            // 3. OBSERVATION & VALIDATION
            stateMachine.transition('OBSERVING', `Observing execution result of tool '${step.assignedTool}'`);

            if (stepResult.success) {
              stepSuccess = true;
              stateMachine.transition('VALIDATING', `Validating output for step ${step.id}`);
            } else {
              step.retryCount++;
              errors.push({
                stepId: step.id,
                error: stepResult.error || 'Tool execution failed',
                timestamp: Date.now(),
              });

              if (step.retryCount <= step.maxRetries && stepResult.retryable !== false) {
                stateMachine.transition('RECOVERING', `Retrying tool '${step.assignedTool}' (Attempt ${step.retryCount}/${step.maxRetries})`);
                await new Promise((resolve) => setTimeout(resolve, 500 * Math.pow(2, step.retryCount)));
              } else {
                break;
              }
            }
          }
        } else {
          // Direct LLM Evaluation step
          stepSuccess = true;
          stepResult = { success: true, message: 'Step evaluated successfully.' };
        }

        // Complete step status
        step.completedAt = Date.now();
        step.result = stepResult;
        step.status = stepSuccess ? 'completed' : 'failed';
        executedStepResults.set(step.id, stepResult);

        if (stepSuccess) {
          plan.completedSteps++;
        }

        // Execute Plugin lifecycle hooks: afterStep
        await harnessPluginRegistry.executeAfterStepHooks(step, stepResult, context);

        harnessEventBus.emit(stepSuccess ? 'agent.step.completed' : 'agent.step.failed', {
          taskId,
          stepId: step.id,
          success: stepSuccess,
          result: stepResult,
        }, { sessionId, taskId });

        options.onStepProgress?.(step, plan);

        // Check for loop condition
        if (harnessPlanner.detectPlanLoop(plan.steps)) {
          stateMachine.transition('FAILED', 'Loop detected: multiple identical tools failed repeatedly.');
          throw new Error('Agent loop detected: stopping execution to ensure safety.');
        }

        // Transition back to EXECUTING if more steps exist
        if (i < plan.steps.length - 1 && !stateMachine.isTerminal()) {
          stateMachine.transition('EXECUTING', 'Advancing to next execution step');
        }
      }

      // 4. SYNTHESIZE FINAL RESULT
      if (!abortController.signal.aborted) {
        plan.isComplete = plan.completedSteps === plan.totalSteps;
        finalAnswer = await this.synthesizeFinalAnswer(objective, plan, executedStepResults, options.modelAdapterId);

        stateMachine.transition(
          plan.completedSteps > 0 ? 'COMPLETED' : 'FAILED',
          'Agent task finalized and answer synthesized'
        );

        // Record assistant response in session history
        harnessSessionManager.addMessage(sessionId, {
          role: 'assistant',
          content: finalAnswer,
        });

        harnessEventBus.emit('task.completed', {
          taskId,
          objective,
          completedSteps: plan.completedSteps,
          totalSteps: plan.totalSteps,
        }, { sessionId, taskId });
      }

    } catch (err: any) {
      const errMsg = err?.message || String(err);
      errors.push({ error: errMsg, timestamp: Date.now() });
      if (!stateMachine.isTerminal()) {
        stateMachine.transition('FAILED', `Task error: ${errMsg}`);
      }

      finalAnswer = `Execution notice: The agent encountered an issue while processing your request: ${errMsg}`;
      harnessEventBus.emit('task.failed', { taskId, error: errMsg }, { sessionId, taskId });
    } finally {
      this.activeTasks.delete(taskId);
    }

    const duration = Math.round(performance.now() - startTime);

    return {
      sessionId,
      objective,
      status: stateMachine.getState() === 'COMPLETED' ? 'success' : stateMachine.getState() === 'CANCELLED' ? 'cancelled' : 'failed',
      finalAnswer,
      plan: session.activePlan,
      stepsExecuted: session.activePlan?.steps.filter((s) => s.status === 'completed' || s.status === 'failed').length || 0,
      totalDurationMs: duration,
      toolCallsCount,
      errors,
    };
  }

  /**
   * Cancel an active running task.
   */
  public cancelTask(taskId: string, reason: string = 'User requested cancellation'): boolean {
    const controller = this.activeTasks.get(taskId);
    if (controller) {
      controller.abort(new Error(reason));
      this.activeTasks.delete(taskId);
      harnessEventBus.emit('task.cancelled', { taskId, reason });
      return true;
    }
    return false;
  }

  /**
   * Synthesize final structured response from executed plan steps and findings.
   */
  private async synthesizeFinalAnswer(
    objective: string,
    plan: HarnessPlan,
    stepResults: Map<string, HarnessToolResult>,
    modelAdapterId?: string
  ): Promise<string> {
    const findings: string[] = [];

    stepResults.forEach((res, stepId) => {
      const step = plan.steps.find((s) => s.id === stepId);
      if (step && res.success) {
        if (res.message) {
          findings.push(`- **${step.title}**: ${res.message}`);
        } else if (res.data) {
          const strData = typeof res.data === 'object' ? JSON.stringify(res.data) : String(res.data);
          findings.push(`- **${step.title}**: ${strData.slice(0, 300)}`);
        }
      }
    });

    if (findings.length === 0) {
      // Direct model synthesis
      try {
        const adapter = modelAdapterManager.getAdapter(modelAdapterId);
        const modelRes = await adapter.generateResponse({
          messages: [{ role: 'user', content: objective }],
        });
        return modelRes.text;
      } catch {
        return `Task "${objective}" processed across ${plan.totalSteps} steps.`;
      }
    }

    return findings.join('\n\n');
  }
}

export const deepSeekAgentRuntime = DeepSeekAgentRuntime.getInstance();
