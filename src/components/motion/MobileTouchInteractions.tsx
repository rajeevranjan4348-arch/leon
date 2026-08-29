import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { useMotionConfig } from './MotionProvider';
import { cn } from '@/lib/utils';

// Mobile Touch Ripple / Scale button wrapper
interface TouchButtonProps extends HTMLMotionProps<'button'> {
  children: React.ReactNode;
  className?: string;
}

export const TouchButton: React.FC<TouchButtonProps> = ({
  children,
  className,
  ...props
}) => {
  const { reduceMotion } = useMotionConfig();

  return (
    <motion.button
      whileTap={reduceMotion ? {} : { scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={cn('touch-manipulation select-none active:opacity-90', className)}
      {...props}
    >
      {children}
    </motion.button>
  );
};

// Mobile Bottom Sheet Modal Transition
interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  children,
  className,
  title,
}) => {
  const { reduceMotion } = useMotionConfig();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-xs"
      />

      {/* Sheet */}
      <motion.div
        initial={reduceMotion ? { opacity: 0 } : { y: '100%' }}
        animate={reduceMotion ? { opacity: 1 } : { y: 0 }}
        exit={reduceMotion ? { opacity: 0 } : { y: '100%' }}
        drag="y"
        dragConstraints={{ top: 0 }}
        dragElastic={{ top: 0.05, bottom: 0.5 }}
        onDragEnd={(_e, info) => {
          if (info.offset.y > 100 || info.velocity.y > 400) {
            onClose();
          }
        }}
        transition={{
          type: 'spring',
          damping: 30,
          stiffness: 320,
        }}
        className={cn(
          'relative w-full max-h-[85vh] overflow-y-auto bg-[#14141c] border-t border-white/15 rounded-t-3xl p-5 text-white shadow-2xl z-10 overscroll-contain',
          className
        )}
      >
        {/* Drag handle */}
        <div className="w-12 h-1.5 rounded-full bg-white/20 mx-auto mb-4 shrink-0" />

        {title && <h3 className="text-base font-semibold mb-3">{title}</h3>}

        {children}
      </motion.div>
    </div>
  );
};
