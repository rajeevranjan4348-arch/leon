/**
 * BerriAI Self-Improving Agent Proposal Generator
 * Generates structured, immutable improvement proposals requiring human approval.
 */

import { ImprovementProposal, ExecutionContext, EvaluationResult } from './types';
import { errorAnalyzer } from './ErrorAnalyzer';
import { proposalStore } from './ProposalStore';

export class ProposalGenerator {
  private static instance: ProposalGenerator;

  private constructor() {}

  public static getInstance(): ProposalGenerator {
    if (!ProposalGenerator.instance) {
      ProposalGenerator.instance = new ProposalGenerator();
    }
    return ProposalGenerator.instance;
  }

  /**
   * Generates a structured proposal from an execution context and evaluation
   */
  public generateProposal(
    context: ExecutionContext,
    evaluation: EvaluationResult
  ): ImprovementProposal {
    const analysis = errorAnalyzer.analyze(context, evaluation);
    const timestamp = Date.now();
    const id = `prop_${timestamp}_${Math.random().toString(36).substring(2, 7)}`;

    const proposal: ImprovementProposal = {
      id,
      title: analysis.title,
      problem: analysis.problem,
      observedBehavior: analysis.observedBehavior,
      expectedBehavior: analysis.expectedBehavior,
      rootCause: analysis.rootCause,
      affectedFiles: analysis.affectedFiles,
      proposedChange: analysis.proposedChange,
      riskLevel: analysis.riskLevel,
      expectedBenefit: analysis.expectedBenefit,
      testPlan: analysis.testPlan,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      toolInvolved: analysis.toolInvolved,
      failureCategory: analysis.failureCategory,
      failureContext: {
        userQuery: context.userQuery,
        toolArgs: context.toolArgs,
        toolResult: context.toolResult,
        error: context.error,
        userFeedback: context.userFeedback,
      },
    };

    proposalStore.addProposal(proposal);
    console.log(`[ProposalGenerator] Generated proposal "${proposal.title}" (ID: ${id})`);
    return proposal;
  }

  /**
   * Manually create a proposal with custom parameters
   */
  public createCustomProposal(params: {
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
    const id = `prop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const proposal: ImprovementProposal = {
      id,
      title: params.title,
      problem: params.problem,
      observedBehavior: params.observedBehavior,
      expectedBehavior: params.expectedBehavior,
      rootCause: params.rootCause,
      affectedFiles: params.affectedFiles,
      proposedChange: params.proposedChange,
      riskLevel: params.riskLevel || 'LOW',
      expectedBenefit: params.expectedBenefit,
      testPlan: params.testPlan,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      toolInvolved: params.toolInvolved,
    };

    proposalStore.addProposal(proposal);
    return proposal;
  }
}

export const proposalGenerator = ProposalGenerator.getInstance();
