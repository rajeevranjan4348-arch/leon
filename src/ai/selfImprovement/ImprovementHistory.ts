/**
 * BerriAI Self-Improving Agent Improvement History
 * Audits and displays chronological self-improvement history, proposals, and lessons.
 */

import { ImprovementAuditLog, ImprovementProposal, LearnedLesson } from './types';
import { proposalStore } from './ProposalStore';
import { lessonStore } from './LessonStore';

const LOCAL_STORAGE_KEY_AUDIT = 'berri_ai_improvement_audit_logs';

export class ImprovementHistory {
  private static instance: ImprovementHistory;

  private constructor() {}

  public static getInstance(): ImprovementHistory {
    if (!ImprovementHistory.instance) {
      ImprovementHistory.instance = new ImprovementHistory();
    }
    return ImprovementHistory.instance;
  }

  /**
   * Get all audit logs
   */
  public getAuditLogs(): ImprovementAuditLog[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY_AUDIT);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Append an audit log entry
   */
  public logAction(
    action: ImprovementAuditLog['action'],
    proposalId: string,
    details: string
  ): ImprovementAuditLog {
    const logs = this.getAuditLogs();
    const entry: ImprovementAuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      action,
      proposalId,
      details,
    };
    logs.unshift(entry);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY_AUDIT, JSON.stringify(logs.slice(0, 100)));
      } catch {}
    }
    return entry;
  }

  /**
   * Returns a complete report of current system self-improvement state
   */
  public getSummaryReport(): {
    pendingProposalsCount: number;
    appliedProposalsCount: number;
    totalLessonsCount: number;
    proposals: ImprovementProposal[];
    lessons: LearnedLesson[];
    recentAudits: ImprovementAuditLog[];
  } {
    const proposals = proposalStore.getAllProposals();
    const lessons = lessonStore.getAllLessons();
    const recentAudits = this.getAuditLogs().slice(0, 10);

    return {
      pendingProposalsCount: proposals.filter(p => p.status === 'PENDING').length,
      appliedProposalsCount: proposals.filter(p => p.status === 'APPLIED').length,
      totalLessonsCount: lessons.length,
      proposals,
      lessons,
      recentAudits,
    };
  }
}

export const improvementHistory = ImprovementHistory.getInstance();
