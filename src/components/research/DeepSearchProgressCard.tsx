import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Globe, 
  SlidersHorizontal, 
  FileText, 
  Clock, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Edit3, 
  Play, 
  RotateCw, 
  AlertTriangle, 
  X, 
  Plus, 
  Trash2,
  ExternalLink,
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DeepResearchProgress } from '@/types/deepResearch';

interface DeepSearchProgressCardProps {
  progress: DeepResearchProgress;
  onStart?: () => void;
  onEditPlan?: (newPlanItems: string[], newTitle: string) => void;
  onRetry?: () => void;
  isInteractive?: boolean;
}

export const DeepSearchProgressCard: React.FC<DeepSearchProgressCardProps> = ({
  progress,
  onStart,
  onEditPlan,
  onRetry,
  isInteractive = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editedTitle, setEditedTitle] = useState(progress.title || 'Deep Research Plan');
  const [editedItems, setEditedItems] = useState<string[]>(
    progress.planItems && progress.planItems.length > 0
      ? progress.planItems
      : ['(1) Analyze core concepts and definitions', '(2) Search authoritative literature and primary web sources', '(3) Cross-verify empirical findings and synthesize report']
  );

  const {
    step,
    title,
    planItems = [],
    sourcesFound = 0,
    sourcesRead = 0,
    round = 1,
    totalRounds = 3,
    sources = [],
    queries = [],
    isStarted = false,
    errorMessage,
  } = progress;

  // Determine active step index: 0 = Research Websites, 1 = Analyze Results, 2 = Create Report
  const getStepStatus = (stepIndex: number) => {
    if (step === 'completed') return 'completed';
    if (step === 'error') return 'error';

    if (stepIndex === 0) {
      if (step === 'planning') return 'pending';
      if (step === 'searching') return 'active';
      return 'completed';
    }
    if (stepIndex === 1) {
      if (step === 'planning' || step === 'searching') return 'pending';
      if (step === 'analyzing') return 'active';
      return 'completed';
    }
    if (stepIndex === 2) {
      if (step === 'reporting') return 'active';
      return 'pending';
    }
    return 'pending';
  };

  const handleSavePlan = () => {
    if (onEditPlan) {
      onEditPlan(editedItems.filter(i => i.trim().length > 0), editedTitle);
    }
    setIsEditModalOpen(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-2xl my-4 rounded-[28px] bg-[#1c1c20] border border-white/10 p-5 sm:p-6 text-white/90 shadow-2xl backdrop-blur-xl relative overflow-hidden"
    >
      {/* ── Top Main Research Title ── */}
      <div className="mb-4">
        <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
          {title || 'Deep Research'}
        </h3>
      </div>

      {/* ── Step-by-Step Vertical Timeline ── */}
      <div className="relative border-l-2 border-white/15 ml-3 pl-6 space-y-6 my-5">
        
        {/* ── STEP 1: Research Websites ── */}
        <div className="relative">
          {/* Step Icon Badge */}
          <div className="absolute -left-[35px] top-0 flex items-center justify-center w-6 h-6 rounded-md bg-[#25252a] text-white/80 border border-white/10 shadow-sm">
            {getStepStatus(0) === 'completed' ? (
              <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
            ) : getStepStatus(0) === 'active' ? (
              <Globe size={14} className="text-sky-400 animate-pulse shrink-0" />
            ) : (
              <Globe size={14} className="text-white/60 shrink-0" />
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h4 className={cn(
                "text-base font-semibold tracking-wide flex items-center gap-2",
                getStepStatus(0) === 'active' ? "text-sky-300 font-bold" : "text-white/90"
              )}>
                Research Websites
                {getStepStatus(0) === 'active' && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 animate-pulse">
                    Round {round} of {totalRounds}
                  </span>
                )}
              </h4>
            </div>

            {/* Plan Bullets / Overview */}
            <div className="text-xs sm:text-sm text-white/70 leading-relaxed space-y-1.5 font-normal">
              {planItems.length > 0 ? (
                planItems.map((item, idx) => (
                  <p key={idx} className="line-clamp-2">
                    {item}
                  </p>
                ))
              ) : (
                <p className="line-clamp-3">
                  (1) Define target scope, analyze foundational concepts, and inspect authoritative sources...
                </p>
              )}
            </div>

            {/* Active Searching Subtext when searching */}
            {getStepStatus(0) === 'active' && queries.length > 0 && (
              <div className="mt-2.5 p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-medium text-sky-300">
                  <Search size={13} className="animate-spin" />
                  <span>Searching: "{queries[queries.length - 1]}"</span>
                </div>
                <div className="text-[11px] text-white/60">
                  Found {sourcesFound} relevant sources • Analyzed {sourcesRead}
                </div>
              </div>
            )}

            {/* Expandable "More" Toggle */}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-1 text-xs font-medium text-white/60 hover:text-white underline underline-offset-4 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>{isExpanded ? 'Less' : 'More'}</span>
              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {/* Expanded Detailed Breakdown */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="mt-3 pt-3 border-t border-white/10 space-y-3 overflow-hidden"
                >
                  {/* Executed Queries */}
                  {queries.length > 0 && (
                    <div>
                      <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider block mb-1.5">
                        Search Queries ({queries.length})
                      </span>
                      <div className="space-y-1">
                        {queries.map((q, idx) => (
                          <div key={idx} className="text-xs text-white/80 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5 flex items-center gap-2">
                            <Search size={12} className="text-sky-400 shrink-0" />
                            <span className="truncate">{q}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sources Status List */}
                  <div>
                    <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider block mb-1.5">
                      Inspected Sources ({sources.length > 0 ? sources.length : sourcesFound})
                    </span>

                    {sources.length > 0 ? (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 smooth-scrollbar">
                        {sources.map((src, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-2 text-xs p-2 rounded-xl bg-white/5 border border-white/5">
                            <div className="flex items-center gap-2 min-w-0">
                              {src.status === 'analyzed' && (
                                <span className="text-emerald-400 font-bold">✓</span>
                              )}
                              {src.status === 'reading' && (
                                <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                              )}
                              {src.status === 'pending' && (
                                <span className="w-2 h-2 rounded-full bg-white/30" />
                              )}
                              {src.status === 'error' && (
                                <span className="text-amber-400 font-bold">⚠</span>
                              )}
                              <span className="font-medium text-white/90 truncate">{src.name}</span>
                            </div>

                            <span className="text-[10px] text-white/50 shrink-0 uppercase tracking-wider">
                              {src.status === 'analyzed' ? 'analyzed' : src.status === 'reading' ? 'reading' : 'pending'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-white/50 italic py-1">
                        {sourcesFound > 0 ? `${sourcesFound} sources identified in knowledge index` : 'Gathering web sources...'}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── STEP 2: Analyze Results ── */}
        <div className="relative">
          <div className="absolute -left-[35px] top-0 flex items-center justify-center w-6 h-6 rounded-md bg-[#25252a] text-white/80 border border-white/10 shadow-sm">
            {getStepStatus(1) === 'completed' ? (
              <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
            ) : getStepStatus(1) === 'active' ? (
              <SlidersHorizontal size={14} className="text-sky-400 animate-pulse shrink-0" />
            ) : (
              <SlidersHorizontal size={14} className="text-white/40 shrink-0" />
            )}
          </div>

          <div>
            <h4 className={cn(
              "text-base font-semibold tracking-wide",
              getStepStatus(1) === 'active' ? "text-sky-300 font-bold" : "text-white/80"
            )}>
              Analyze Results
            </h4>

            {getStepStatus(1) === 'active' && (
              <div className="mt-1 text-xs text-white/70 space-y-1">
                <p className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
                  <span>Comparing cross-verified facts and extracting key findings...</span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── STEP 3: Create Report ── */}
        <div className="relative">
          <div className="absolute -left-[35px] top-0 flex items-center justify-center w-6 h-6 rounded-md bg-[#25252a] text-white/80 border border-white/10 shadow-sm">
            {getStepStatus(2) === 'completed' ? (
              <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
            ) : getStepStatus(2) === 'active' ? (
              <FileText size={14} className="text-sky-400 animate-pulse shrink-0" />
            ) : (
              <FileText size={14} className="text-white/40 shrink-0" />
            )}
          </div>

          <div>
            <h4 className={cn(
              "text-base font-semibold tracking-wide",
              getStepStatus(2) === 'completed' ? "text-emerald-400 font-bold" : getStepStatus(2) === 'active' ? "text-sky-300 font-bold" : "text-white/80"
            )}>
              {getStepStatus(2) === 'completed' ? 'Report Ready' : 'Create Report'}
            </h4>

            {getStepStatus(2) === 'active' && (
              <p className="mt-1 text-xs text-white/70 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
                <span>Formatting comprehensive report & inserting verified citations...</span>
              </p>
            )}
          </div>
        </div>

      </div>

      {/* ── Bottom Status & Start/Edit Action Bar ── */}
      <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3 flex-wrap">
        
        {/* Status Indicator */}
        <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-white/80">
          <Clock size={16} className="text-white/60 shrink-0" />
          <span>
            {step === 'completed' ? (
              <span className="text-emerald-400 font-semibold">Research complete</span>
            ) : step === 'error' ? (
              <span className="text-amber-400 font-semibold">Research paused</span>
            ) : step === 'planning' && !isStarted ? (
              'Ready in a few mins'
            ) : (
              <span className="text-sky-300 flex items-center gap-1.5">
                <span>Researching</span>
                <span className="inline-flex gap-0.5">
                  <span className="w-1 h-1 rounded-full bg-sky-300 animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1 h-1 rounded-full bg-sky-300 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1 h-1 rounded-full bg-sky-300 animate-bounce" />
                </span>
              </span>
            )}
          </span>
        </div>

        {/* Action Controls */}
        {isInteractive && (
          <div className="flex items-center gap-3 ml-auto">
            {step === 'error' ? (
              <button
                type="button"
                onClick={onRetry}
                className="px-4 py-2 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer shadow-lg"
              >
                <RotateCw size={14} />
                <span>Retry</span>
              </button>
            ) : !isStarted || step === 'planning' ? (
              <>
                {/* Edit Button */}
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(true)}
                  className="text-xs sm:text-sm font-semibold text-white/80 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Edit3 size={14} />
                  <span>Edit</span>
                </button>

                {/* Start Pill Button — Matches exact light blue rounded style from screenshot */}
                <button
                  type="button"
                  onClick={onStart}
                  className="px-6 py-2 rounded-full bg-[#8ab4f8] hover:bg-[#a1c3ff] active:scale-95 text-[#0d1117] font-bold text-sm sm:text-base transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <span>Start</span>
                </button>
              </>
            ) : null}
          </div>
        )}
      </div>

      {/* ── Edit Research Plan Modal ── */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#222228] border border-white/15 rounded-3xl p-5 sm:p-6 w-full max-w-lg shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <Edit3 size={16} className="text-sky-400" />
                  <span>Customize Research Plan</span>
                </h4>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-white/50 hover:text-white p-1 rounded-full cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Research Title Edit */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-white/60">Research Title / Topic</label>
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-400"
                />
              </div>

              {/* Research Plan Items */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-white/60">Research Objectives</label>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1 smooth-scrollbar">
                  {editedItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={item}
                        onChange={(e) => {
                          const updated = [...editedItems];
                          updated[idx] = e.target.value;
                          setEditedItems(updated);
                        }}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-sky-400"
                      />
                      <button
                        type="button"
                        onClick={() => setEditedItems(editedItems.filter((_, i) => i !== idx))}
                        className="p-2 text-red-400/70 hover:text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setEditedItems([...editedItems, `(${editedItems.length + 1}) Add objective...`])}
                  className="mt-1 text-xs text-sky-400 font-semibold hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Add Research Objective</span>
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-white/60 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePlan}
                  className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-bold text-xs cursor-pointer shadow-md"
                >
                  Save Plan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
