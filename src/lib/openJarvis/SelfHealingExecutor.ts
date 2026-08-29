/**
 * SelfHealingExecutor - Open Jarvis Self-Healing Execution & Healing Prompt Generator
 * Ported from com.openjarvis.agent.SelfHealingExecutor
 */

import { OpenJarvisAction } from './types';
import { LLMResponseValidator } from './LLMResponseValidator';

export interface ExecutionContext {
  expectedState?: string;
  phaseId?: string;
  previousPhaseOutcome?: string;
  screenBefore?: string;
}

export type ExecutionResult =
  | { success: true; message: string }
  | { success: false; reason: string };

export class SelfHealingExecutor {
  private maxAttempts = 3;

  public async executeWithHealing(
    action: OpenJarvisAction,
    context: ExecutionContext,
    executorFn: (act: OpenJarvisAction) => Promise<ExecutionResult>,
    llmReflectorFn?: (system: string, user: string) => Promise<string>,
    attempt = 1
  ): Promise<ExecutionResult> {
    const result = await executorFn(action);

    if (result.success) {
      return result;
    }

    if (!result.success) {
      const failReason = 'reason' in result ? result.reason : 'Execution failed';
      if (attempt >= this.maxAttempts) {
        return {
          success: false,
          reason: `Action failed after ${this.maxAttempts} attempts: ${failReason}`,
        };
      }
    }

    // Build self-healing prompt
    const healingPrompt = this.buildHealingPrompt(action, context, attempt);

    if (llmReflectorFn) {
      try {
        const altLlmResponse = await llmReflectorFn(healingPrompt.system, healingPrompt.user);
        const validation = LLMResponseValidator.validate(altLlmResponse);
        if (validation.isValid && validation.actions.length > 0) {
          const alternativeAction = validation.actions[0];
          return this.executeWithHealing(alternativeAction, context, executorFn, llmReflectorFn, attempt + 1);
        }
      } catch (e) {
        // Fallback retry
      }
    }

    // Exponential backoff attempt
    await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    return this.executeWithHealing(action, context, executorFn, llmReflectorFn, attempt + 1);
  }

  private buildHealingPrompt(
    action: OpenJarvisAction,
    context: ExecutionContext,
    attempt: number
  ): { system: string; user: string } {
    const system = `Action failed: ${action.action} on ${action.packageName || action.label || 'target'}
Expected to see: ${context.expectedState || 'task completion'}
Attempt: ${attempt}/${this.maxAttempts}
Diagnose what went wrong and respond with ONLY a single alternative JSON action object.`;

    const user = `The action failed. Provide one alternative action JSON to recover.`;
    return { system, user };
  }
}

export const selfHealingExecutor = new SelfHealingExecutor();
