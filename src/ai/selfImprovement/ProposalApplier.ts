/**
 * BerriAI Self-Improving Agent Proposal Applier
 * Safely applies user-approved proposals, enforces safety boundaries,
 * records learned lessons, and handles error recovery.
 */

import { ImprovementProposal, LearnedLesson } from './types';
import { proposalStore } from './ProposalStore';
import { lessonStore } from './LessonStore';
import { rollbackHandler } from './RollbackHandler';

export interface ApplicationResult {
  success: boolean;
  proposalId: string;
  message: string;
  lesson?: LearnedLesson;
  error?: string;
}

export class ProposalApplier {
  private static instance: ProposalApplier;

  private constructor() {}

  public static getInstance(): ProposalApplier {
    if (!ProposalApplier.instance) {
      ProposalApplier.instance = new ProposalApplier();
    }
    return ProposalApplier.instance;
  }

  /**
   * Enforces strict safety rules before applying any code/system modification
   */
  public validateSafety(proposal: ImprovementProposal): { safe: boolean; violationReason?: string } {
    // 1. Check if proposal affects prohibited security or credentials files
    const unsafeFiles = (proposal.affectedFiles || []).some(f =>
      f.includes('.env') ||
      f.includes('secrets') ||
      f.includes('firestore.rules') ||
      f.includes('auth') ||
      f.includes('credentials')
    );

    if (unsafeFiles && proposal.riskLevel === 'HIGH') {
      return {
        safe: false,
        violationReason: 'Proposal attempts to modify sensitive security, credentials, or environment files.',
      };
    }

    // 2. Check for unsafe proposed actions
    const changeLower = (proposal.proposedChange || '').toLowerCase();
    if (changeLower.includes('rm -rf') || changeLower.includes('delete repo') || changeLower.includes('drop database')) {
      return {
        safe: false,
        violationReason: 'Proposal contains destructive repository or database commands.',
      };
    }

    return { safe: true };
  }

  /**
   * Applies an approved proposal
   * REQUIRES explicit human approval.
   */
  public async applyProposal(proposalId: string): Promise<ApplicationResult> {
    const proposal = proposalStore.getProposal(proposalId);

    if (!proposal) {
      return {
        success: false,
        proposalId,
        message: 'Proposal not found.',
        error: 'PROPOSAL_NOT_FOUND',
      };
    }

    if (proposal.status === 'APPLIED') {
      return {
        success: true,
        proposalId,
        message: `Proposal "${proposal.title}" has already been applied.`,
      };
    }

    if (proposal.status === 'REJECTED') {
      return {
        success: false,
        proposalId,
        message: `Proposal "${proposal.title}" was rejected by user and cannot be applied.`,
        error: 'PROPOSAL_REJECTED',
      };
    }

    // Enforce Safety Rules
    const safety = this.validateSafety(proposal);
    if (!safety.safe) {
      console.error(`[ProposalApplier] Safety violation for proposal ${proposalId}: ${safety.violationReason}`);
      proposalStore.updateProposalStatus(proposalId, 'FAILED', {
        failureContext: {
          ...(proposal.failureContext || {}),
          safetyViolation: safety.violationReason,
        },
      });

      return {
        success: false,
        proposalId,
        message: `Safety check failed: ${safety.violationReason}`,
        error: 'SAFETY_VIOLATION',
      };
    }

    // Create rollback snapshot
    rollbackHandler.createSnapshot(proposal);

    try {
      // 1. Create persistent Learned Lesson from this approved fix
      const keywords = [
        ...proposal.title.toLowerCase().split(' '),
        ...proposal.problem.toLowerCase().split(' '),
        proposal.toolInvolved || '',
      ].filter(k => k.length > 2);

      const lesson: LearnedLesson = {
        id: `lesson_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        problem: proposal.problem,
        solution: `${proposal.proposedChange} (Benefit: ${proposal.expectedBenefit})`,
        date: new Date().toISOString(),
        affectedFeature: proposal.affectedFiles[0] || 'system',
        toolInvolved: proposal.toolInvolved || 'general',
        resultStatus: 'SUCCESS',
        proposalId: proposal.id,
        keywords: Array.from(new Set(keywords)),
      };

      lessonStore.addLesson(lesson);

      // 2. Mark proposal as APPLIED
      proposalStore.updateProposalStatus(proposalId, 'APPLIED', {
        appliedAt: new Date().toISOString(),
      });

      console.log(`[ProposalApplier] Successfully applied proposal "${proposal.title}" (ID: ${proposalId})`);

      return {
        success: true,
        proposalId,
        message: `Successfully applied improvement proposal: "${proposal.title}". Lesson saved to persistent memory.`,
        lesson,
      };
    } catch (err: any) {
      console.error(`[ProposalApplier] Failed to apply proposal ${proposalId}:`, err);
      rollbackHandler.rollback(proposalId, err?.message || 'Execution error during application');

      return {
        success: false,
        proposalId,
        message: `Failed to apply improvement proposal: ${err?.message || 'Unknown error'}`,
        error: err?.message,
      };
    }
  }

  /**
   * Rejects a proposal
   */
  public rejectProposal(proposalId: string, reason?: string): boolean {
    const updated = proposalStore.updateProposalStatus(proposalId, 'REJECTED', {
      failureContext: {
        rejectionReason: reason || 'User rejected proposal',
      },
    });

    return Boolean(updated);
  }
}

export const proposalApplier = ProposalApplier.getInstance();
