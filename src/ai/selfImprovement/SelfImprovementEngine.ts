/**
 * BerriAI Self-Improving Agent Central Engine
 * Main entry point for evaluation loop, failure analysis, proposal lifecycle,
 * and memory injection for AI agent requests.
 */

import { ExecutionContext, EvaluationResult, ImprovementProposal, LearnedLesson } from './types';
import { failureDetector } from './FailureDetector';
import { proposalGenerator } from './ProposalGenerator';
import { proposalStore } from './ProposalStore';
import { lessonStore } from './LessonStore';
import { proposalApplier, ApplicationResult } from './ProposalApplier';
import { improvementHistory } from './ImprovementHistory';

export class SelfImprovementEngine {
  private static instance: SelfImprovementEngine;

  private constructor() {}

  public static getInstance(): SelfImprovementEngine {
    if (!SelfImprovementEngine.instance) {
      SelfImprovementEngine.instance = new SelfImprovementEngine();
    }
    return SelfImprovementEngine.instance;
  }

  /**
   * Main Evaluation Loop:
   * Called after tool execution to evaluate result, detect failure,
   * analyze root cause, and create a human-approvable proposal if needed.
   */
  public async evaluateExecution(context: ExecutionContext): Promise<{
    evaluated: EvaluationResult;
    proposal?: ImprovementProposal;
  }> {
    // 1. Detect if failure occurred
    const evaluated = failureDetector.evaluate(context);

    if (evaluated.isSuccess || !evaluated.shouldProposeImprovement) {
      return { evaluated };
    }

    // 2. Generate structured improvement proposal
    const proposal = proposalGenerator.generateProposal(context, evaluated);

    // 3. Log audit event
    improvementHistory.logAction(
      'PROPOSAL_CREATED',
      proposal.id,
      `Generated improvement proposal for "${context.userQuery}" (Tool: ${context.toolName || 'general'})`
    );

    return {
      evaluated,
      proposal,
    };
  }

  /**
   * Retrieve relevant lessons to inject into AI prompt context before executing a user request
   */
  public getPromptLessonContext(query: string, feature?: string): string {
    const lessons = lessonStore.retrieveRelevantLessons(query, feature);
    if (lessons.length === 0) return '';

    const lessonText = lessons
      .map((l, index) => `${index + 1}. [Lesson for ${l.toolInvolved}] Problem: ${l.problem} -> Correct Fix: ${l.solution}`)
      .join('\n');

    return `\n\n### ⚡ PREVIOUS LEARNED LESSONS (DO NOT REPEAT PAST MISTAKES):\n${lessonText}\n`;
  }

  /**
   * Write an improvement proposal manually or programmatically
   */
  public createProposal(params: {
    title: string;
    problem: string;
    observedBehavior: string;
    expectedBehavior: string;
    rootCause: string;
    affectedFiles: string[];
    proposedChange: string;
    riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
    expectedBenefit: string;
    testPlan: string;
    toolInvolved?: string;
  }): ImprovementProposal {
    const proposal = proposalGenerator.createCustomProposal(params);
    improvementHistory.logAction(
      'PROPOSAL_CREATED',
      proposal.id,
      `Manually generated improvement proposal: "${proposal.title}"`
    );
    return proposal;
  }

  /**
   * Apply an approved proposal after user consent
   */
  public async applyApprovedProposal(proposalId: string): Promise<ApplicationResult> {
    const result = await proposalApplier.applyProposal(proposalId);
    if (result.success) {
      improvementHistory.logAction(
        'PROPOSAL_APPLIED',
        proposalId,
        `Applied proposal "${proposalId}" and saved lesson.`
      );
    } else {
      improvementHistory.logAction(
        'PROPOSAL_FAILED',
        proposalId,
        `Failed to apply proposal: ${result.message}`
      );
    }
    return result;
  }

  /**
   * Reject a proposal
   */
  public rejectProposal(proposalId: string, reason?: string): boolean {
    const rejected = proposalApplier.rejectProposal(proposalId, reason);
    if (rejected) {
      improvementHistory.logAction(
        'PROPOSAL_REJECTED',
        proposalId,
        `User rejected proposal ${proposalId}`
      );
    }
    return rejected;
  }

  /**
   * Get all pending proposals requiring human approval
   */
  public getPendingProposals(): ImprovementProposal[] {
    return proposalStore.getPendingProposals();
  }

  /**
   * Get all proposals
   */
  public getAllProposals(): ImprovementProposal[] {
    return proposalStore.getAllProposals();
  }

  /**
   * Get all learned lessons
   */
  public getAllLessons(): LearnedLesson[] {
    return lessonStore.getAllLessons();
  }

  /**
   * Get full summary report for auditing/UI
   */
  public getSummaryReport() {
    return improvementHistory.getSummaryReport();
  }
}

export const selfImprovementEngine = SelfImprovementEngine.getInstance();
