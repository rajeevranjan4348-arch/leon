import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useMotionConfig } from './MotionProvider';
import { cn } from '@/lib/utils';

export interface AccordionItemData {
  id: string;
  title: string;
  content: React.ReactNode;
  icon?: React.ReactNode;
  badge?: string;
}

interface AnimatedAccordionProps {
  items: AccordionItemData[];
  allowMultiple?: boolean;
  defaultOpenIds?: string[];
  className?: string;
}

export const AnimatedAccordion: React.FC<AnimatedAccordionProps> = ({
  items,
  allowMultiple = false,
  defaultOpenIds = [],
  className,
}) => {
  const [openIds, setOpenIds] = useState<string[]>(defaultOpenIds);
  const { reduceMotion } = useMotionConfig();

  const toggleItem = (id: string) => {
    if (allowMultiple) {
      setOpenIds((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      );
    } else {
      setOpenIds((prev) => (prev.includes(id) ? [] : [id]));
    }
  };

  return (
    <div className={cn('space-y-2.5 w-full', className)}>
      {items.map((item) => {
        const isOpen = openIds.includes(item.id);

        return (
          <div
            key={item.id}
            className="rounded-2xl bg-white/[0.04] hover:bg-white/[0.06] border border-white/10 transition-colors overflow-hidden"
          >
            <button
              type="button"
              id={`accordion-btn-${item.id}`}
              aria-expanded={isOpen}
              aria-controls={`accordion-content-${item.id}`}
              onClick={() => toggleItem(item.id)}
              className="w-full flex items-center justify-between p-4 text-left cursor-pointer select-none group"
            >
              <div className="flex items-center gap-3 pr-3 min-w-0">
                {item.icon && (
                  <span className="shrink-0 text-cyan-400 p-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                    {item.icon}
                  </span>
                )}
                <span className="text-sm font-medium text-white/90 group-hover:text-white truncate">
                  {item.title}
                </span>
                {item.badge && (
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-white/10 text-white/70 rounded-full shrink-0">
                    {item.badge}
                  </span>
                )}
              </div>

              <motion.span
                animate={reduceMotion ? {} : { rotate: isOpen ? 180 : 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="text-white/40 group-hover:text-white shrink-0"
              >
                <ChevronDown size={17} />
              </motion.span>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={`accordion-content-${item.id}`}
                  role="region"
                  aria-labelledby={`accordion-btn-${item.id}`}
                  initial={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                  animate={reduceMotion ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
                  exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                  transition={{
                    type: 'spring',
                    stiffness: 350,
                    damping: 30,
                    opacity: { duration: 0.2 },
                  }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 pt-1 text-xs text-white/70 leading-relaxed border-t border-white/5">
                    {item.content}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};
