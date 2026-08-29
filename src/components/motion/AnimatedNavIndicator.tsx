import React from 'react';
import { motion } from 'framer-motion';
import { useMotionConfig } from './MotionProvider';
import { cn } from '@/lib/utils';

interface AnimatedNavIndicatorProps {
  layoutId?: string;
  className?: string;
  borderRadius?: string;
}

export const AnimatedNavIndicator: React.FC<AnimatedNavIndicatorProps> = ({
  layoutId = 'nav-active-pill',
  className,
  borderRadius = 'rounded-xl',
}) => {
  const { reduceMotion } = useMotionConfig();

  if (reduceMotion) {
    return (
      <div
        className={cn(
          'absolute inset-0 bg-white/10 border border-white/10 -z-10',
          borderRadius,
          className
        )}
      />
    );
  }

  return (
    <motion.div
      layoutId={layoutId}
      transition={{
        type: 'spring',
        stiffness: 420,
        damping: 30,
        mass: 0.6,
      }}
      className={cn(
        'absolute inset-0 bg-white/10 border border-white/15 shadow-sm -z-10',
        borderRadius,
        className
      )}
    />
  );
};

interface NavItemWrapperProps {
  children: React.ReactNode;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
  id?: string;
  title?: string;
}

export const AnimatedNavItem: React.FC<NavItemWrapperProps> = ({
  children,
  isActive,
  onClick,
  className,
  id,
  title,
}) => {
  return (
    <motion.button
      id={id}
      title={title}
      onClick={onClick}
      whileHover={{ scale: 1.015, x: 2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 450, damping: 25 }}
      className={cn(
        'relative flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors duration-150 cursor-pointer select-none group',
        isActive ? 'text-white font-semibold' : 'text-white/80 hover:text-white',
        className
      )}
    >
      {isActive && <AnimatedNavIndicator />}
      {children}
    </motion.button>
  );
};
