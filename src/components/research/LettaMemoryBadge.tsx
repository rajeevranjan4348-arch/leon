import React, { useMemo } from 'react';
import { Brain, Sparkles, Database, Layers, ArrowUpRight, Check, Shield, Activity, Zap, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { LettaStore } from '@/lib/letta/LettaStore';

export interface LettaMemoryInfo {
  hasMemoryInfluence: boolean;
  confidenceScore?: number; // 0.0 to 1.0 (or 0 to 100)
  influenceLevel?: 'High' | 'Medium' | 'Low' | 'Subtle';
  retrievedPassagesCount?: number;
  retrievedPassages?: Array<{
    id?: string;
    content: string;
    score: number;
    tags?: string[];
    source?: string;
  }>;
  coreMemoryUsed?: boolean;
  coreHumanSnippet?: string;
  coreProjectSnippet?: string;
  coreMemoryUpdates?: string[];
  agentName?: string;
  timestamp?: string;
}

interface LettaMemoryBadgeProps {
  lettaMemory?: LettaMemoryInfo;
  content?: string;
  userPrompt?: string;
  isStreaming?: boolean;
  onOpenMemoryModal?: () => void;
  className?: string;
}

/**
 * Calculates a normalized confidence score (0 to 100) and influence rating
 * based on passage retrieval scores, core memory anchors, and content keyword overlap.
 */
function calculateMemoryIntensity(
  info: LettaMemoryInfo,
  responseContent: string = '',
  prompt: string = ''
): { score: number; level: 'High' | 'Medium' | 'Low' | 'Subtle'; label: string; colorClass: string; barGradient: string } {
  // If explicitly pre-computed
  if (typeof info.confidenceScore === 'number' && info.confidenceScore > 0) {
    const norm = info.confidenceScore > 1 ? Math.min(100, Math.round(info.confidenceScore)) : Math.min(100, Math.round(info.confidenceScore * 100));
    return getIntensityMeta(norm);
  }

  let baseScore = 0;
  const passages = info.retrievedPassages || [];

  if (passages.length > 0) {
    // Top passage score contributes heavily (up to 55%)
    const maxScore = Math.max(...passages.map(p => p.score || 0));
    const normalizedMax = maxScore > 1 ? maxScore / 100 : maxScore;
    baseScore += normalizedMax * 55;

    // Number of recalled passages adds up to 15%
    baseScore += Math.min(15, passages.length * 5);
  }

  // Core memory anchor presence adds 15-20%
  if (info.coreMemoryUsed || info.coreHumanSnippet || info.coreProjectSnippet) {
    baseScore += 18;
  }

  // Core memory updates in this turn adds 10%
  if (info.coreMemoryUpdates && info.coreMemoryUpdates.length > 0) {
    baseScore += 12;
  }

  // Content keyword check if response directly quotes or mirrors memory terms
  if (responseContent && passages.length > 0) {
    const combinedPassageText = passages.map(p => p.content.toLowerCase()).join(' ');
    const memoryKeywords = combinedPassageText.split(/\s+/).filter(w => w.length > 4);
    const lowerContent = responseContent.toLowerCase();
    
    let matchedKeywords = 0;
    for (const kw of memoryKeywords.slice(0, 20)) {
      if (lowerContent.includes(kw)) {
        matchedKeywords++;
      }
    }
    if (matchedKeywords > 0) {
      baseScore += Math.min(15, matchedKeywords * 3);
    }
  }

  // Clamp between 25 and 98 for realistic organic display
  const finalScore = Math.min(98, Math.max(28, Math.round(baseScore)));
  return getIntensityMeta(finalScore);
}

function getIntensityMeta(score: number): {
  score: number;
  level: 'High' | 'Medium' | 'Low' | 'Subtle';
  label: string;
  colorClass: string;
  barGradient: string;
} {
  if (score >= 75) {
    return {
      score,
      level: 'High',
      label: 'High Influence',
      colorClass: 'text-fuchsia-300 border-fuchsia-500/40 bg-fuchsia-950/40',
      barGradient: 'from-purple-500 via-fuchsia-400 to-pink-400',
    };
  } else if (score >= 52) {
    return {
      score,
      level: 'Medium',
      label: 'Moderate Anchor',
      colorClass: 'text-purple-300 border-purple-500/35 bg-purple-950/40',
      barGradient: 'from-indigo-500 via-purple-400 to-fuchsia-400',
    };
  } else if (score >= 35) {
    return {
      score,
      level: 'Low',
      label: 'Subtle Grounding',
      colorClass: 'text-purple-300/80 border-purple-500/25 bg-purple-950/20',
      barGradient: 'from-indigo-600 via-purple-500 to-purple-400',
    };
  } else {
    return {
      score,
      level: 'Subtle',
      label: 'Context Hint',
      colorClass: 'text-slate-300 border-slate-700 bg-slate-900/40',
      barGradient: 'from-slate-600 to-purple-500/70',
    };
  }
}

export const LettaMemoryBadge: React.FC<LettaMemoryBadgeProps> = ({
  lettaMemory,
  content = '',
  userPrompt = '',
  isStreaming = false,
  onOpenMemoryModal,
  className = '',
}) => {
  // If no explicit lettaMemory prop was provided, derive memory influence from active Letta store
  const resolvedMemoryInfo: LettaMemoryInfo | null = useMemo(() => {
    if (isStreaming) return null;

    if (lettaMemory && lettaMemory.hasMemoryInfluence) {
      return lettaMemory;
    }

    // Fallback detection: check if LettaStore has archival passages relevant to the query or human profile
    if (!userPrompt || userPrompt.trim().length < 3) return null;

    try {
      const agent = LettaStore.getOrCreateAgent();
      const passages = LettaStore.searchArchivalPassages(agent.id, userPrompt, 2);
      const highRelevancePassages = passages.filter(p => p.score > 0.45);
      
      const humanCore = agent.coreMemory?.human;
      const hasCore = Boolean(
        humanCore && 
        humanCore.trim().length > 0 && 
        !humanCore.toLowerCase().includes('no user constraints')
      );
      
      const projectCore = agent.coreMemory?.project_context;
      const hasProject = Boolean(projectCore && projectCore.trim().length > 0);

      if (highRelevancePassages.length > 0 || hasCore || hasProject) {
        return {
          hasMemoryInfluence: true,
          retrievedPassagesCount: highRelevancePassages.length,
          retrievedPassages: highRelevancePassages.map(p => ({
            id: p.passage.id,
            content: p.passage.content,
            score: p.score,
            tags: p.passage.tags,
            source: p.passage.metadata?.source || p.passage.metadata?.fileName || 'Archival Memory',
          })),
          coreMemoryUsed: hasCore || hasProject,
          coreHumanSnippet: hasCore ? humanCore : undefined,
          coreProjectSnippet: hasProject ? projectCore : undefined,
          agentName: agent.name || 'Letta Agent',
          timestamp: new Date().toISOString(),
        };
      }
    } catch {
      // Ignore fallback lookup errors
    }

    return null;
  }, [lettaMemory, userPrompt, isStreaming]);

  const intensity = useMemo(() => {
    if (!resolvedMemoryInfo) return null;
    return calculateMemoryIntensity(resolvedMemoryInfo, content, userPrompt);
  }, [resolvedMemoryInfo, content, userPrompt]);

  if (isStreaming || !resolvedMemoryInfo || !resolvedMemoryInfo.hasMemoryInfluence || !intensity) {
    return null;
  }

  const passagesCount = resolvedMemoryInfo.retrievedPassages?.length || resolvedMemoryInfo.retrievedPassagesCount || 0;
  const hasCore = resolvedMemoryInfo.coreMemoryUsed;
  const updates = resolvedMemoryInfo.coreMemoryUpdates || [];

  return (
    <div className={cn("relative inline-flex items-center gap-1.5", className)}>
      <HoverCard openDelay={100} closeDelay={180}>
        <HoverCardTrigger asChild>
          <button
            type="button"
            id="letta-memory-transparency-badge"
            onClick={(e) => {
              e.stopPropagation();
              onOpenMemoryModal?.();
            }}
            className={cn(
              "inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-wide shadow-sm cursor-pointer transition-all select-none group border",
              intensity.score >= 75
                ? "bg-purple-950/50 border-purple-500/40 text-purple-200 hover:bg-purple-900/60 hover:border-purple-400/80 shadow-[0_0_14px_rgba(192,132,252,0.25)]"
                : "bg-purple-950/30 border-purple-500/30 text-purple-300 hover:bg-purple-900/40 hover:border-purple-400/50 shadow-[0_0_10px_rgba(168,85,247,0.12)]"
            )}
            title={`Letta Memory: ${intensity.label} (${intensity.score}% intensity). Click to open Memory Console`}
            aria-label={`Letta Memory Influence: ${intensity.score}%`}
          >
            {/* Brain Icon */}
            <div className="w-3.5 h-3.5 rounded-full bg-purple-500/30 border border-purple-400/60 flex items-center justify-center text-purple-200 shrink-0 shadow-sm group-hover:scale-110 transition-transform">
              <Brain size={10} className={cn("text-purple-200", intensity.score >= 75 && "animate-pulse")} />
            </div>

            <span className="font-semibold text-purple-200">Letta Memory</span>

            {/* Visual Intensity Bar & Percentage Indicator */}
            <div className="flex items-center gap-1.5 pl-0.5 border-l border-purple-500/25">
              {/* Mini Segmented / Continuous Intensity Bar */}
              <div className="w-9 h-1.5 bg-black/40 rounded-full overflow-hidden p-[1px] border border-purple-500/30 flex items-center">
                <div 
                  className={cn(
                    "h-full rounded-full bg-gradient-to-r transition-all duration-500",
                    intensity.barGradient
                  )}
                  style={{ width: `${intensity.score}%` }}
                />
              </div>

              {/* Confidence Score Pill */}
              <span className="text-[10px] text-purple-300 font-mono font-bold bg-purple-950/80 px-1 py-0.5 rounded border border-purple-500/30 leading-none">
                {intensity.score}%
              </span>
            </div>
          </button>
        </HoverCardTrigger>

        <HoverCardContent 
          className="w-88 sm:w-96 p-4 bg-[#0c0c16]/95 border border-purple-500/40 rounded-2xl shadow-2xl backdrop-blur-2xl z-50 text-xs text-slate-100 text-left animate-in fade-in zoom-in-95"
          align="start"
          side="top"
          sideOffset={8}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-purple-500/20">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 flex items-center justify-center shrink-0 shadow-inner">
                <Brain size={17} className="text-purple-300" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-purple-200 text-xs">Letta Memory Grounding</h4>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300">
                    Tiered OS
                  </span>
                </div>
                <p className="text-[10px] text-purple-300/70">Context transparency & response shaping</p>
              </div>
            </div>

            {onOpenMemoryModal && (
              <button
                type="button"
                onClick={onOpenMemoryModal}
                className="text-[10px] flex items-center gap-1 text-purple-300 hover:text-white px-2 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/30 border border-purple-500/30 transition-colors font-medium cursor-pointer"
              >
                <span>Console</span>
                <ArrowUpRight size={11} />
              </button>
            )}
          </div>

          {/* Memory Confidence / Intensity Gauge Box */}
          <div className="p-3 rounded-xl bg-purple-950/50 border border-purple-500/25 mb-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Activity size={13} className="text-purple-400" />
                <span className="text-[11px] font-semibold text-purple-200">Influence Intensity</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", intensity.colorClass)}>
                  {intensity.label}
                </span>
                <span className="text-xs font-mono font-bold text-fuchsia-300">
                  {intensity.score}%
                </span>
              </div>
            </div>

            {/* Gauge Progress Track */}
            <div className="relative w-full h-2.5 bg-black/50 rounded-full overflow-hidden border border-purple-500/30 p-[1px]">
              <div 
                className={cn(
                  "h-full rounded-full bg-gradient-to-r transition-all duration-700 relative",
                  intensity.barGradient
                )}
                style={{ width: `${intensity.score}%` }}
              >
                {intensity.score >= 75 && (
                  <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
                )}
              </div>
            </div>

            <div className="flex justify-between items-center text-[9px] text-slate-400 font-mono pt-0.5">
              <span>0% Subtle</span>
              <span>50% Anchor</span>
              <span>100% Determinative</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed mb-3">
            This AI response was shaped by persistent Letta memory blocks and semantic archival retrieval to maintain personal continuity across conversations.
          </p>

          {/* 1. Archival Passages Recalled */}
          {resolvedMemoryInfo.retrievedPassages && resolvedMemoryInfo.retrievedPassages.length > 0 && (
            <div className="space-y-2 mb-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-purple-300/90 uppercase tracking-wider flex items-center gap-1">
                  <Database size={11} className="text-purple-400" />
                  Recalled Archival Passages ({resolvedMemoryInfo.retrievedPassages.length})
                </span>
              </div>

              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                {resolvedMemoryInfo.retrievedPassages.map((passage, idx) => {
                  const matchPct = Math.min(100, Math.round((passage.score > 1 ? passage.score : passage.score * 100)));
                  return (
                    <div 
                      key={passage.id || idx}
                      className="p-2 rounded-xl bg-purple-950/40 border border-purple-500/20 text-[11px] space-y-1 hover:border-purple-500/40 transition-colors"
                    >
                      <div className="flex items-center justify-between text-[9px] text-purple-300/70 font-mono">
                        <span className="truncate max-w-[170px] text-purple-200">
                          {passage.source || `Passage #${idx + 1}`}
                        </span>
                        <div className="flex items-center gap-1">
                          <div className="w-12 h-1 bg-black/40 rounded-full overflow-hidden border border-purple-500/20">
                            <div 
                              className="h-full bg-purple-400 rounded-full" 
                              style={{ width: `${matchPct}%` }}
                            />
                          </div>
                          <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">
                            {matchPct}%
                          </span>
                        </div>
                      </div>

                      <p className="text-slate-200/90 text-[10.5px] leading-snug line-clamp-2 italic">
                        "{passage.content}"
                      </p>

                      {passage.tags && passage.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {passage.tags.slice(0, 3).map((tag, tIdx) => (
                            <span key={tIdx} className="text-[9px] px-1 rounded bg-white/5 text-purple-300/80 font-mono">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Core Memory Influences */}
          {resolvedMemoryInfo.coreHumanSnippet && (
            <div className="pt-2 pb-1 border-t border-white/5 space-y-1">
              <span className="text-[10px] font-semibold text-purple-300/90 uppercase tracking-wider flex items-center gap-1">
                <Layers size={11} className="text-purple-400" />
                Human Profile Grounding
              </span>
              <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-[10.5px] text-slate-300 font-mono leading-relaxed line-clamp-2">
                {resolvedMemoryInfo.coreHumanSnippet}
              </div>
            </div>
          )}

          {/* 3. New Self-Learned Updates in This Turn */}
          {updates.length > 0 && (
            <div className="pt-2 border-t border-white/5 space-y-1">
              <span className="text-[10px] font-semibold text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                <Sparkles size={11} className="text-emerald-400" />
                New Knowledge Saved
              </span>
              <div className="flex flex-col gap-1">
                {updates.map((update, uIdx) => (
                  <div key={uIdx} className="flex items-center gap-1.5 text-[10.5px] text-emerald-200">
                    <Check size={11} className="text-emerald-400 shrink-0" />
                    <span className="truncate">{update}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Note */}
          <div className="mt-3 pt-2 border-t border-purple-500/20 flex items-center justify-between text-[9px] text-slate-400">
            <span className="flex items-center gap-1">
              <Shield size={10} className="text-purple-400" />
              Client-Encrypted Letta Engine
            </span>
            {onOpenMemoryModal && (
              <button
                type="button"
                onClick={onOpenMemoryModal}
                className="text-purple-300 hover:text-purple-100 hover:underline cursor-pointer font-medium"
              >
                Inspect Full Brain &rarr;
              </button>
            )}
          </div>
        </HoverCardContent>
      </HoverCard>
    </div>
  );
};
