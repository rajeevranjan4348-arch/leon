/**
 * BerriAI Self-Improving Agent Failure Detector
 * Evaluates execution outputs, error conditions, user feedback, and tool responses
 * to detect actionable failures and repeated mistakes.
 */

import { ExecutionContext, EvaluationResult, FailureCategory } from './types';

export class FailureDetector {
  private static instance: FailureDetector;
  private recentFailures: ExecutionContext[] = [];

  private constructor() {}

  public static getInstance(): FailureDetector {
    if (!FailureDetector.instance) {
      FailureDetector.instance = new FailureDetector();
    }
    return FailureDetector.instance;
  }

  /**
   * Evaluates an execution context to determine if a failure occurred
   */
  public evaluate(context: ExecutionContext): EvaluationResult {
    const { toolName, toolResult, error, userFeedback, userQuery } = context;

    // 1. Explicit Error Exception
    if (error) {
      this.recordFailure(context);
      return {
        isSuccess: false,
        failureCategory: 'API_ERROR',
        reason: typeof error === 'string' ? error : error?.message || 'Execution threw an unhandled exception.',
        shouldProposeImprovement: true,
        confidence: 0.95,
      };
    }

    // 2. Tool Result Failure Response
    if (toolResult && typeof toolResult === 'object') {
      // Check explicit success: false
      if (toolResult.success === false) {
        const category: FailureCategory =
          toolResult.reason === 'APP_NOT_INSTALLED' || toolName === 'open_app'
            ? 'APP_LAUNCH_FAILURE'
            : toolName?.includes('voice')
            ? 'VOICE_FAILURE'
            : toolName?.includes('memory')
            ? 'MEMORY_FAILURE'
            : 'TOOL_FAILURE';

        const reason = toolResult.message || toolResult.error || `Tool ${toolName || 'action'} returned success: false`;
        this.recordFailure(context);

        // Do not trigger code proposal if app is genuinely not installed
        const isGenuineMissingApp = toolResult.reason === 'APP_NOT_INSTALLED' && !toolResult.isAmbiguous;
        
        return {
          isSuccess: false,
          failureCategory: category,
          reason,
          shouldProposeImprovement: !isGenuineMissingApp,
          confidence: 0.9,
        };
      }
    }

    // 3. Negative User Feedback / Correction Detection
    if (userFeedback) {
      const fbLower = userFeedback.toLowerCase();
      const isNegativeFeedback =
        fbLower.includes("didn't work") ||
        fbLower.includes('wrong app') ||
        fbLower.includes('opened wrong') ||
        fbLower.includes('failed') ||
        fbLower.includes('incorrect') ||
        fbLower.includes('not working') ||
        fbLower.includes('try again') ||
        fbLower.includes('error');

      if (isNegativeFeedback) {
        this.recordFailure(context);
        return {
          isSuccess: false,
          failureCategory: 'USER_CORRECTION',
          reason: `User reported failure: "${userFeedback}"`,
          shouldProposeImprovement: true,
          confidence: 0.85,
        };
      }
    }

    // 4. Check for Repeated Failures for the same tool/query
    if (toolName) {
      const matchCount = this.recentFailures.filter(
        f => f.toolName === toolName && (f.userQuery.toLowerCase() === userQuery.toLowerCase() || Math.abs((f.executionTimeMs || 0) - (context.executionTimeMs || 0)) < 5000)
      ).length;

      if (matchCount >= 2) {
        return {
          isSuccess: false,
          failureCategory: 'REPEATED_MISTAKE',
          reason: `Tool "${toolName}" failed ${matchCount + 1} times repeatedly for query "${userQuery}"`,
          shouldProposeImprovement: true,
          confidence: 0.98,
        };
      }
    }

    // Default Success
    return {
      isSuccess: true,
      shouldProposeImprovement: false,
      confidence: 1.0,
    };
  }

  /**
   * Track recent failures in memory (max 20)
   */
  private recordFailure(context: ExecutionContext): void {
    this.recentFailures.unshift(context);
    if (this.recentFailures.length > 20) {
      this.recentFailures.pop();
    }
  }

  /**
   * Get recorded failures
   */
  public getRecordedFailures(): ExecutionContext[] {
    return [...this.recentFailures];
  }

  /**
   * Clear recorded failures
   */
  public clearFailures(): void {
    this.recentFailures = [];
  }
}

export const failureDetector = FailureDetector.getInstance();
