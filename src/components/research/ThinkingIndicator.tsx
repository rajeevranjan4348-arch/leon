import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThinkingState } from '@/lib/memory/types';
import { getTopicAndThinkingWordsForQuery } from '@/lib/thinkingWords';
import { ChevronDown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThinkingIndicatorProps {
  state?: ThinkingState | null;
  isDone?: boolean;
  userQuery?: string;
  className?: string;
}

export const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({ 
  state, 
  isDone = false, 
  userQuery,
  className 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [statusText, setStatusText] = useState("Thinking…");

  // If thinking is completed, do not render
  if (isDone) return null;

  const topicInfo = getTopicAndThinkingWordsForQuery(userQuery);

  // Cycle thinking status text dynamically based on user question topic & actions
  useEffect(() => {
    if (isDone) {
      setStatusText("Done");
      return;
    }

    if (state?.stageMessage) {
      setStatusText(state.stageMessage);
      return;
    }

    const words = topicInfo.thinkingWords || ["Thinking…", "Searching…", "Analyzing…", "Synthesizing…"];
    let currentIndex = 0;
    setStatusText(words[0] || "Thinking…");

    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % words.length;
      setStatusText(words[currentIndex]);
    }, 2000);

    return () => clearInterval(interval);
  }, [isDone, state?.stageMessage, userQuery, topicInfo.thinkingWords]);

  const queryStr = userQuery ? JSON.stringify(userQuery) : '"userQuery"';
  const codePreviewText = `// 🛡️ ACCURACY & VERIFICATION PIPELINE
const query = ${queryStr};
const analysis = analyzeQuestionIntent(query); // [${topicInfo.topic.toUpperCase()}]
const tool = selectVerificationTool(analysis.intent);
const draft = generateWithTool(tool, query);
const verified = runAccuracyCheck(draft, { noHallucinations: true });
// Status: ${isDone ? 'VERIFIED ✓' : statusText}`;

  return (
    <div className={cn("my-2 text-sm select-none", className)}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-neutral-900/40 dark:bg-neutral-800/40 border border-neutral-700/30 text-neutral-300 dark:text-neutral-300 hover:bg-neutral-800/60 hover:text-white transition-all cursor-pointer shadow-xs group"
      >
        {/* Minimalist 3-Dot Soft Wave (Detached CSS GPU Animation Loop) */}
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 dark:bg-emerald-400 animate-thinking-dot-1" />
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 dark:bg-cyan-400 animate-thinking-dot-2" />
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-400 animate-thinking-dot-3" />
        </div>

        {/* Dynamic Status Text with Smooth Fade Transition */}
        <AnimatePresence mode="wait">
          <motion.span
            key={statusText}
            initial={{ opacity: 0, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="text-xs font-medium text-neutral-200 dark:text-neutral-100 tracking-tight antialiased"
          >
            {statusText}
          </motion.span>
        </AnimatePresence>

        <ChevronDown 
          size={13} 
          className={cn(
            "text-neutral-400 group-hover:text-neutral-200 transition-transform duration-200",
            isOpen && "rotate-180"
          )} 
        />
      </div>

      {/* Collapsible Telemetry & Pipeline Steps Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, scale: 0.98 }}
            animate={{ opacity: 1, height: 'auto', scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden mt-2 max-w-xl"
          >
            <div className="p-3.5 rounded-2xl bg-neutral-900/90 dark:bg-neutral-900/90 border border-neutral-800 text-xs font-mono text-neutral-300 shadow-xl backdrop-blur-md">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800 text-neutral-400 text-[11px]">
                <span className="flex items-center gap-1.5">
                  <Sparkles size={12} className="text-cyan-400" />
                  Telemetry Inspector
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300">
                  {topicInfo.topic}
                </span>
              </div>
              <pre className="overflow-x-auto text-[11px] leading-relaxed text-neutral-300 whitespace-pre-wrap">
                {codePreviewText}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
