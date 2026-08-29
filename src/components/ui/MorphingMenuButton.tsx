import React from 'react';
import { MorphIcon } from 'morphicons/react';
import { Menu, X } from 'lucide';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface MorphingMenuButtonProps {
  open: boolean;
  onToggle: () => void;
  className?: string;
  size?: number;
  strokeWidth?: number;
  label?: string;
  title?: string;
  id?: string;
  pulseWhenClosed?: boolean;
}

export const MorphingMenuButton: React.FC<MorphingMenuButtonProps> = ({
  open,
  onToggle,
  className,
  size = 18,
  strokeWidth = 2,
  label,
  title,
  id,
  pulseWhenClosed = true,
}) => {
  return (
    <motion.button
      id={id || 'morphing-menu-toggle-btn'}
      type="button"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.94 }}
      animate={
        !open && pulseWhenClosed
          ? {
              boxShadow: [
                '0 0 0 0 rgba(6, 182, 212, 0)',
                '0 0 0 4px rgba(6, 182, 212, 0.2)',
                '0 0 0 0 rgba(6, 182, 212, 0)',
              ],
              borderColor: [
                'rgba(255, 255, 255, 0.1)',
                'rgba(6, 182, 212, 0.4)',
                'rgba(255, 255, 255, 0.1)',
              ],
            }
          : {
              boxShadow: '0 0 0 0 rgba(0, 0, 0, 0)',
              borderColor: 'rgba(255, 255, 255, 0.12)',
            }
      }
      transition={
        !open && pulseWhenClosed
          ? {
              duration: 2.2,
              repeat: Infinity,
              ease: 'easeInOut',
            }
          : { duration: 0.2 }
      }
      onClick={onToggle}
      aria-expanded={open}
      aria-label={label || (open ? 'Close Menu' : 'Open Menu')}
      title={title || (open ? 'Close' : 'Menu')}
      className={cn(
        "relative p-1.5 rounded-xl border transition-all flex items-center justify-center cursor-pointer select-none text-white/80 hover:text-white",
        open
          ? "bg-white/10 text-white border-white/15"
          : "bg-white/[0.04] hover:bg-white/10",
        className
      )}
    >
      <motion.div
        className="relative flex items-center justify-center"
        animate={{
          rotate: open ? 180 : 0,
          scale: open ? [1, 0.85, 1.1, 1] : [1, 0.85, 1.05, 1],
        }}
        transition={{
          rotate: { type: "spring", stiffness: 380, damping: 20 },
          scale: { duration: 0.3, ease: "easeInOut" },
        }}
      >
        <MorphIcon
          icon={open ? X : Menu}
          size={size}
          strokeWidth={strokeWidth}
        />
        {!open && pulseWhenClosed && (
          <span className="absolute -top-1 -right-1 flex h-2 w-2 pointer-events-none">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
          </span>
        )}
      </motion.div>
      {label && <span className="ml-1.5 text-xs font-medium">{label}</span>}
    </motion.button>
  );
};

export { MorphIcon };

