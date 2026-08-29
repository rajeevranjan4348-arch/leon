import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Globe, Sparkles, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SearchModeType = 'chat' | 'search' | 'research';

interface ModeTransitionSelectorProps {
  mode: SearchModeType;
  onModeChange: (mode: SearchModeType) => void;
  compact?: boolean;
  className?: string;
  showDescription?: boolean;
}

interface ModeConfig {
  id: SearchModeType;
  label: string;
  icon: any;
  shortDescription: string;
  badge: string;
  activeColor: string;
  activeBorder: string;
  activeBg: string;
  activeText: string;
  glowColor: string;
}

const MODES: ModeConfig[] = [
  {
    id: 'chat',
    label: 'Chat',
    icon: MessageSquare,
    shortDescription: 'Instant conversational intelligence with fast reasoning',
    badge: 'Instant',
    activeColor: 'text-violet-300',
    activeBorder: 'border-violet-500/40',
    activeBg: 'bg-violet-500/15',
    activeText: 'text-violet-200',
    glowColor: 'shadow-[0_0_16px_rgba(139,92,246,0.25)]',
  },
  {
    id: 'search',
    label: 'Search',
    icon: Globe,
    shortDescription: 'Real-time web search with verified sources & citations',
    badge: 'Live Web',
    activeColor: 'text-cyan-300',
    activeBorder: 'border-cyan-500/40',
    activeBg: 'bg-cyan-500/15',
    activeText: 'text-cyan-200',
    glowColor: 'shadow-[0_0_16px_rgba(6,182,212,0.25)]',
  },
  {
    id: 'research',
    label: 'Research',
    icon: Sparkles,
    shortDescription: 'Multi-step autonomous deep research & synthesis',
    badge: 'Deep AI',
    activeColor: 'text-emerald-300',
    activeBorder: 'border-emerald-500/40',
    activeBg: 'bg-emerald-500/15',
    activeText: 'text-emerald-200',
    glowColor: 'shadow-[0_0_16px_rgba(16,185,129,0.25)]',
  },
];

export const ModeTransitionSelector: React.FC<ModeTransitionSelectorProps> = ({
  mode,
  onModeChange,
  compact = false,
  className,
  showDescription = true,
}) => {
  const activeConfig = MODES.find(m => m.id === mode) || MODES[0];

  return (
    <div className={cn('flex flex-col items-center select-none', className)}>
      {/* Mode Buttons Capsule Container */}
      <div 
        role="tablist"
        aria-label="Intelligence Search Mode"
        className={cn(
          'relative flex items-center p-1 rounded-full border border-white/10 bg-black/60 backdrop-blur-xl transition-all duration-300',
          compact ? 'gap-0.5' : 'gap-1'
        )}
      >
        {MODES.map((m) => {
          const isActive = mode === m.id;
          const Icon = m.icon;

          return (
            <motion.button
              key={m.id}
              role="tab"
              aria-selected={isActive}
              type="button"
              onClick={() => onModeChange(m.id)}
              whileHover={{ scale: isActive ? 1 : 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={cn(
                'relative flex items-center gap-1.5 font-medium transition-colors duration-200 rounded-full cursor-pointer z-10',
                compact ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-xs sm:text-sm',
                isActive ? m.activeColor : 'text-white/50 hover:text-white/80'
              )}
            >
              {/* Framer Motion Sliding Indicator */}
              {isActive && (
                <motion.div
                  layoutId="activeModePillBackground"
                  transition={{
                    type: 'spring',
                    stiffness: 450,
                    damping: 32,
                  }}
                  className={cn(
                    'absolute inset-0 rounded-full border shadow-sm z-[-1]',
                    m.activeBg,
                    m.activeBorder,
                    m.glowColor
                  )}
                />
              )}

              {/* Mode Icon with scale animation */}
              <motion.div
                animate={isActive ? { scale: [1, 1.15, 1], rotate: [0, -4, 0] } : { scale: 1, rotate: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-center justify-center shrink-0"
              >
                <Icon size={compact ? 13 : 15} strokeWidth={isActive ? 2.2 : 1.8} />
              </motion.div>

              <span>{m.label}</span>

              {/* Mode Micro Badge in Standard View */}
              {!compact && isActive && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className={cn(
                    'text-[10px] px-1.5 py-0.2 rounded-full font-mono font-normal opacity-80 border',
                    m.id === 'chat' && 'bg-violet-500/20 border-violet-400/30 text-violet-200',
                    m.id === 'search' && 'bg-cyan-500/20 border-cyan-400/30 text-cyan-200',
                    m.id === 'research' && 'bg-emerald-500/20 border-emerald-400/30 text-emerald-200'
                  )}
                >
                  {m.badge}
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Dynamic Animated Description & Visual Feedback Banner */}
      {showDescription && (
        <div className="h-5 mt-1.5 flex items-center justify-center overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 6, filter: 'blur(3px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -6, filter: 'blur(3px)' }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-1.5 text-[11px] text-white/45 tracking-tight font-normal"
            >
              {mode === 'chat' && (
                <span className="flex items-center gap-1 text-violet-300/80">
                  <Zap size={11} className="text-violet-400" />
                  <span>Instant AI Chat — Direct answers without web delay</span>
                </span>
              )}
              {mode === 'search' && (
                <span className="flex items-center gap-1 text-cyan-300/80">
                  <Globe size={11} className="text-cyan-400" />
                  <span>Web Search — Grounded with live citations & sources</span>
                </span>
              )}
              {mode === 'research' && (
                <span className="flex items-center gap-1 text-emerald-300/80">
                  <Sparkles size={11} className="text-emerald-400" />
                  <span>Deep Research — Autonomous multi-angle analysis & synthesis</span>
                </span>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
