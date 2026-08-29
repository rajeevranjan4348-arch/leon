/**
 * Ruflo Error Recovery & Self-Correction Engine
 * Intercepts subtask failures, performs error diagnosis, mutates execution strategy,
 * and coordinates peer-agent assistance or model fallbacks for self-healing swarms.
 * Inspired by Ruflo (https://github.com/ruvnet/ruflo)
 */

import { RufloSubtask, ErrorRecoveryStrategy, RufloAgentType } from './types';
import { eventBus } from './EventBus';

export class ErrorRecoveryEngine {
  private static instance: ErrorRecoveryEngine;

  public static getInstance(): ErrorRecoveryEngine {
    if (!ErrorRecoveryEngine.instance) {
      ErrorRecoveryEngine.instance = new ErrorRecoveryEngine();
    }
    return ErrorRecoveryEngine.instance;
  }

  /**
   * Evaluates a subtask failure and generates an adaptive recovery strategy.
   */
  public diagnoseAndFormulateStrategy(
    subtask: RufloSubtask,
    errorMessage: string,
    currentAttempt: number
  ): ErrorRecoveryStrategy {
    const lowerError = errorMessage.toLowerCase();

    // 1. Check for rate limit or API timeout -> Backoff and retry
    if (lowerError.includes('429') || lowerError.includes('rate limit') || lowerError.includes('timeout') || lowerError.includes('network')) {
      return {
        strategyName: 'retry_with_backoff',
        description: `Encountered transient network/rate-limit error. Exponential backoff retry applied.`,
        attempt: currentAttempt,
        maxAttempts: subtask.maxRetries,
      };
    }

    // 2. Syntax/Validation Error -> Code or Math mutation
    if (lowerError.includes('syntax') || lowerError.includes('parse') || lowerError.includes('bracket') || lowerError.includes('json')) {
      return {
        strategyName: 'subtask_mutation',
        description: `Syntax validation failed. Re-prompting agent with strict JSON/code schema constraints.`,
        attempt: currentAttempt,
        maxAttempts: subtask.maxRetries,
      };
    }

    // 3. Complex logic / Fact contradiction -> Peer Assistance from reviewer or researcher
    if (subtask.agentType === 'coder' || subtask.agentType === 'reasoner') {
      const helperAgent: RufloAgentType = subtask.agentType === 'coder' ? 'reviewer' : 'researcher';
      return {
        strategyName: 'peer_assistance',
        description: `Requesting peer assistance from ${helperAgent.toUpperCase()} to verify underlying assumptions.`,
        attempt: currentAttempt,
        maxAttempts: subtask.maxRetries,
        targetAgentType: helperAgent,
      };
    }

    // 4. Default -> Scope reduction & fallback
    return {
      strategyName: 'scope_reduction',
      description: `Simplifying subtask scope and enforcing fallback output schema.`,
      attempt: currentAttempt,
      maxAttempts: subtask.maxRetries,
    };
  }

  /**
   * Mutate a subtask prompt or execution context based on recovery strategy.
   */
  public applyRecoveryPromptMutation(originalPrompt: string, strategy: ErrorRecoveryStrategy, errorMsg: string): string {
    let mutated = originalPrompt;

    switch (strategy.strategyName) {
      case 'subtask_mutation':
        mutated += `\n\n[SELF-CORRECTION NOTICE]: Previous output had syntax/formatting errors ("${errorMsg}"). Ensure response strictly adheres to expected syntax and bracket balancing.`;
        break;
      case 'peer_assistance':
        mutated += `\n\n[PEER ASSISTANCE ADVICE]: Peer agent ${strategy.targetAgentType?.toUpperCase()} recommends focusing strictly on verifiable intermediate steps to avoid error ("${errorMsg}").`;
        break;
      case 'scope_reduction':
        mutated += `\n\n[SCOPE FALLBACK]: Simplify your response to focus purely on the core requirement of this subtask. Avoid unnecessary complexity.`;
        break;
      default:
        mutated += `\n\n[RETRY ATTEMPT ${strategy.attempt}]: Please resolve issue: ${errorMsg}`;
        break;
    }

    eventBus.emitTelemetry({
      type: 'error_recovery_attempt',
      message: `Self-Correction Applied: ${strategy.description}`,
      details: { strategy, errorMsg },
    });

    return mutated;
  }
}

export const errorRecoveryEngine = ErrorRecoveryEngine.getInstance();
