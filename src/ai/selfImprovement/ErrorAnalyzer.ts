/**
 * BerriAI Self-Improving Agent Error Analyzer
 * Analyzes root cause, responsible module/tool, observed vs expected behavior,
 * and determines risk level and proposal parameters.
 */

import { ExecutionContext, EvaluationResult, RiskLevel, FailureCategory } from './types';

export interface ErrorAnalysis {
  title: string;
  problem: string;
  observedBehavior: string;
  expectedBehavior: string;
  rootCause: string;
  affectedFiles: string[];
  proposedChange: string;
  riskLevel: RiskLevel;
  expectedBenefit: string;
  testPlan: string;
  toolInvolved: string;
  failureCategory: FailureCategory;
}

export class ErrorAnalyzer {
  private static instance: ErrorAnalyzer;

  private constructor() {}

  public static getInstance(): ErrorAnalyzer {
    if (!ErrorAnalyzer.instance) {
      ErrorAnalyzer.instance = new ErrorAnalyzer();
    }
    return ErrorAnalyzer.instance;
  }

  /**
   * Performs root cause analysis for a failure
   */
  public analyze(context: ExecutionContext, evaluation: EvaluationResult): ErrorAnalysis {
    const tool = context.toolName || 'unknown_tool';
    const query = context.userQuery || 'system action';
    const reason = evaluation.reason || 'Unexpected output or failure occurred';
    const category = evaluation.failureCategory || 'TOOL_FAILURE';

    let title = `Fix ${tool} execution behavior`;
    let problem = `Execution of "${query}" using ${tool} failed: ${reason}`;
    let observedBehavior = `The tool ${tool} returned an unsuccessful result or error: ${reason}`;
    let expectedBehavior = `The tool ${tool} should successfully process "${query}" and return expected output.`;
    let rootCause = `Improper intent mapping, invalid resolution logic, or missing fallback handling in ${tool}.`;
    let affectedFiles = [`src/controllers/appController.ts`, `src/lib/launcher/UniversalAppLauncher.ts`];
    let proposedChange = `Add direct validation and resilient fallback handling for ${tool}.`;
    let riskLevel: RiskLevel = 'LOW';
    let expectedBenefit = `Reliable execution of ${tool} commands without unexpected errors or fallbacks.`;
    let testPlan = `Execute "${query}" via ${tool} and verify successful execution output.`;

    // Category-specific analysis refinements
    if (category === 'APP_LAUNCH_FAILURE' || tool === 'open_app') {
      title = `Improve ${query} Application Launch Intent Resolution`;
      problem = `Launching "${query}" triggered an unexpected fallback or failed resolution.`;
      observedBehavior = `The launcher resolved web/market intent instead of launching installed package or returned: ${reason}`;
      expectedBehavior = `Directly launch installed Android package for "${query}" using FLAG_ACTIVITY_NEW_TASK.`;
      rootCause = `The resolver prioritized market/web schemes or fallback URLs instead of installed package name mapping.`;
      affectedFiles = [
        `src/lib/launcher/AppResolver.ts`,
        `src/lib/launcher/UniversalAppLauncher.ts`,
        `src/controllers/appController.ts`
      ];
      proposedChange = `Enforce installed package verification in AppResolver before attempting web or Play Store fallbacks.`;
      riskLevel = 'LOW';
      expectedBenefit = `Instant, accurate launch of installed applications for voice and chat commands.`;
      testPlan = `Test voice & chat commands "open ${query}" and confirm direct application open.`;
    } else if (category === 'VOICE_FAILURE') {
      title = `Enhance Voice Command Parsing & Dispatch`;
      problem = `Voice input "${query}" was misclassified or failed during execution.`;
      observedBehavior = `Voice command router failed with reason: ${reason}`;
      expectedBehavior = `Accurately match voice command intent and execute target controller action.`;
      rootCause = `Strict regex or keyword parsing missed voice input variance.`;
      affectedFiles = [`src/voice/voiceCommandRouter.ts`];
      proposedChange = `Add fuzzy phrase matching for voice command router.`;
      riskLevel = 'LOW';
      expectedBenefit = `Improved voice command recognition accuracy across all audio inputs.`;
      testPlan = `Speak "${query}" and verify correct tool dispatch.`;
    } else if (category === 'REPEATED_MISTAKE') {
      title = `Prevent Repeated Failure in ${tool}`;
      problem = `Repeated identical failure detected when running ${tool}.`;
      observedBehavior = `Failed ${reason}`;
      expectedBehavior = `Identify and prevent recursive errors across chat turns.`;
      rootCause = `Missing lesson context in agent prompt or unhandled edge case in ${tool}.`;
      affectedFiles = [`src/lib/communicationAgent/actionToolRegistry.ts`];
      proposedChange = `Inject learned lesson constraint into prompt and update ${tool} exception handler.`;
      riskLevel = 'MEDIUM';
      expectedBenefit = `Zero recurrence of repeated execution errors.`;
      testPlan = `Re-run test scenario for ${tool} and verify error suppression.`;
    }

    return {
      title,
      problem,
      observedBehavior,
      expectedBehavior,
      rootCause,
      affectedFiles,
      proposedChange,
      riskLevel,
      expectedBenefit,
      testPlan,
      toolInvolved: tool,
      failureCategory: category,
    };
  }
}

export const errorAnalyzer = ErrorAnalyzer.getInstance();
