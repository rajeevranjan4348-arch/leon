import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, CheckCircle2, XCircle, AlertTriangle, ShieldAlert, FileCode, ArrowRight, Activity } from 'lucide-react';
import { ImprovementProposal } from '@/ai/selfImprovement/types';
import { selfImprovementEngine } from '@/ai/selfImprovement/SelfImprovementEngine';
import { toast } from 'sonner';

interface ImprovementProposalCardProps {
  proposal: ImprovementProposal;
  onApplied?: () => void;
  onRejected?: () => void;
}

export const ImprovementProposalCard: React.FC<ImprovementProposalCardProps> = ({
  proposal: initialProposal,
  onApplied,
  onRejected,
}) => {
  const [proposal, setProposal] = useState<ImprovementProposal>(initialProposal);
  const [isApplying, setIsApplying] = useState(false);

  const handleApply = async () => {
    setIsApplying(true);
    try {
      const result = await selfImprovementEngine.applyApprovedProposal(proposal.id);
      if (result.success) {
        setProposal(prev => ({ ...prev, status: 'APPLIED' }));
        toast.success(`Applied Improvement: ${proposal.title}`);
        onApplied?.();
      } else {
        toast.error(`Failed to apply proposal: ${result.message}`);
      }
    } catch (err: any) {
      toast.error(`Error: ${err?.message || 'Failed to apply proposal'}`);
    } finally {
      setIsApplying(false);
    }
  };

  const handleReject = () => {
    selfImprovementEngine.rejectProposal(proposal.id, 'User rejected proposal from UI card');
    setProposal(prev => ({ ...prev, status: 'REJECTED' }));
    toast.info('Improvement proposal dismissed.');
    onRejected?.();
  };

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'HIGH':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/30';
      case 'MEDIUM':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/30';
      default:
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="my-4 rounded-xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 via-neutral-900/90 to-neutral-950/90 p-4 sm:p-5 shadow-lg backdrop-blur-md text-neutral-100"
    >
      <div className="flex items-center justify-between gap-3 border-b border-neutral-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
              ⚡ Improvement Proposal Detected
            </span>
            <h4 className="text-base font-medium text-neutral-100">{proposal.title}</h4>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md border ${getRiskBadge(proposal.riskLevel)}`}>
            {proposal.riskLevel} Risk
          </span>
          <span className="text-[10px] font-mono text-neutral-500">ID: {proposal.id}</span>
        </div>
      </div>

      <div className="mt-4 space-y-3 text-xs sm:text-sm text-neutral-300">
        <div>
          <span className="font-semibold text-neutral-200">Problem:</span>
          <p className="mt-0.5 text-neutral-300 bg-neutral-900/60 p-2 rounded-lg border border-neutral-800/60 font-mono text-xs">
            {proposal.problem}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <span className="font-semibold text-neutral-300">Observed Behavior:</span>
            <p className="mt-0.5 text-neutral-400 text-xs">{proposal.observedBehavior}</p>
          </div>
          <div>
            <span className="font-semibold text-neutral-300">Expected Behavior:</span>
            <p className="mt-0.5 text-neutral-300 text-xs">{proposal.expectedBehavior}</p>
          </div>
        </div>

        <div>
          <span className="font-semibold text-neutral-200">Cause:</span>
          <p className="mt-0.5 text-neutral-300 text-xs">{proposal.rootCause}</p>
        </div>

        <div>
          <span className="font-semibold text-neutral-200">Proposed Fix:</span>
          <p className="mt-0.5 text-indigo-200 text-xs bg-indigo-950/30 p-2.5 rounded-lg border border-indigo-800/40 font-mono">
            {proposal.proposedChange}
          </p>
        </div>

        {proposal.affectedFiles && proposal.affectedFiles.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-xs font-semibold text-neutral-400 flex items-center gap-1">
              <FileCode className="h-3.5 w-3.5" /> Affected Modules:
            </span>
            {proposal.affectedFiles.map((file, idx) => (
              <span key={idx} className="bg-neutral-800/70 text-neutral-300 px-2 py-0.5 rounded text-[11px] font-mono border border-neutral-700/50">
                {file}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-neutral-800/80 pt-3.5">
        <span className="text-xs text-neutral-400 font-medium">
          Apply this improvement?
        </span>

        {proposal.status === 'PENDING' && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleReject}
              className="px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-neutral-200 bg-neutral-800/60 hover:bg-neutral-800 rounded-lg transition-colors"
            >
              Dismiss
            </button>
            <button
              onClick={handleApply}
              disabled={isApplying}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-all shadow-md hover:shadow-indigo-500/25 disabled:opacity-50"
            >
              {isApplying ? (
                <>Applying...</>
              ) : (
                <>
                  <Zap className="h-3.5 w-3.5 text-amber-300 fill-amber-300" /> Apply Improvement
                </>
              )}
            </button>
          </div>
        )}

        {proposal.status === 'APPLIED' && (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">
            <CheckCircle2 className="h-4 w-4" /> Improvement Applied & Memory Saved
          </div>
        )}

        {proposal.status === 'REJECTED' && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 bg-neutral-800/40 px-3 py-1 rounded-lg">
            <XCircle className="h-4 w-4" /> Proposal Dismissed
          </div>
        )}
      </div>
    </motion.div>
  );
};
