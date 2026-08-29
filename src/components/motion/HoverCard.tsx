import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { useMotionConfig } from './MotionProvider';
import { cn } from '@/lib/utils';

interface HoverCardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  lift?: boolean;
  glow?: boolean;
  scale?: number;
  className?: string;
}

export const HoverCard: React.FC<HoverCardProps> = ({
  children,
  lift = true,
  glow = true,
  scale = 1.015,
  className,
  ...props
}) => {
  const { reduceMotion, isTouchDevice } = useMotionConfig();

  if (reduceMotion || isTouchDevice) {
    return <div className={cn('relative transition-colors duration-200', className)}>{children}</div>;
  }

  return (
    <motion.div
      whileHover={{
        y: lift ? -2 : 0,
        scale: scale,
        transition: { type: 'spring', stiffness: 450, damping: 25 },
      }}
      whileTap={{ scale: 0.985 }}
      style={{ willChange: 'transform', transform: 'translateZ(0)' }}
      className={cn(
        'relative transition-all duration-200 ease-out',
        glow && 'hover:border-white/20 hover:shadow-lg hover:shadow-cyan-500/5',
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
};
