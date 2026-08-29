/**
 * BerriAI Self-Improving Agent Proposal Store
 * Manages persistent storage, state transitions, and retrieval of improvement proposals.
 */

import { ImprovementProposal, ProposalStatus } from './types';

const LOCAL_STORAGE_KEY_PROPOSALS = 'berri_ai_improvement_proposals';

export class ProposalStore {
  private static instance: ProposalStore;

  private constructor() {}

  public static getInstance(): ProposalStore {
    if (!ProposalStore.instance) {
      ProposalStore.instance = new ProposalStore();
    }
    return ProposalStore.instance;
  }

  /**
   * Get all proposals from persistent local storage
   */
  public getAllProposals(): ImprovementProposal[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY_PROPOSALS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.warn('[ProposalStore] Failed to parse stored proposals:', err);
      return [];
    }
  }

  /**
   * Save all proposals array to storage
   */
  private saveAll(proposals: ImprovementProposal[]): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_PROPOSALS, JSON.stringify(proposals));
    } catch (err) {
      console.warn('[ProposalStore] Failed to write proposals to localStorage:', err);
    }
  }

  /**
   * Add a new improvement proposal
   */
  public addProposal(proposal: ImprovementProposal): ImprovementProposal {
    const all = this.getAllProposals();
    const existingIndex = all.findIndex(p => p.id === proposal.id);
    if (existingIndex >= 0) {
      all[existingIndex] = { ...all[existingIndex], ...proposal };
    } else {
      all.unshift(proposal);
    }
    this.saveAll(all);
    return proposal;
  }

  /**
   * Get a single proposal by ID
   */
  public getProposal(id: string): ImprovementProposal | null {
    const all = this.getAllProposals();
    return all.find(p => p.id === id) || null;
  }

  /**
   * Get all proposals waiting for human approval
   */
  public getPendingProposals(): ImprovementProposal[] {
    return this.getAllProposals().filter(p => p.status === 'PENDING');
  }

  /**
   * Update the status of a proposal
   */
  public updateProposalStatus(
    id: string,
    status: ProposalStatus,
    additionalUpdates?: Partial<ImprovementProposal>
  ): ImprovementProposal | null {
    const all = this.getAllProposals();
    const index = all.findIndex(p => p.id === id);
    if (index === -1) return null;

    const updated: ImprovementProposal = {
      ...all[index],
      ...additionalUpdates,
      status,
      ...(status === 'APPLIED' ? { appliedAt: new Date().toISOString() } : {}),
      ...(status === 'REJECTED' ? { rejectedAt: new Date().toISOString() } : {}),
    };

    all[index] = updated;
    this.saveAll(all);
    return updated;
  }

  /**
   * Delete a proposal
   */
  public deleteProposal(id: string): boolean {
    const all = this.getAllProposals();
    const filtered = all.filter(p => p.id !== id);
    if (filtered.length !== all.length) {
      this.saveAll(filtered);
      return true;
    }
    return false;
  }

  /**
   * Clear all proposals
   */
  public clearProposals(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(LOCAL_STORAGE_KEY_PROPOSALS);
    }
  }
}

export const proposalStore = ProposalStore.getInstance();
