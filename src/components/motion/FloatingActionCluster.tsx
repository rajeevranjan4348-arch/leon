import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDown, Mic, Sparkles, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMotionConfig } from './MotionProvider';

interface FloatingActionClusterProps {
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
  onScrollToBottom?: () => void;
  onTriggerVoice?: () => void;
  onOpenHelp?: () => void;
  unreadCount?: number;
  className?: string;
}

export const FloatingActionCluster: React.FC<FloatingActionClusterProps> = ({
  scrollContainerRef,
  onScrollToBottom,
  onTriggerVoice,
  onOpenHelp,
  unreadCount = 0,
  className,
}) => {
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const { reduceMotion } = useMotionConfig();

  useEffect(() => {
    const container = scrollContainerRef?.current;
    if (!container) return;

    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const { scrollTop, scrollHeight, clientHeight } = container;
          const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
          setShowScrollBottom(distanceFromBottom > 160);
          ticking = false;
        });
        ticking = true;
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [scrollContainerRef]);

  return (
    <div
      className={cn(
        'fixed right-4 bottom-24 z-30 flex flex-col items-center gap-2 pointer-events-none sm:right-6',
        className
      )}
    >
      <AnimatePresence>
        {/* Scroll to Bottom Button */}
        {showScrollBottom && (
          <motion.button
            key="scroll-bottom-btn"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8, y: 10 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={onScrollToBottom}
            className="pointer-events-auto relative p-2.5 rounded-full bg-[#1c1c24]/90 hover:bg-[#282834] text-white/90 hover:text-white border border-white/15 backdrop-blur-xl shadow-xl shadow-black/40 transition-colors cursor-pointer group flex items-center justify-center"
            title="Scroll to latest message"
            aria-label="Scroll to bottom"
          >
            <ArrowDown size={17} className="group-hover:translate-y-0.5 transition-transform" />

            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-cyan-500 text-black text-[10px] font-bold rounded-full shadow-sm animate-pulse">
                {unreadCount}
              </span>
            )}
          </motion.button>
        )}

        {/* Quick Voice Trigger (optional shortcut) */}
        {onTriggerVoice && (
          <motion.button
            key="quick-voice-btn"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8, y: 10 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25, delay: 0.05 }}
            onClick={onTriggerVoice}
            className="pointer-events-auto hidden md:flex p-2.5 rounded-full bg-[#1c1c24]/90 hover:bg-[#282834] text-white/80 hover:text-cyan-400 border border-white/15 backdrop-blur-xl shadow-xl shadow-black/40 transition-colors cursor-pointer group items-center justify-center"
            title="Start voice session (Alt+V)"
            aria-label="Voice conversation mode"
          >
            <Mic size={16} className="group-hover:scale-110 transition-transform text-white/70 group-hover:text-cyan-300" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};
