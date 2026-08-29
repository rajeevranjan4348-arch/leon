import React, { useState } from 'react';
import { Sparkles, CheckCircle2, XCircle, AlertTriangle, ShieldCheck, ArrowRight, FileCode, Clock } from 'lucide-react';
import { ImprovementProposal } from '@/ai/selfImprovement/types';
import { selfImprovementEngine } from '@/ai/selfImprovement';
import { toast } from 'sonner';

interface ImprovementProposalCardProps {
  proposal: ImprovementProposal;
  onApplied?: () => void;
  onRejected?: () => void;
}

export const ImprovementProposalCard: React.FC<ImprovementProposalCardProps> = ({
  proposal,
  onApplied,
  onRejected,
}) => {
  const [status, setStatus] = useState(proposal.status);
  const [isApplying, setIsApplying] = useState(false);

  const handleApply = async () => {
    setIsApplying(true);
    try {
      const res = await selfImprovementEngine.applyApprovedProposal(proposal.id);
      if (res.success) {
        setStatus('APPLIED');
        toast.success(`Improvement applied! Saved lesson to memory.`);
        onApplied?.();
      } else {
        setStatus('FAILED');
        toast.error(`Failed to apply improvement: ${res.message}`);
      }
    } catch (err: any) {
      toast.error(`Error applying proposal: ${err?.message}`);
    } finally {
      setIsApplying(false);
    }
  };

  const handleReject = () => {
    selfImprovementEngine.rejectProposal(proposal.id, 'User rejected in UI');
    setStatus('REJECTED');
    toast.info('Proposal rejected.');
    onRejected?.();
  };

  return (
    <div className="my-4 p-4 rounded-xl border border-amber-500/30 bg-amber-950/20 backdrop-blur-md text-white shadow-lg space-y-3 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
          <Sparkles className="w-4 h-4 animate-pulse" />
          <span>⚡ Improvement Proposal ({proposal.id})</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider font-bold ${
              proposal.riskLevel === 'HIGH'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : proposal.riskLevel === 'MEDIUM'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            {proposal.riskLevel || 'LOW'} RISK
          </span>
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase ${
              status === 'APPLIED'
                ? 'bg-emerald-500/20 text-emerald-400'
                : status === 'REJECTED'
                ? 'bg-red-500/20 text-red-400'
                : 'bg-amber-500/20 text-amber-300'
            }`}
          >
            {status}
          </span>
        </div>
      </div>

      {/* Problem & Root Cause */}
      <div className="space-y-1.5 text-xs text-white/90">
        <div>
          <span className="font-semibold text-amber-300">Problem: </span>
          <span>{proposal.problem}</span>
        </div>
        <div>
          <span className="font-semibold text-amber-300">Root Cause: </span>
          <span>{proposal.rootCause}</span>
        </div>
        <div>
          <span className="font-semibold text-emerald-300">Proposed Fix: </span>
          <span>{proposal.proposedChange}</span>
        </div>
        {proposal.expectedBenefit && (
          <div>
            <span className="font-semibold text-blue-300">Expected Benefit: </span>
            <span>{proposal.expectedBenefit}</span>
          </div>
        )}
      </div>

      {/* Affected Files */}
      {proposal.affectedFiles && proposal.affectedFiles.length > 0 && (
        <div className="flex items-center gap-1.5 text-[11px] text-white/60 bg-black/20 p-2 rounded-lg font-mono">
          <FileCode className="w-3.5 h-3.5 shrink-0 text-amber-400" />
          <span className="truncate">Files: {proposal.affectedFiles.join(', ')}</span>
        </div>
      )}

      {/* Action Buttons */}
      {status === 'PENDING' ? (
        <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
          <button
            onClick={handleReject}
            disabled={isApplying}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
          >
            <XCircle className="w-3.5 h-3.5" />
            Reject
          </button>
          <button
            onClick={handleApply}
            disabled={isApplying}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-black shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {isApplying ? 'Applying Improvement...' : 'Apply This Improvement'}
          </button>
        </div>
      ) : status === 'APPLIED' ? (
        <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>Improvement applied successfully. Lesson stored in persistent memory.</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 p-2 rounded-lg border border-red-500/20">
          <XCircle className="w-4 h-4 shrink-0" />
          <span>Proposal was rejected or failed.</span>
        </div>
      )}
    </div>
  );
};
