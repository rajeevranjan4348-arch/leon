import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type CollapsibleQuestionProps = {
  text: string;
  limit?: number;
  className?: string;
  isUserBubble?: boolean;
};

export default function CollapsibleQuestion({
  text,
  limit = 35,
  className = "",
  isUserBubble = false,
}: CollapsibleQuestionProps) {
  const [expanded, setExpanded] = useState(false);

  // Normalize spaces and clean internal plugin tags, but preserve the actual question text
  const cleanText = useMemo(() => {
    return (text || "")
      .replace(/^\[PLUGIN:[^\]]+\]\s*/i, "")
      .replace(/\s+/g, " ")
      .trim();
  }, [text]);

  // Split into words
  const words = useMemo(() => {
    return cleanText ? cleanText.split(" ") : [];
  }, [cleanText]);

  const wordCount = words.length;
  const isLong = wordCount > limit;

  // Truncated preview text
  const previewText = useMemo(() => {
    if (!isLong) return cleanText;
    return words.slice(0, limit).join(" ") + "…";
  }, [cleanText, words, isLong, limit]);

  if (isUserBubble) {
    return (
      <div className={`w-full ${className}`}>
        <div className="relative">
          <div className="whitespace-pre-wrap break-words font-medium leading-relaxed">
            {expanded ? cleanText : previewText}
          </div>
        </div>

        {isLong && (
          <button
            type="button"
            className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 hover:text-cyan-300 font-semibold text-xs transition-all cursor-pointer border border-cyan-500/20"
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
          >
            <span>{expanded ? "Show less" : `Show more (${wordCount} words)`}</span>
            {expanded ? <ChevronUp size={13} className="shrink-0" /> : <ChevronDown size={13} className="shrink-0" />}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`w-full rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/10 p-4 sm:p-5 text-white shadow-lg transition-all ${className}`}>
      <div className="relative">
        <div className="text-sm sm:text-base font-normal leading-relaxed break-words [overflow-wrap:anywhere] text-slate-100">
          {expanded ? cleanText : previewText}
        </div>
      </div>

      {isLong && (
        <div className="mt-3 pt-2.5 border-t border-white/8 flex items-center justify-between">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 hover:text-cyan-100 font-medium text-xs transition-all cursor-pointer border border-cyan-500/30 active:scale-95"
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
          >
            <span>{expanded ? "Show less" : "Show full question"}</span>
            {expanded ? <ChevronUp size={13} className="shrink-0" /> : <ChevronDown size={13} className="shrink-0" />}
          </button>

          <span className="text-[11px] text-white/40 font-mono">
            {wordCount} words
          </span>
        </div>
      )}
    </div>
  );
}
