import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { useMotionConfig } from './MotionProvider';
import { cn } from '@/lib/utils';

interface PageTransitionProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  pageKey?: string;
  className?: string;
}

export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  pageKey,
  className,
  ...props
}) => {
  const { reduceMotion } = useMotionConfig();

  if (reduceMotion) {
    return <div className={cn('flex-1 flex flex-col min-w-0 w-full h-full', className)}>{children}</div>;
  }

  return (
    <motion.div
      key={pageKey}
      initial={{ opacity: 0, y: 8, scale: 0.995 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.995 }}
      transition={{
        type: 'spring',
        stiffness: 380,
        damping: 32,
        mass: 0.7,
        opacity: { duration: 0.2, ease: 'easeOut' },
      }}
      style={{
        willChange: 'transform, opacity',
        transform: 'translateZ(0)',
      }}
      className={cn('flex-1 flex flex-col min-w-0 w-full h-full will-change-transform', className)}
      {...props}
    >
      {children}
    </motion.div>
  );
};
