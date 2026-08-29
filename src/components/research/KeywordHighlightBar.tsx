import React, { useState, useMemo } from 'react';
import { Sparkles, Highlighter, X, Plus, Check, ChevronDown, ChevronUp, Search, Eye, EyeOff, Palette, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export type HighlightColor = 'amber' | 'cyan' | 'emerald' | 'purple';

export interface KeywordHighlightBarProps {
  keywords: string[];
  activeKeywords: string[];
  onToggleKeyword: (kw: string) => void;
  onAddCustomKeyword: (kw: string) => void;
  onRemoveKeyword: (kw: string) => void;
  onClearAll?: () => void;
  isHighlightEnabled: boolean;
  onToggleHighlightEnabled: () => void;
  colorVariant: HighlightColor;
  onChangeColorVariant: (color: HighlightColor) => void;
  content?: string;
}

export const KeywordHighlightBar: React.FC<KeywordHighlightBarProps> = ({
  keywords,
  activeKeywords,
  onToggleKeyword,
  onAddCustomKeyword,
  onRemoveKeyword,
  onClearAll,
  isHighlightEnabled,
  onToggleHighlightEnabled,
  colorVariant,
  onChangeColorVariant,
  content = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Compute occurrences for each keyword in the content
  const keywordStats = useMemo(() => {
    if (!content) return {};
    const stats: Record<string, number> = {};

    keywords.forEach((kw) => {
      try {
        const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        const matches = content.match(regex);
        stats[kw] = matches ? matches.length : 0;
      } catch {
        // Fallback simple substring match
        const lowerContent = content.toLowerCase();
        const lowerKw = kw.toLowerCase();
        let count = 0;
        let pos = lowerContent.indexOf(lowerKw);
        while (pos !== -1) {
          count++;
          pos = lowerContent.indexOf(lowerKw, pos + lowerKw.length);
        }
        stats[kw] = count;
      }
    });

    return stats;
  }, [content, keywords]);

  const totalMatches = useMemo(() => {
    return activeKeywords.reduce((acc, kw) => acc + (keywordStats[kw] || 0), 0);
  }, [activeKeywords, keywordStats]);

  const handleAddSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = customInput.trim();
    if (clean) {
      onAddCustomKeyword(clean);
      setCustomInput('');
      setIsAdding(false);
    }
  };

  if (keywords.length === 0 && !isAdding) {
    return null;
  }

  const colorStyles: Record<HighlightColor, { border: string; bg: string; text: string; badge: string }> = {
    amber: {
      border: 'border-amber-500/30',
      bg: 'bg-amber-500/10 hover:bg-amber-500/20',
      text: 'text-amber-300',
      badge: 'bg-amber-400/20 text-amber-200 border-amber-400/35',
    },
    cyan: {
      border: 'border-cyan-500/30',
      bg: 'bg-cyan-500/10 hover:bg-cyan-500/20',
      text: 'text-cyan-300',
      badge: 'bg-cyan-500/20 text-cyan-100 border-cyan-400/35',
    },
    emerald: {
      border: 'border-emerald-500/30',
      bg: 'bg-emerald-500/10 hover:bg-emerald-500/20',
      text: 'text-emerald-300',
      badge: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/35',
    },
    purple: {
      border: 'border-purple-500/30',
      bg: 'bg-purple-500/10 hover:bg-purple-500/20',
      text: 'text-purple-300',
      badge: 'bg-purple-500/20 text-purple-200 border-purple-400/35',
    },
  };

  const currentTheme = colorStyles[colorVariant] || colorStyles.amber;

  return (
    <div className="my-2.5 w-full">
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md text-xs">
        {/* Left: Main Toggle & Highlights overview */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onToggleHighlightEnabled}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer select-none",
              isHighlightEnabled
                ? `${currentTheme.bg} ${currentTheme.border} ${currentTheme.text} border shadow-[0_0_12px_rgba(251,191,36,0.15)]`
                : "bg-white/5 hover:bg-white/10 text-white/50 border border-white/10"
            )}
            title={isHighlightEnabled ? "Disable keyword highlighting" : "Enable keyword highlighting"}
          >
            <Highlighter size={13} className={isHighlightEnabled ? currentTheme.text : "text-white/40"} />
            <span>Keyword Highlighter</span>
            {isHighlightEnabled && totalMatches > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-white/15 text-[10px] font-mono font-bold">
                {totalMatches}
              </span>
            )}
          </button>

          {/* Quick Keyword Chips (Visible when enabled) */}
          {isHighlightEnabled && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {keywords.slice(0, 4).map((kw) => {
                const isActive = activeKeywords.includes(kw);
                const count = keywordStats[kw] || 0;
                return (
                  <button
                    key={kw}
                    type="button"
                    onClick={() => onToggleKeyword(kw)}
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] transition-all cursor-pointer",
                      isActive
                        ? currentTheme.badge
                        : "bg-white/5 border-white/10 text-white/40 hover:text-white/70 hover:bg-white/10"
                    )}
                    title={isActive ? `Disable highlighting for "${kw}"` : `Highlight "${kw}"`}
                  >
                    <span>{kw}</span>
                    {count > 0 && (
                      <span className="text-[10px] opacity-75 font-mono">
                        ({count})
                      </span>
                    )}
                  </button>
                );
              })}

              {keywords.length > 4 && (
                <button
                  type="button"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span>+{keywords.length - 4} more</span>
                  {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right: Actions (Color switcher, Add custom keyword, expand) */}
        <div className="flex items-center gap-1.5 ml-auto">
          {/* Color palette selector */}
          {isHighlightEnabled && (
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
              {(['amber', 'cyan', 'emerald', 'purple'] as HighlightColor[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onChangeColorVariant(c)}
                  className={cn(
                    "w-4 h-4 rounded-full transition-all cursor-pointer",
                    c === 'amber' && "bg-amber-400",
                    c === 'cyan' && "bg-cyan-400",
                    c === 'emerald' && "bg-emerald-400",
                    c === 'purple' && "bg-purple-400",
                    colorVariant === c ? "ring-2 ring-white scale-110" : "opacity-40 hover:opacity-100"
                  )}
                  title={`Use ${c} highlighter color`}
                />
              ))}
            </div>
          )}

          {/* Add custom keyword toggle */}
          {isAdding ? (
            <form onSubmit={handleAddSubmit} className="flex items-center gap-1">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="Custom term..."
                autoFocus
                className="w-28 px-2 py-1 text-[11px] bg-black/60 border border-cyan-500/40 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-cyan-400"
              />
              <button
                type="submit"
                className="p-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 cursor-pointer"
                title="Add term"
              >
                <Check size={12} />
              </button>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 cursor-pointer"
                title="Cancel"
              >
                <X size={12} />
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
              title="Add a custom word or phrase to highlight"
            >
              <Plus size={11} />
              <span>Add Term</span>
            </button>
          )}

          {/* Toggle expand panel */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
            title={isExpanded ? "Collapse keyword list" : "Expand keyword list"}
          >
            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {/* Expanded Keyword Tray */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 p-3 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl flex flex-col gap-2.5 overflow-hidden"
          >
            <div className="flex items-center justify-between text-[11px] text-white/60">
              <span className="font-semibold uppercase tracking-wider text-white/80 flex items-center gap-1.5">
                <Hash size={12} className={currentTheme.text} />
                <span>Extracted Query Keywords & Concepts ({keywords.length})</span>
              </span>
              <button
                type="button"
                onClick={onClearAll}
                className="text-white/40 hover:text-rose-300 transition-colors cursor-pointer"
              >
                Clear all highlights
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
              {keywords.map((kw) => {
                const isActive = activeKeywords.includes(kw);
                const count = keywordStats[kw] || 0;
                return (
                  <div
                    key={kw}
                    className={cn(
                      "group flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] transition-all",
                      isActive
                        ? currentTheme.badge
                        : "bg-white/5 border-white/10 text-white/40 hover:text-white/70 hover:bg-white/10"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onToggleKeyword(kw)}
                      className="cursor-pointer font-medium"
                    >
                      {kw} {count > 0 && <span className="opacity-75 font-mono text-[10px]">({count})</span>}
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveKeyword(kw)}
                      className="opacity-40 group-hover:opacity-100 hover:text-rose-400 transition-opacity cursor-pointer ml-0.5"
                      title={`Remove "${kw}" from keyword list`}
                    >
                      <X size={10} />
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
