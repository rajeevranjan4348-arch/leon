/**
 * BerriAI Self-Improving Agent Rollback Handler
 * Manages state backups and reverts changes if an applied proposal fails verification.
 */

import { ImprovementProposal } from './types';
import { proposalStore } from './ProposalStore';

export interface BackedUpState {
  proposalId: string;
  timestamp: string;
  affectedFiles: string[];
  notes: string;
}

export class RollbackHandler {
  private static instance: RollbackHandler;
  private backups: Map<string, BackedUpState> = new Map();

  private constructor() {}

  public static getInstance(): RollbackHandler {
    if (!RollbackHandler.instance) {
      RollbackHandler.instance = new RollbackHandler();
    }
    return RollbackHandler.instance;
  }

  /**
   * Create a rollback snapshot before applying a proposal
   */
  public createSnapshot(proposal: ImprovementProposal): BackedUpState {
    const snapshot: BackedUpState = {
      proposalId: proposal.id,
      timestamp: new Date().toISOString(),
      affectedFiles: [...proposal.affectedFiles],
      notes: `Pre-apply backup for proposal "${proposal.title}"`,
    };
    this.backups.set(proposal.id, snapshot);
    console.log(`[RollbackHandler] Created snapshot for proposal ${proposal.id}`);
    return snapshot;
  }

  /**
   * Rollback an applied proposal if tests or execution fail after application
   */
  public rollback(proposalId: string, errorReason: string): boolean {
    const proposal = proposalStore.getProposal(proposalId);
    if (!proposal) return false;

    console.warn(`[RollbackHandler] Rolling back proposal ${proposalId}: ${errorReason}`);

    proposalStore.updateProposalStatus(proposalId, 'FAILED', {
      failureContext: {
        ...(proposal.failureContext || {}),
        rollbackReason: errorReason,
        rolledBackAt: new Date().toISOString(),
      },
    });

    this.backups.delete(proposalId);
    return true;
  }
}

export const rollbackHandler = RollbackHandler.getInstance();
